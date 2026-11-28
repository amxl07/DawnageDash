// Local worktree dependency support; no runtime or resolver aliases.
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('node:fs');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
// Shared pure data contracts are consumed by mobile and the coach dashboard.
config.watchFolders = [...new Set([...config.watchFolders, path.resolve(__dirname, '../shared')])];
const modules = fs.realpathSync(path.join(__dirname, 'node_modules'));
config.resolver.useWatchman = false;
// ../shared has no node_modules of its own; EAS and CI install only mobile/.
config.resolver.nodeModulesPaths = [modules];
if (modules !== path.join(__dirname, 'node_modules')) {
  config.watchFolders = [...config.watchFolders, modules];
}
module.exports = config;
