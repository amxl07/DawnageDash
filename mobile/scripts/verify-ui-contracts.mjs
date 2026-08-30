import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const MOBILE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOTS = ['app', 'src'];
const TYPESCRIPT_SOURCE = /\.(?:ts|tsx)$/;
const HARD_CODED_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const SKIA_PACKAGE = '@shopify/react-native-skia';

function comparePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPortablePath(value) {
  return value.split(path.sep).join('/');
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function isJestFixture(root, file) {
  const relative = path.relative(root, file);
  const segments = relative.split(path.sep);
  const basename = segments.at(-1) ?? '';

  return (
    /\.(?:test|spec)\.(?:ts|tsx)$/.test(basename) ||
    segments.includes('__tests__') ||
    (segments[0] === 'src' && segments[1] === 'test')
  );
}

function collectTypeScriptFiles(directory) {
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

function resolveSourceFiles(root) {
  const files = [];
  const failures = [];

  for (const sourceRoot of SOURCE_ROOTS) {
    const sourcePath = path.join(root, sourceRoot);
    let sourceStats;

    try {
      sourceStats = fs.lstatSync(sourcePath);
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }

    if (sourceStats.isSymbolicLink() || !sourceStats.isDirectory()) {
      failures.push(
        `${sourceRoot}: source root must be a real directory within the scan root`,
      );
      continue;
    }

    const realSourcePath = fs.realpathSync(sourcePath);
    if (!isWithin(root, realSourcePath)) {
      failures.push(
        `${sourceRoot}: source root must be a real directory within the scan root`,
      );
      continue;
    }

    files.push(...collectTypeScriptFiles(realSourcePath));
  }

  return {
    failures,
    files: files
      .filter((file) => !isJestFixture(root, file))
      .sort(comparePaths),
  };
}

function isSkiaModule(value) {
  return value === SKIA_PACKAGE || value.startsWith(`${SKIA_PACKAGE}/`);
}

function moduleText(node) {
  return node && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function containsSkiaImport(sourceFile) {
  let found = false;

  function visit(node) {
    if (found) return;

    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const value = moduleText(node.moduleSpecifier);
      if (value !== undefined && isSkiaModule(value)) found = true;
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const value = moduleText(node.moduleReference.expression);
      if (value !== undefined && isSkiaModule(value)) found = true;
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === 'require';
      const value = moduleText(node.arguments[0]);
      if ((isDynamicImport || isRequire) && value !== undefined && isSkiaModule(value)) {
        found = true;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function literalContainsColor(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return HARD_CODED_COLOR.test(node.text);
  }

  if (ts.isTemplateExpression(node)) {
    return (
      HARD_CODED_COLOR.test(node.head.text) ||
      node.templateSpans.some((span) => HARD_CODED_COLOR.test(span.literal.text))
    );
  }

  return false;
}

function containsHardCodedColor(sourceFile) {
  let found = false;

  function visit(node) {
    if (found) return;
    if (literalContainsColor(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function parseNumericText(value) {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function staticNumericValue(expression) {
  if (ts.isParenthesizedExpression(expression)) {
    return staticNumericValue(expression.expression);
  }

  if (ts.isNumericLiteral(expression)) return Number(expression.text);

  if (ts.isStringLiteralLike(expression)) return parseNumericText(expression.text);

  if (
    ts.isPrefixUnaryExpression(expression) &&
    (expression.operator === ts.SyntaxKind.PlusToken ||
      expression.operator === ts.SyntaxKind.MinusToken)
  ) {
    const operand = staticNumericValue(expression.operand);
    if (operand === undefined) return undefined;
    return expression.operator === ts.SyntaxKind.MinusToken ? -operand : operand;
  }

  return undefined;
}

function blurViewIntensities(sourceFile) {
  const intensities = [];

  function visit(node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === 'BlurView'
    ) {
      const intensity = node.attributes.properties.find(
        (property) =>
          ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'intensity',
      );

      if (intensity && ts.isJsxAttribute(intensity) && intensity.initializer) {
        let value;
        if (ts.isStringLiteral(intensity.initializer)) {
          value = parseNumericText(intensity.initializer.text);
        } else if (
          ts.isJsxExpression(intensity.initializer) &&
          intensity.initializer.expression
        ) {
          value = staticNumericValue(intensity.initializer.expression);
        }

        if (value !== undefined) intensities.push(value);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return intensities;
}

function createSourceFile(file, source) {
  const scriptKind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
}

export function scanUiContracts(scanRoot = MOBILE_ROOT) {
  const requestedRoot = path.resolve(scanRoot);
  let root;

  try {
    const rootStats = fs.statSync(requestedRoot);
    if (!rootStats.isDirectory()) {
      return {
        failures: [`${requestedRoot}: scan root must be a directory`],
        files: [],
      };
    }
    root = fs.realpathSync(requestedRoot);
  } catch (error) {
    return {
      failures: [
        `${requestedRoot}: scan root is unavailable (${error?.code ?? 'unknown error'})`,
      ],
      files: [],
    };
  }

  const allowedColorFiles = new Set([
    path.resolve(root, 'src/theme/colors.ts'),
    path.resolve(root, 'src/theme/tokens.ts'),
  ]);
  const resolved = resolveSourceFiles(root);
  const failures = [...resolved.failures];

  if (resolved.files.length === 0) {
    failures.push('No production TypeScript files found under app or src');
  }

  for (const file of resolved.files) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = toPortablePath(path.relative(root, file));
    const sourceFile = createSourceFile(file, source);
    const parseDiagnostics = sourceFile.parseDiagnostics ?? [];

    if (parseDiagnostics.length > 0) {
      const message = ts.flattenDiagnosticMessageText(
        parseDiagnostics[0].messageText,
        ' ',
      );
      failures.push(`${relative}: TypeScript parse error: ${message}`);
      continue;
    }

    if (containsSkiaImport(sourceFile)) {
      failures.push(`${relative}: Skia is outside the approved architecture`);
    }

    if (!allowedColorFiles.has(path.resolve(file)) && containsHardCodedColor(sourceFile)) {
      failures.push(`${relative}: move hard-coded colors into semantic theme tokens`);
    }

    for (const intensity of blurViewIntensities(sourceFile)) {
      if (intensity > 20) {
        failures.push(
          `${relative}: BlurView intensity ${intensity} exceeds the cap of 20`,
        );
      }
    }
  }

  return { failures, files: resolved.files };
}

function parseRootArgument(args) {
  if (args.length === 0) return MOBILE_ROOT;
  if (args.length === 2 && args[0] === '--root' && args[1].trim() !== '') {
    return path.resolve(process.cwd(), args[1]);
  }
  throw new Error('Usage: verify-ui-contracts.mjs [--root <directory>]');
}

function run(args) {
  let root;
  try {
    root = parseRootArgument(args);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const { failures, files } = scanUiContracts(root);

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

if (isExecutedDirectly) run(process.argv.slice(2));
