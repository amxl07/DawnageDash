import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_ROOT = join(__dirname, '../../app');
const TEST_MODULE = /\.(?:test|spec)\.[jt]sx?$/;

function findTestModules(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return findTestModules(absolute);
    return TEST_MODULE.test(entry.name) ? [relative(APP_ROOT, absolute)] : [];
  });
}

describe('Expo Router route boundary', () => {
  it('keeps Jest test modules outside app', () => {
    expect(findTestModules(APP_ROOT).sort()).toEqual([]);
  });
});
