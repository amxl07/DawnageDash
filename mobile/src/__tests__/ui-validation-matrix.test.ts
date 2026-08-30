import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const mobileRoot = path.resolve(__dirname, '../..');
const matrixPath = path.join(mobileRoot, 'docs/ui-validation-matrix.md');

const requiredRows = [
  'IOS-COMPACT',
  'IOS-NOTCH',
  'IOS-LARGE-TEXT',
  'ANDROID-COMPACT',
  'ANDROID-MID',
  'ANDROID-LARGE',
  'WIDE',
  'Loading',
  'Empty',
  'Partial',
  'Slow',
  'Offline',
  'Failed save',
  'Interrupted check-in',
  'Interrupted workout',
  'Screen reader',
  'Touch targets',
  'Focus after validation',
  'Reduced Motion',
  'Reduced Transparency',
  'Contrast',
  'Home cold render',
  'Dashboard scroll',
  'Long histories',
  'Chart visibility',
  'Photo memory',
  'Logger swipe',
  'Rest timer',
  'Sheets',
  'Android mid-range workout',
  '`progress_photos` bucket',
  'Read authorization',
  'UI disclosure',
  'URL lifetime',
] as const;

const readMatrix = () => readFileSync(matrixPath, 'utf8');

const readBuildField = (matrix: string, field: string) => {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return matrix.match(new RegExp(`^\\| ${escapedField} \\| ([^|]+) \\|$`, 'm'))?.[1].trim();
};

describe('UI release evidence contract', () => {
  it('keeps the complete release-gate row set in the validation matrix', () => {
    const matrix = readMatrix();

    for (const row of requiredRows) {
      expect(matrix).toContain(`| ${row} |`);
    }
    expect(matrix).toContain('5134434');
  });

  it('requires observed results to identify a source revision and reviewer', () => {
    const matrix = readMatrix();
    const passRows = matrix
      .split('\n')
      .filter((line) => /^\|.*\| Pass \|.*\|$/.test(line));

    if (passRows.length > 0) {
      expect(readBuildField(matrix, 'Git commit')).toMatch(/^[0-9a-f]{40}\b/);
      expect(readBuildField(matrix, 'Reviewer/date')).not.toMatch(
        /^(?:Not assigned|Not recorded|Pending)\b/i,
      );
      for (const row of passRows) {
        expect(row).not.toMatch(/(?:not run|unavailable|pending|no .*session)/i);
      }
    }

    expect(matrix).toMatch(/Release is blocked while any required row is `Not run`, `Blocked`, or `Fail`/);
  });

  it('ignores local evidence while leaving only the placeholder trackable', () => {
    const privateEvidence = spawnSync(
      'git',
      ['check-ignore', '--quiet', 'docs/ui-release-evidence/device-capture.png'],
      { cwd: mobileRoot },
    );
    const placeholder = spawnSync(
      'git',
      ['check-ignore', '--quiet', 'docs/ui-release-evidence/.gitkeep'],
      { cwd: mobileRoot },
    );

    expect(privateEvidence.status).toBe(0);
    expect(placeholder.status).toBe(1);
  });
});
