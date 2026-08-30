import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const requireFromPackage = createRequire(join(process.cwd(), 'package.json'));
const { parseAllDocuments } = requireFromPackage(
  join(process.cwd(), 'node_modules/yaml/dist/index.js'),
) as typeof import('yaml');

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8');

const flows = [
  '.maestro/onboarding.yaml',
  '.maestro/home-checkin.yaml',
  '.maestro/workout-interruption.yaml',
  '.maestro/progress.yaml',
] as const;

const yamlFiles = [
  '.maestro/config.yaml',
  '.maestro/helpers/sign-in.yaml',
  ...flows,
] as const;

const parseYaml = (relativePath: string): unknown[] =>
  parseAllDocuments(read(relativePath)).map((document) => {
    expect(document.errors).toEqual([]);
    return document.toJS();
  });

describe('Maestro release smoke contract', () => {
  it('ships the helper and all four top-level journeys for the Dawnage app id', () => {
    expect(existsSync(join(process.cwd(), '.maestro/config.yaml'))).toBe(true);
    expect(existsSync(join(process.cwd(), '.maestro/helpers/sign-in.yaml'))).toBe(true);

    for (const flow of flows) {
      expect(existsSync(join(process.cwd(), flow))).toBe(true);
      const [config, commands] = parseYaml(flow);
      expect(config).toMatchObject({ appId: 'com.dawnage.app' });
      expect(Array.isArray(commands)).toBe(true);
      expect((commands as unknown[]).length).toBeGreaterThan(0);
    }

    const [helperConfig, helperCommands] = parseYaml('.maestro/helpers/sign-in.yaml');
    expect(helperConfig).toMatchObject({ appId: 'com.dawnage.app' });
    expect(Array.isArray(helperCommands)).toBe(true);
    expect(parseYaml('.maestro/config.yaml')).toEqual([{ flows: ['*.yaml'] }]);
    expect(yamlFiles).toHaveLength(6);
  });

  it('requires injected E2E credentials and never supplies credential defaults', () => {
    const yaml = read('.maestro/helpers/sign-in.yaml') + read('.maestro/onboarding.yaml');

    expect(yaml).toContain('${DAWNAGE_E2E_EMAIL}');
    expect(yaml).toContain('${DAWNAGE_E2E_PASSWORD}');
    expect(yaml).toContain('${DAWNAGE_E2E_ONBOARD_EMAIL}');
    expect(yaml).toContain('${DAWNAGE_E2E_ONBOARD_PASSWORD}');
    expect(yaml).not.toMatch(/DAWNAGE_E2E_[A-Z_]+:-/);
    expect(
      (JSON.parse(read('package.json')) as { devDependencies?: Record<string, string> })
        .devDependencies?.yaml,
    ).toBeDefined();
  });

  it('ships the approved stable ids for ambiguous interactive controls', () => {
    const selectorsBySource = {
      "app/(auth)/login.tsx": ['login-email', 'login-password'],
      "app/(app)/(tabs)/index.tsx": ['home-today-action'],
      "app/(app)/(tabs)/check-in.tsx": ['checkin-next', 'checkin-save'],
      "app/(app)/(tabs)/plans.tsx": ['plan-current-day'],
      "app/(app)/logger.tsx": ['logger-finish'],
      "app/(app)/measurements.tsx": ['measurement-add'],
      "app/(app)/media.tsx": ['photo-add-current-week'],
      'src/components/checkin/CheckInForm.tsx': [
        'checkin-energy-rating',
        'checkin-stress-rating',
      ],
    } as const;

    for (const [source, selectors] of Object.entries(selectorsBySource)) {
      const contents = read(source);
      for (const selector of selectors) expect(contents).toContain(selector);
    }

    expect(read('app/(auth)/login.tsx')).toMatch(
      /\) : \(\s*<>\s*<Input\s+testID="login-email"\s+label="Email"/,
    );
  });

  it('covers final-copy onboarding, interruption recovery, and no-upload disclosure', () => {
    const onboarding = read('.maestro/onboarding.yaml');
    const checkIn = read('.maestro/home-checkin.yaml');
    const workout = read('.maestro/workout-interruption.yaml');
    const progress = read('.maestro/progress.yaml');

    expect(onboarding).toContain('Build muscle');
    expect(onboarding).toContain('Your weekly rhythm');
    expect(onboarding).toContain('Your timezone');
    expect(checkIn).toContain('stopApp');
    expect(checkIn).toContain('Sleep and recovery');
    expect(workout).toContain('pressKey: Home');
    expect(workout).toMatch(/launchApp:\s+stopApp: false/);
    expect(workout).not.toContain('backgroundApp');
    expect(workout).toContain('stopApp');
    const [, signInCommands] = parseYaml('.maestro/helpers/sign-in.yaml') as [
      Record<string, unknown>,
      { extendedWaitUntil?: { visible?: string } }[],
    ];
    const [, checkInCommands] = parseYaml('.maestro/home-checkin.yaml') as [
      Record<string, unknown>,
      Record<string, unknown>[],
    ];
    const [, workoutCommands] = parseYaml('.maestro/workout-interruption.yaml') as [
      Record<string, unknown>,
      Record<string, unknown>[],
    ];
    const [, progressCommands] = parseYaml('.maestro/progress.yaml') as [
      Record<string, unknown>,
      Record<string, unknown>[],
    ];

    expect(signInCommands).toContainEqual({
      extendedWaitUntil: { visible: 'Home, your dashboard', timeout: 20000 },
    });
    expect(JSON.stringify(checkInCommands)).toContain('Check in for today');
    expect(JSON.stringify(checkInCommands)).toContain('Home, your dashboard');
    expect(checkInCommands).toContainEqual({ tapOn: { id: 'checkin-energy-rating-5' } });
    expect(checkInCommands).toContainEqual({ tapOn: { id: 'checkin-stress-rating-5' } });
    expect(JSON.stringify(workoutCommands)).toContain('Your training and nutrition plans');
    expect(JSON.stringify(progressCommands)).toContain('More options');
    expect(progress).toContain("^Photos upload to Dawnage only after you tap Save photos\\..*");
    expect(progress).toMatch(/Close Add measurements/);
    expect(progress).not.toContain('tapOn: "Cancel"');
    expect(workout).toContain('"Mark set 1 complete"');
    expect(workout).toContain('"Mark set 1 incomplete"');
    expect(workout).not.toContain('warm-up|set');
  });
});
