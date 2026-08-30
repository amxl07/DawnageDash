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

const readPrivacyResult = (matrix: string, check: string) => {
  const escapedCheck = check.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return matrix.match(
    new RegExp(`^\\| ${escapedCheck} \\| [^|]+ \\| (Pass|Fail|Blocked|Not run) \\|`, 'm'),
  )?.[1];
};

const validateObservedResultMetadata = (matrix: string) => {
  const errors: string[] = [];
  const passRows = matrix
    .split('\n')
    .filter((line) => /^\|.*\| Pass \|.*\|$/.test(line));

  if (passRows.length === 0) return errors;

  if (!/^[0-9a-f]{40}\b/.test(readBuildField(matrix, 'Git commit') ?? '')) {
    errors.push('Git commit must identify the immutable source revision');
  }
  const expoBuild = readBuildField(matrix, 'Expo build') ?? '';
  const hasImmutableBuildIdentifier = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,}$/.test(
    expoBuild,
  );
  const isPlaceholderBuild = /^(?:not(?: available| recorded)?|pending|blocked|blank|none|n\/a|tbd|unknown|[-—])(?:\b|\s|$)/i.test(
    expoBuild,
  );
  if (!hasImmutableBuildIdentifier || isPlaceholderBuild) {
    errors.push('Expo build must identify the immutable app binary');
  }
  const reviewer = readBuildField(matrix, 'Reviewer/date') ?? '';
  if (!reviewer || /^(?:Not assigned|Not recorded|Pending)\b/i.test(reviewer)) {
    errors.push('Reviewer/date must identify the person who observed the result');
  }
  for (const row of passRows) {
    if (/(?:not run|unavailable|pending|no .*session)/i.test(row)) {
      errors.push('Pass evidence cannot describe an unavailable or pending observation');
    }
  }

  return errors;
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
    expect(validateObservedResultMetadata(matrix)).toEqual([]);

    expect(matrix).toMatch(/Release is blocked while any required row is `Not run`, `Blocked`, or `Fail`/);
  });

  it('rejects a Pass when the matrix still has no immutable Expo build identifier', () => {
    const matrix = readMatrix();
    const falsePass = matrix.replace(
      '| Blocked | No immutable build or iOS device session; compact layout',
      '| Pass | Observed compact layout on the recorded build',
    ).replace(' and keyboard checks remain pending', '');

    expect(falsePass).not.toBe(matrix);
    expect(validateObservedResultMetadata(falsePass)).toContain(
      'Expo build must identify the immutable app binary',
    );

    const observedPass = falsePass
      .replace(
        '| Expo build | Not available — no immutable development or preview build was produced for this matrix |',
        '| Expo build | preview-20260830.1 |',
      )
      .replace(
        '| Reviewer/date | Not assigned / 2026-08-30 — runtime review pending |',
        '| Reviewer/date | Release QA / 2026-08-30 |',
      );
    expect(validateObservedResultMetadata(observedPass)).toEqual([]);
  });

  it('ignores local evidence while leaving only the placeholder trackable', () => {
    const privateEvidencePaths = [
      'docs/ui-release-evidence/ios/home-light.png',
      'docs/ui-release-evidence/android/logger.mp4',
      'docs/ui-release-evidence/profiles/workout.ettrace',
      'docs/ui-release-evidence/profiles/cpu-profile.json',
      'docs/ui-release-evidence/metadata/findings.json',
      'docs/ui-release-evidence/.device-metadata',
    ];
    const placeholder = spawnSync(
      'git',
      ['check-ignore', '--quiet', 'docs/ui-release-evidence/.gitkeep'],
      { cwd: mobileRoot },
    );
    const trackedPlaceholder = spawnSync(
      'git',
      ['ls-files', '--error-unmatch', 'docs/ui-release-evidence/.gitkeep'],
      { cwd: mobileRoot },
    );

    for (const evidencePath of privateEvidencePaths) {
      const result = spawnSync('git', ['check-ignore', '--quiet', evidencePath], {
        cwd: mobileRoot,
      });
      expect(result.status).toBe(0);
    }
    expect(placeholder.status).toBe(1);
    expect(trackedPlaceholder.status).toBe(0);
  });

  it('records the source-proven photo privacy failures without inventing runtime evidence', () => {
    const matrix = readMatrix();

    expect(readPrivacyResult(matrix, '`progress_photos` bucket')).toBe('Fail');
    expect(readPrivacyResult(matrix, 'Read authorization')).toBe('Blocked');
    expect(readPrivacyResult(matrix, 'UI disclosure')).toBe('Blocked');
    expect(readPrivacyResult(matrix, 'URL lifetime')).toBe('Fail');
    expect(matrix).toContain('Progress-photo feature decision: **Blocked**');
    expect(matrix).toContain('Mobile release decision: **Blocked**');
    expect(matrix).toContain('separate approved security remediation');
    expect(matrix).toContain('No live Supabase query or cross-account runtime check was performed');
  });

  it('keeps privacy evidence sanitized', () => {
    const matrix = readMatrix();

    expect(matrix).not.toMatch(/https?:\/\//i);
    expect(matrix).not.toMatch(/supabase\.co/i);
    expect(matrix).not.toMatch(/\/storage\/v1\/object\//i);
    expect(matrix).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });
});
