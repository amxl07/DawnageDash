import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8');

const flows = [
  '.maestro/onboarding.yaml',
  '.maestro/home-checkin.yaml',
  '.maestro/workout-interruption.yaml',
  '.maestro/progress.yaml',
] as const;

describe('Maestro release smoke contract', () => {
  it('ships the helper and all four top-level journeys for the Dawnage app id', () => {
    expect(existsSync(join(process.cwd(), '.maestro/config.yaml'))).toBe(true);
    expect(existsSync(join(process.cwd(), '.maestro/helpers/sign-in.yaml'))).toBe(true);

    for (const flow of flows) {
      expect(existsSync(join(process.cwd(), flow))).toBe(true);
      expect(read(flow)).toContain('appId: com.dawnage.app');
    }
  });

  it('requires injected E2E credentials and never supplies credential defaults', () => {
    const yaml = read('.maestro/helpers/sign-in.yaml') + read('.maestro/onboarding.yaml');

    expect(yaml).toContain('${DAWNAGE_E2E_EMAIL}');
    expect(yaml).toContain('${DAWNAGE_E2E_PASSWORD}');
    expect(yaml).toContain('${DAWNAGE_E2E_ONBOARD_EMAIL}');
    expect(yaml).toContain('${DAWNAGE_E2E_ONBOARD_PASSWORD}');
    expect(yaml).not.toMatch(/DAWNAGE_E2E_[A-Z_]+:-/);
  });

  it('uses only the approved stable ids for ambiguous interactive controls', () => {
    const selectorsBySource = {
      "app/(auth)/login.tsx": ['login-email', 'login-password'],
      "app/(app)/(tabs)/index.tsx": ['home-today-action'],
      "app/(app)/(tabs)/check-in.tsx": ['checkin-next', 'checkin-save'],
      "app/(app)/(tabs)/plans.tsx": ['plan-current-day'],
      "app/(app)/logger.tsx": ['logger-finish'],
      "app/(app)/measurements.tsx": ['measurement-add'],
      "app/(app)/media.tsx": ['photo-add-current-week'],
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
    expect(progress).toContain('Photos upload to Dawnage only after you tap Save photos.');
    expect(progress).toMatch(/Close Add measurements/);
    expect(progress).not.toContain('tapOn: "Cancel"');
  });
});
