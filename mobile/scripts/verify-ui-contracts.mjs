import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_ROOTS = ['app', 'src'];
const TYPESCRIPT_SOURCE = /\.(?:ts|tsx)$/;
const HARD_CODED_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const SKIA_IMPORT =
  /(?:\bfrom\s+|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]@shopify\/react-native-skia(?:\/[^'"]*)?['"]/;
const BLUR_INTENSITY =
  /<BlurView\b[^>]*?\bintensity\s*=\s*(?:\{\s*(\d+(?:\.\d+)?)\s*\}|['"](\d+(?:\.\d+)?)['"])/g;

function comparePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPortablePath(value) {
  return value.split(path.sep).join('/');
}

function isJestFixture(root, file) {
  const relative = path.relative(root, file);
  const segments = relative.split(path.sep);
  const basename = segments.at(-1) ?? '';

  return (
    /\.test\.(?:ts|tsx)$/.test(basename) ||
    segments.includes('__tests__') ||
    (segments[0] === 'src' && segments[1] === 'test')
  );
}

function collectTypeScriptFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => comparePaths(left.name, right.name))
    .flatMap((entry) => {
      if (entry.isSymbolicLink()) return [];

      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectTypeScriptFiles(target);
      return entry.isFile() && TYPESCRIPT_SOURCE.test(entry.name) ? [target] : [];
    });
}

export function scanUiContracts(scanRoot = process.cwd()) {
  const root = path.resolve(scanRoot);
  const allowedColorFiles = new Set([
    path.resolve(root, 'src/theme/colors.ts'),
    path.resolve(root, 'src/theme/tokens.ts'),
  ]);
  const files = SOURCE_ROOTS.flatMap((sourceRoot) =>
    collectTypeScriptFiles(path.resolve(root, sourceRoot)),
  )
    .filter((file) => !isJestFixture(root, file))
    .sort(comparePaths);
  const failures = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = toPortablePath(path.relative(root, file));

    if (SKIA_IMPORT.test(source)) {
      failures.push(`${relative}: Skia is outside the approved architecture`);
    }

    if (!allowedColorFiles.has(path.resolve(file)) && HARD_CODED_COLOR.test(source)) {
      failures.push(`${relative}: move hard-coded colors into semantic theme tokens`);
    }

    for (const match of source.matchAll(BLUR_INTENSITY)) {
      const rawIntensity = match[1] ?? match[2];
      if (Number(rawIntensity) > 20) {
        failures.push(
          `${relative}: BlurView intensity ${rawIntensity} exceeds the cap of 20`,
        );
      }
    }
  }

  return { failures, files };
}

function run() {
  const { failures, files } = scanUiContracts();

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
    return;
  }

  console.log(`UI contracts passed for ${files.length} source files.`);
}

const isExecutedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isExecutedDirectly) run();
