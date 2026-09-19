const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const { expo } = require('./app.json');

// SDK 57 adds React Compiler diagnostics to Expo's recommended lint rules.
// Preserve the pre-upgrade Hooks checks while the compiler is disabled.
// Enabling experiments.reactCompiler also enables its checks in normal lint.
// Run `npm run lint:compiler` to audit adoption before changing that setting.
const compilerDisabledRules = Object.fromEntries(
  expoConfig
    .flatMap(({ rules = {} }) => Object.keys(rules))
    .filter((rule) => rule.startsWith('react-hooks/') &&
      rule !== 'react-hooks/rules-of-hooks' && rule !== 'react-hooks/exhaustive-deps')
    .map((rule) => [rule, 'off']),
);

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', '.expo/**', 'figma-dawnage-design-system/**'],
  },
  {
    settings: {
      // The lint process runs at the repository root for shared imports.
      // Resolve @/ aliases from this app's tsconfig regardless of that cwd.
      'import/resolver': { typescript: { project: require.resolve('./tsconfig.json') } },
    },
  },
  ...(expo.experiments?.reactCompiler ? [] : [{ rules: compilerDisabledRules }]),
]);
