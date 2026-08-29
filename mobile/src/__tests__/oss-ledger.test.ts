import fs from 'node:fs';
import path from 'node:path';

const ledger = fs.readFileSync(
  path.resolve(__dirname, '../../docs/oss-ui-pattern-ledger.md'),
  'utf8',
);

const requiredReferences = [
  'FitnessApp',
  'Flexify',
  'Kenko',
  'LiftLog',
  'PerfectGymCoach',
  'SwiftLift',
  'demos / reactiive',
  'fitness_workout_app_flutter_3_ui',
  'liftosaur',
  'skulpt',
];

describe('open-source UI pattern ledger', () => {
  it.each(requiredReferences)('records %s', (name) => {
    expect(ledger).toContain(`| ${name} |`);
  });

  it('states the independent-implementation boundary', () => {
    expect(ledger).toContain('independent implementation');
    expect(ledger).toContain('No source or assets copied');
  });
});
