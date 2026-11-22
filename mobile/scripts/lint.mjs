import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { ESLint } from 'eslint';

const mobileRoot = fileURLToPath(new URL('../', import.meta.url));
const { values, positionals } = parseArgs({
  options: { compiler: { type: 'boolean' }, fix: { type: 'boolean' } },
  allowPositionals: true,
});

// The import plugin checks path casing up to process.cwd(). Shared imports
// live beside mobile; use their common root so it never scans unrelated
// parent directories. ESLint itself retains mobile's config and file scope.
process.chdir(fileURLToPath(new URL('../../', import.meta.url)));
const eslint = new ESLint({
  cwd: mobileRoot,
  overrideConfigFile: fileURLToPath(new URL(
    values.compiler ? '../eslint.compiler.config.js' : '../eslint.config.js',
    import.meta.url,
  )),
  fix: values.fix ?? false,
});
const results = await eslint.lintFiles(positionals.length ? positionals : ['.']);
if (values.fix) await ESLint.outputFixes(results);
const formatter = await eslint.loadFormatter('stylish');
const output = formatter.format(results);
if (output) process.stdout.write(output);
process.exitCode = results.some(({ errorCount }) => errorCount > 0) ? 1 : 0;
