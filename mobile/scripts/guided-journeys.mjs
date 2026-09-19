/** Real UI journeys. All writes are intercepted by capture-redesign.mjs. */
import assert from 'node:assert/strict';
import { createJourneyDriver } from './journey-driver.mjs';

export async function exerciseGuidedJourney({ screen, call, sessionId, checkpoint, writes }) {
  const ui = createJourneyDriver(call, sessionId);
  const checks = [];
  const record = (description) => checks.push(description);
  const next = () => ui.click({ id: 'checkin-next' });

  if (screen === 'checkin') {
    await ui.expectAbsent('Morning weight');
    await ui.expectAbsent('Calories');
    await next();
    await ui.expectText('Energy');
    await next();
    await ui.waitFor('keyboard focus on the unanswered Energy field', async () => ui.evaluate('Boolean(document.activeElement?.closest(\'[data-testid="checkin-field-energy"]\'))'));
    assert.equal(writes.length, 0, 'Invalid Continue must not submit a check-in');
    record('Continue keeps an incomplete section open without submitting.');

    await ui.click({ id: 'checkin-energy-rating-5' });
    await ui.click({ id: 'checkin-stress-rating-4' });
    await ui.click({ id: 'checkin-optional-weight' });
    await ui.fill({ label: 'Morning weight' }, '72.6');
    await ui.click({ id: 'checkin-optional-weight' });
    await ui.click({ id: 'checkin-optional-weight' });
    await ui.expectValue({ label: 'Morning weight' }, '72.6');
    record('Optional weight commits before collapse and survives reopening.');
    await next();

    await ui.expectText('Sleep');
    await ui.fill({ label: 'Sleep' }, '7.');
    await ui.click({ label: '8 h' });
    await ui.expectValue({ label: 'Sleep' }, '8');
    await ui.click({ id: 'checkin-hunger-rating-6' });
    await ui.click({ label: 'Normal' });
    await checkpoint('recovery');
    record('Sleep quick choice replaces partially typed input.');
    await next();

    await ui.click({ label: 'Rest' });
    await ui.click({ id: 'checkin-nutrition-rating-8' });
    await ui.expectAbsent('Calories');
    await checkpoint('adherence');
    await ui.click({ id: 'checkin-optional-details' });
    await ui.fill({ label: 'Water' }, 'invalid');
    await ui.click({ id: 'checkin-optional-details' });
    await ui.expectValue({ label: 'Water' }, 'invalid');
    await ui.expectText('Enter a number or clear this field.');
    const hasStickyActions = await ui.evaluate('Boolean(document.querySelector(\'[data-testid="sticky-action-bar"]\'))');
    await next();
    // Inline actions can blur the field before the press completes. Its local
    // error restores focus; either layout must keep the invalid value in this step.
    if (hasStickyActions) await ui.expectText('Correct the highlighted number or clear it before continuing.');
    await ui.expectText('Step 3 of 4');
    await ui.expectText('Enter a number or clear this field.');
    await ui.expectValue({ label: 'Water' }, 'invalid');
    assert.equal(writes.length, 0, 'An invalid number must not submit the check-in');
    await ui.fill({ label: 'Water' }, '2.25');
    await ui.fill({ label: 'Steps' }, '8200');
    await next();
    await ui.expectText('72.6 kg');
    await ui.expectText('2.25 L');
    await ui.expectText('Normal');
    await ui.expectAbsent('rest_day');
    await ui.expectAbsent('Not recorded');
    await ui.expectAbsent('Correct the highlighted number or clear it before continuing.');
    await checkpoint('review');
    record('Invalid numeric text blocks collapse; corrected values reach concise, readable review.');

    await ui.click({ id: 'checkin-edit-readiness' });
    await ui.click({ id: 'checkin-energy-rating-7' });
    await next();
    await ui.expectValue({ label: 'Sleep' }, '8');
    await next();
    await next();
    await ui.click({ id: 'checkin-save' });
    await ui.waitFor('the intercepted check-in submission', async () => writes.some((write) => write.table === 'daily_check_ins'));
    const write = writes.filter((entry) => entry.table === 'daily_check_ins').at(-1);
    const payload = Array.isArray(write.payload) ? write.payload[0] : write.payload;
    for (const [key, value] of Object.entries({ date: '2026-09-15', morning_weight: 72.6, energy_level: 7, stress_level: 4, sleep_hours: 8, hunger_level: 6, digestion: 'none', workout_status: 'rest_day', workout_performance: null, nutrition_score: 8, water_liters: 2.25, daily_steps: 8200 })) {
      assert.equal(payload[key], value, `Saved ${key}`);
    }
    record('Review editing preserves the other sections and final submission sends the expected date and values.');
    await ui.expectText('Saved and synced');
    await checkpoint('saved');
  }

  if (screen === 'workout') {
    await ui.expectAbsent('Finish workout');
    await ui.expectAbsent('Add an exercise');
    const weight = { css: '[data-testid="current-set-editor"] input[aria-label$="weight in kilograms"]' };
    const reps = { css: '[data-testid="current-set-editor"] input[aria-label$="repetitions"]' };
    const firstCompletedSet = { css: '[role="button"][aria-label^="Edit warm-up 1:"], [role="button"][aria-label^="Edit set 1:"]' };
    // Follow the rendered editor so warm-up sets and working sets use the
    // same completion path without assuming how a plan counts them.
    let completed = 0;
    while (await ui.evaluate('Boolean(document.querySelector(\'[data-testid="complete-current-set"]\'))')) {
      assert.ok(completed < 6, 'The first exercise must eventually complete');
      await ui.fill(weight, 40 + completed * 5);
      await ui.fill(reps, 8);
      await ui.click({ id: 'complete-current-set' });
      completed += 1;
    }
    await ui.expectText('Exercise complete');
    await checkpoint('exercise-complete');
    assert.equal(writes.length, 0, 'Completing an exercise must not save the workout');
    record(`${completed} sets advance to exercise completion without submitting the session.`);

    await ui.click({ id: 'workout-sets-toggle' });
    await ui.click(firstCompletedSet);
    await ui.expectValue(weight, '40');
    await ui.fill(weight, '42.5');
    await ui.click({ text: 'Back to exercise summary' });
    await ui.click({ id: 'workout-sets-toggle' });
    await ui.click(firstCompletedSet);
    await ui.expectValue(weight, '42.5');
    await ui.click({ text: 'Back to exercise summary' });
    await ui.click({ id: 'workout-continue' });
    await ui.expectText('Seated cable row');
    await checkpoint('next-exercise');
    record('A completed set remains editable; Continue selects the next unfinished exercise.');

    await ui.click({ id: 'workout-overview' });
    await ui.fill({ id: 'workout-exercise-name' }, 'Cable curl');
    await ui.click({ id: 'workout-add-exercise' });
    await ui.expectText('Cable curl');
    await ui.click({ id: 'workout-overview' });
    await checkpoint('overview');
    await ui.click({ id: 'logger-finish' });
    await ui.expectText('Review your workout');
    await checkpoint('review');
    assert.equal(writes.length, 0, 'Review must not submit the partial workout');
    await ui.click({ text: 'Return to editing' });
    await ui.expectText('Cable curl');
    record('Overview adds an exercise and opens partial-workout review without saving or losing entries.');
  }
  return checks;
}
