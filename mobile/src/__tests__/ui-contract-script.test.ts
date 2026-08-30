import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const mobileRoot = path.resolve(__dirname, '../..');
const verifierPath = path.join(mobileRoot, 'scripts/verify-ui-contracts.mjs');
const temporaryDirectories: string[] = [];

function createFixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'dawnage-ui-contracts-'));
  temporaryDirectories.push(root);
  return root;
}

function writeFixture(root: string, relativePath: string, source: string) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, source);
}

function runVerifier(cwd: string) {
  return spawnSync(process.execPath, [verifierPath], {
    cwd,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('UI contract verifier', () => {
  it('accepts the checked-in app source', () => {
    const result = runVerifier(mobileRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^UI contracts passed for \d+ source files\.\n$/);
  });

  it('rejects Skia imports, production color literals, and BlurView intensity above 20', () => {
    const root = createFixtureRoot();
    writeFixture(
      root,
      'app/SkiaScreen.tsx',
      "import { Canvas } from '@shopify/react-native-skia';\nexport const screen = Canvas;\n",
    );
    writeFixture(root, 'app/ColorScreen.tsx', "export const accent = '#123abc';\n");
    writeFixture(
      root,
      'src/components/BlurPanel.tsx',
      'export const panel = <BlurView intensity={20.5} />;\n',
    );
    writeFixture(root, 'src/theme/not-colors.ts', "export const rogue = '#fff';\n");

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'app/SkiaScreen.tsx: Skia is outside the approved architecture',
    );
    expect(result.stderr).toContain(
      'app/ColorScreen.tsx: move hard-coded colors into semantic theme tokens',
    );
    expect(result.stderr).toContain(
      'src/components/BlurPanel.tsx: BlurView intensity 20.5 exceeds the cap of 20',
    );
    expect(result.stderr).toContain(
      'src/theme/not-colors.ts: move hard-coded colors into semantic theme tokens',
    );
  });

  it('allows color literals only in theme sources and ignores Jest-only fixtures', () => {
    const root = createFixtureRoot();
    writeFixture(root, 'app/index.tsx', 'export const screen = null;\n');
    writeFixture(root, 'src/theme/colors.ts', "export const background = '#ffffff';\n");
    writeFixture(root, 'src/theme/tokens.ts', "export const shadow = '#000000';\n");
    writeFixture(root, 'app/route.test.tsx', "export const color = '#f00';\n");
    writeFixture(root, 'app/__tests__/route.tsx', '<BlurView intensity={99} />;\n');
    writeFixture(
      root,
      'src/widgets/Widget.test.ts',
      "import '@shopify/react-native-skia';\n",
    );
    writeFixture(root, 'src/test/setup.ts', "export const color = '#0f0';\n");

    const result = runVerifier(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('UI contracts passed for 3 source files.\n');
  });

  it('tolerates a missing source root and does not follow source symlinks', () => {
    const root = createFixtureRoot();
    const externalRoot = createFixtureRoot();
    writeFixture(root, 'app/index.tsx', 'export const screen = null;\n');
    writeFixture(externalRoot, 'external.tsx', "export const color = '#bad';\n");
    symlinkSync(
      path.join(externalRoot, 'external.tsx'),
      path.join(root, 'app/external.tsx'),
    );

    const result = runVerifier(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('UI contracts passed for 1 source files.\n');
  });
});
