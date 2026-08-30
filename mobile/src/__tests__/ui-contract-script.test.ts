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

function runVerifier(root: string, cwd = mobileRoot) {
  return spawnSync(process.execPath, [verifierPath, '--root', root], {
    cwd,
    encoding: 'utf8',
  });
}

function runDefaultVerifier(cwd: string) {
  return spawnSync(process.execPath, [verifierPath], { cwd, encoding: 'utf8' });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('UI contract verifier', () => {
  it('anchors default scans to mobile even when launched from the repository root', () => {
    const fromMobile = runDefaultVerifier(mobileRoot);
    const fromRepository = runDefaultVerifier(path.resolve(mobileRoot, '..'));

    expect(fromMobile.status).toBe(0);
    expect(fromRepository.status).toBe(0);
    expect(fromRepository.stdout).toBe(fromMobile.stdout);
    const fileCount = Number(fromRepository.stdout.match(/(\d+) source files/)?.[1]);
    expect(fileCount).toBeGreaterThan(0);
  });

  it('rejects every supported Skia module-loading form including comments and subpaths', () => {
    const root = createFixtureRoot();
    writeFixture(
      root,
      'app/StaticImport.ts',
      "import { Canvas } /* split */ from /* split */ '@shopify/react-native-skia/core';\n",
    );
    writeFixture(
      root,
      'app/ExportFrom.ts',
      "export { Canvas } from '@shopify/react-native-skia';\n",
    );
    writeFixture(
      root,
      'app/ImportEquals.ts',
      "import Skia = require('@shopify/react-native-skia/lib/commonjs');\n",
    );
    writeFixture(
      root,
      'app/DynamicImport.ts',
      "export const skia = import(/* split */ '@shopify/react-native-skia');\n",
    );
    writeFixture(
      root,
      'app/Require.ts',
      "export const skia = require(/* split */ '@shopify/react-native-skia/renderer');\n",
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    for (const file of [
      'StaticImport.ts',
      'ExportFrom.ts',
      'ImportEquals.ts',
      'DynamicImport.ts',
      'Require.ts',
    ]) {
      expect(result.stderr).toContain(
        `app/${file}: Skia is outside the approved architecture`,
      );
    }
  });

  it('rejects color literals and all static BlurView intensity forms above 20', () => {
    const root = createFixtureRoot();
    writeFixture(root, 'app/ColorScreen.tsx', "export const accent = '#123abc';\n");
    writeFixture(
      root,
      'app/TemplateColor.ts',
      'export const accent = `#abcdef`;\n',
    );
    writeFixture(
      root,
      'src/components/BlurNumber.tsx',
      'export const panel = <BlurView intensity={(/* split */ 2.1e1)} />;\n',
    );
    writeFixture(
      root,
      'src/components/BlurString.tsx',
      'export const panel = <BlurView intensity="21.5" />;\n',
    );
    writeFixture(
      root,
      'src/components/BlurExpressionString.tsx',
      "export const panel = <BlurView intensity={'22'} />;\n",
    );
    writeFixture(root, 'src/theme/not-colors.ts', "export const rogue = '#fff';\n");

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'app/ColorScreen.tsx: move hard-coded colors into semantic theme tokens',
    );
    expect(result.stderr).toContain(
      'app/TemplateColor.ts: move hard-coded colors into semantic theme tokens',
    );
    expect(result.stderr).toContain(
      'src/components/BlurNumber.tsx: BlurView intensity 21 exceeds the cap of 20',
    );
    expect(result.stderr).toContain(
      'src/components/BlurString.tsx: BlurView intensity 21.5 exceeds the cap of 20',
    );
    expect(result.stderr).toContain(
      'src/components/BlurExpressionString.tsx: BlurView intensity 22 exceeds the cap of 20',
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
    writeFixture(root, 'app/route.spec.tsx', "export const color = '#f00';\n");
    writeFixture(root, 'app/__tests__/route.tsx', '<BlurView intensity={99} />;\n');
    writeFixture(
      root,
      'src/widgets/Widget.test.ts',
      "import '@shopify/react-native-skia';\n",
    );
    writeFixture(root, 'src/test/setup.ts', "export const color = '#0f0';\n");
    writeFixture(
      root,
      'src/comments.tsx',
      [
        "// import '@shopify/react-native-skia';",
        "// '#ff00ff'",
        '// <BlurView intensity={99} />',
        "export const packageName = '@shopify/react-native-skia';",
        'export const screen = null;',
        '',
      ].join('\n'),
    );

    const result = runVerifier(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('UI contracts passed for 4 source files.\n');
  });

  it('tolerates one missing source root and does not follow nested source symlinks', () => {
    const root = createFixtureRoot();
    const externalRoot = createFixtureRoot();
    writeFixture(root, 'app/index.tsx', 'export const screen = null;\n');
    writeFixture(externalRoot, 'external.tsx', "export const color = '#bad';\n");
    writeFixture(externalRoot, 'directory/external.tsx', "export const color = '#bad';\n");
    symlinkSync(
      path.join(externalRoot, 'external.tsx'),
      path.join(root, 'app/external.tsx'),
    );
    symlinkSync(
      path.join(externalRoot, 'directory'),
      path.join(root, 'app/external-directory'),
      'dir',
    );

    const result = runVerifier(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('UI contracts passed for 1 source files.\n');
  });

  it('rejects a symlinked top-level source root and an empty scan', () => {
    const symlinkRoot = createFixtureRoot();
    const externalRoot = createFixtureRoot();
    const emptyRoot = createFixtureRoot();
    writeFixture(externalRoot, 'app/index.tsx', 'export const screen = null;\n');
    writeFixture(symlinkRoot, 'src/index.ts', 'export const source = null;\n');
    symlinkSync(
      path.join(externalRoot, 'app'),
      path.join(symlinkRoot, 'app'),
      'dir',
    );

    const symlinkResult = runVerifier(symlinkRoot);
    const emptyResult = runVerifier(emptyRoot);

    expect(symlinkResult.status).toBe(1);
    expect(symlinkResult.stderr).toContain(
      'app: source root must be a real directory within the scan root',
    );
    expect(emptyResult.status).toBe(1);
    expect(emptyResult.stderr).toContain(
      'No production TypeScript files found under app or src',
    );
  });

  it('fails closed when TypeScript syntax cannot be parsed', () => {
    const root = createFixtureRoot();
    writeFixture(
      root,
      'app/broken.tsx',
      'export const screen = <BlurView intensity={25};\n',
    );

    const result = runVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app/broken.tsx: TypeScript parse error:');
  });
});
