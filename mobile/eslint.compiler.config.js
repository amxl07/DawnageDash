const expoConfig = require('eslint-config-expo/flat');
const projectConfig = require('./eslint.config');

module.exports = [
  ...projectConfig,
  {
    rules: Object.fromEntries(
      expoConfig.flatMap(({ rules = {} }) => Object.entries(rules))
        .filter(([rule]) => rule.startsWith('react-hooks/')),
    ),
  },
];
