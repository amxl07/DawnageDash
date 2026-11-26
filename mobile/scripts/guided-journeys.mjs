/** Real UI journeys. All writes are intercepted by capture-redesign.mjs. */
import assert from 'node:assert/strict';
import { createJourneyDriver } from './journey-driver.mjs';

export async function exerciseGuidedJourney({ screen, call, sessionId, checkpoint, writes }) {
  const ui = createJourneyDriver(call, sessionId);
  const checks = [];
  const record = (description) => checks.push(description);
  const next = () => ui.click({ id: 'checkin-next' });

  if (screen === 'home') {
    await ui.expectText('72.4 kg');
    const recap = await ui.evaluate(`(() => {
      const cards = [...document.querySelectorAll('[data-testid="home-weekly-recap"]')];
      const lines = value => (value || '').split(/\\r?\\n/).map(line => line.trim()).filter(Boolean);
      return {
        count: cards.length,
        oldCardCount: document.querySelectorAll('[data-testid="home-progress-summary"]').length,
        lines: lines(cards[0]?.innerText),
        pageLines: lines(document.body.innerText),
      };
    })()`);
    assert.equal(recap.count, 1, 'Home must render one weekly recap');
    assert.equal(recap.oldCardCount, 0, 'The previous weight card must not duplicate the recap');
    for (const expected of ['14 Sep–15 Sep 2026', 'Morning weight', '72.4 kg', 'Check-in · Sep 14, 2026',
      '1 weigh-in this week.', 'No synced workouts this week.', 'View progress']) {
      assert.ok(recap.lines.includes(expected), `Weekly recap must show ${expected}`);
    }
    assert.equal(recap.pageLines.filter(line => line === '1 of 2 days saved').length, 1, 'Only elapsed reporting days count toward consistency');
    assert.equal(recap.pageLines.filter(line => line === '72.4 kg').length, 1, 'Morning weight must appear once before opening details');
    assert.equal(recap.lines.some(line => /kg (across|since)/.test(line)), false, 'One in-week observation must not imply a weight change');
    record('Home shows one recap for 14–15 Sep 2026, one saved day, and 72.4 kg dated 14 Sep without inventing a weekly change.');

    await ui.click({ css: '[data-testid="home-weekly-recap"] [role="button"][aria-label="View progress"]' });
    await ui.waitFor('the progress destination', async () => ui.evaluate('location.pathname === "/measurements"'));
    await ui.expectText('Measurements');
    await checkpoint('progress');
    await ui.click({ label: 'Go back' });
    await ui.waitFor('return to Home', async () => ui.evaluate('location.pathname === "/"'));
    await ui.expectText('14 Sep–15 Sep 2026');
    await checkpoint('recap');
    assert.equal(writes.length, 0, 'Viewing progress must not create or change a record');
    record('The recap opens Measurements directly and returns to Home without writing a record.');
  }

  if (screen === 'checkin') {
    await ui.expectText('Morning weight');
    await ui.expectText('0 of 15 answered');
    await ui.expectAbsent('Optional weight');
    const checkInSnapshot = () => ui.evaluate(`(() => {
      const form = document.querySelector('[data-testid="checkin-flow-handoff"]');
      return {
        fields: [...(form?.querySelectorAll('input, textarea, [role="radio"]') || [])].map(node => ({
          label: node.getAttribute('aria-label'), value: node.value ?? null,
          checked: node.getAttribute('aria-checked'),
        })),
        stored: Object.keys(localStorage).filter(key => key.includes('check-in-')).sort().map(key => [key, localStorage.getItem(key)]),
      };
    })()`);
    const beforeHealth = await checkInSnapshot();
    assert.ok(beforeHealth.fields.some(field => field.label === 'Morning weight'), 'Health cancellation checks must snapshot the actual check-in input');
    const writesBeforeHealth = writes.length;
    await ui.click({ label: 'Import from health app' });
    await ui.expectText('Review health data');
    await ui.expectText('shared with your coach when you submit');
    await ui.expectText('Dawnage does not write to your health apps.');
    await checkpoint('health-intro');
    await ui.click({ label: 'Choose access and read this day' });
    await ui.expectText('Health import is unavailable in this version of Dawnage. Continue entering values manually.');
    assert.equal(await ui.evaluate(`document.querySelectorAll('[role="checkbox"]').length`), 0, 'An unavailable health provider must not invent import choices');
    await checkpoint('health-unavailable');
    await ui.click({ label: 'Cancel health import' });
    await ui.waitFor('health review dismissal', async () => !(await ui.text()).includes('Review health data'));
    assert.deepEqual(await checkInSnapshot(), beforeHealth, 'Opening, reading unavailable health data and cancelling must preserve form answers and local check-in storage');
    assert.equal(writes.length, writesBeforeHealth, 'Health review must not submit or change a server record');
    record('Health review explains selection and coach sharing, shows the web unavailable state, and cancels without changing answers, drafts or submissions.');
    await next();
    await ui.expectText('Enter your morning weight.');
    await ui.waitFor('focus on required morning weight', async () => ui.evaluate('document.activeElement?.getAttribute("aria-label") === "Morning weight"'));
    assert.equal(writes.length, 0, 'An incomplete Morning step must not submit');
    record('Continue requires weight and focuses its visible input.');

    await ui.fill({ label: 'Morning weight' }, '72.6');
    await ui.pressEnter();
    await ui.waitFor('Done commits weight and dismisses its focus', async () => await ui.evaluate('document.activeElement?.getAttribute("aria-label") !== "Morning weight"'));
    await ui.expectAbsent('Enter your morning weight.');
    await ui.fill({ label: 'Sleep' }, '7.');
    await ui.click({ label: '8 h' });
    await ui.expectValue({ label: 'Sleep' }, '8');
    await ui.click({ id: 'checkin-energy-rating-6' });
    for (const [rating, selected] of [['energy', 6]]) {
      await ui.waitFor(`${rating} has exactly one selected rating: ${selected}`, async () => ui.evaluate(`(() => {
        const choices = [...document.querySelectorAll('[data-testid="checkin-${rating}-rating"] [role="radio"]')];
        const checked = choices.filter(node => node.getAttribute('aria-checked') === 'true');
        return choices.length === 10 && checked.length === 1 && checked[0].getAttribute('data-testid') === 'checkin-${rating}-rating-${selected}';
      })()`));
    }
    await ui.expectText('3 of 15 answered');
    record('Morning groups weight, sleep and energy; the counter reports three answers and the sleep quick choice replaces partially typed input.');
    await ui.expectValue({ label: 'Morning weight' }, '72.6');
    await ui.expectAbsent('Recent range 72.4–72.8 kg');
    await ui.click({ label: 'Recent history for Morning weight' });
    await ui.expectText('Recent range 72.4–72.8 kg');
    await checkpoint('history');
    await ui.click({ label: 'Recent history for Morning weight' });
    await ui.expectAbsent('Recent range 72.4–72.8 kg');
    record('Historical ranges expand on request and hide without changing the answer.');
    await checkpoint('morning');
    await next();

    await ui.expectText('Your day');
    await ui.click({ id: 'checkin-stress-rating-4' });
    await ui.waitFor('stress rating 4 is selected', async () => ui.evaluate(`document.querySelector('[data-testid="checkin-stress-rating-4"]')?.getAttribute('aria-checked') === 'true'`));
    await ui.click({ id: 'checkin-hunger-rating-6' });
    await ui.click({ label: 'Normal' });
    await ui.expectText('6 of 15 answered');
    await checkpoint('your-day');
    record('Your day groups stress, hunger and digestion; Normal counts as an answered digestion question.');
    await next();

    for (const label of ['Calories', 'Water', 'Steps', 'Protein', 'Carbs', 'Fats']) {
      await ui.expectValue({ label }, '');
    }
    await ui.click({ label: 'Cardio' });
    await ui.expectText('7 of 16 answered');
    await ui.expectText('How did it go?');
    await ui.click({ label: 'Rest' });
    await ui.expectText('7 of 15 answered');
    await ui.expectAbsent('How did it go?');
    record('The answer denominator includes workout performance for Cardio and removes it for Rest.');
    await ui.click({ id: 'checkin-nutrition-rating-8' });
    await next();
    await ui.expectText('Enter your calories.');
    await ui.waitFor('required measurements retain step three', async () => ui.evaluate('Boolean(document.querySelector(\'[role="progressbar"][aria-label="Check-in step 3 of 4"]\'))'));
    assert.equal(writes.length, 0, 'Missing measurements must not submit');
    record('All nutrition measurements are visible and required before review.');

    await ui.fill({ label: 'Calories' }, '2200');
    await ui.fill({ label: 'Water' }, 'invalid');
    await next();
    await ui.expectText('Enter a number or clear this field.');
    await ui.waitFor('invalid measurements retain step three', async () => ui.evaluate('Boolean(document.querySelector(\'[role="progressbar"][aria-label="Check-in step 3 of 4"]\'))'));
    await ui.expectValue({ label: 'Water' }, 'invalid');
    await ui.expectAbsent('Retry saving');
    await ui.expectAbsent('Discard draft');
    await ui.pressEnter();
    assert.equal(await ui.evaluate('document.activeElement?.getAttribute("aria-label")'), 'Water');
    assert.equal(writes.length, 0, 'An invalid number must not submit');
    await ui.fill({ label: 'Water' }, '2.25');
    await ui.pressEnter();
    await ui.waitFor('Next focuses Steps', async () => await ui.evaluate('document.activeElement?.getAttribute("aria-label")') === 'Steps');
    await ui.expectAbsent('Enter a valid number in the highlighted field.');
    await ui.fill({ label: 'Steps' }, '8200');
    await ui.pressEnter();
    await ui.waitFor('Next focuses Protein', async () => await ui.evaluate('document.activeElement?.getAttribute("aria-label")') === 'Protein');
    await ui.fill({ label: 'Protein' }, '140');
    await ui.fill({ label: 'Carbs' }, '260');
    await ui.fill({ label: 'Fats' }, '60');
    await checkpoint('measurements');
    await next();
    await ui.expectText('72.6 kg');
    await ui.expectText('2200 kcal');
    await ui.expectText('2.25 L');
    await ui.expectText('140 g');
    await ui.expectText('260 g');
    await ui.expectText('60 g');
    await ui.expectAbsent('Not recorded');
    record('Invalid numeric text stays editable; every corrected measurement reaches review.');
    record('Enter commits before focusing the next field; invalid entry keeps focus and never offers discard.');

    await ui.click({ id: 'checkin-save' });
    await ui.expectText('Add your notes.');
    assert.equal(writes.length, 0, 'Blank notes must block final submission');
    await checkpoint('required-notes');
    await ui.fill({ label: 'Notes' }, 'Good recovery on a rest day.');
    await ui.expectText('15 of 15 answered');
    await checkpoint('review');
    record('Review requires notes before a record can be submitted.');

    await ui.click({ id: 'checkin-edit-readiness' });
    await ui.click({ id: 'checkin-energy-rating-7' });
    await ui.expectValue({ label: 'Sleep' }, '8');
    await next();
    await ui.expectText('Your day');
    await next();
    await ui.expectValue({ label: 'Calories' }, '2200');
    await ui.expectValue({ label: 'Fats' }, '60');
    await next();
    await ui.expectValue({ label: 'Notes' }, 'Good recovery on a rest day.');
    await ui.click({ id: 'checkin-save' });
    await ui.waitFor('the intercepted check-in submission', async () => writes.some((write) => write.table === 'daily_check_ins'));
    const write = writes.filter((entry) => entry.table === 'daily_check_ins').at(-1);
    const payload = Array.isArray(write.payload) ? write.payload[0] : write.payload;
    for (const [key, value] of Object.entries({ date: '2026-09-15', morning_weight: 72.6, energy_level: 7, stress_level: 4, sleep_hours: 8, hunger_level: 6, digestion: 'none', workout_status: 'rest_day', workout_performance: null, nutrition_score: 8, calorie_intake: 2200, water_liters: 2.25, daily_steps: 8200, protein: 140, carbs: 260, fats: 60, notes: 'Good recovery on a rest day.' })) {
      assert.equal(payload[key], value, `Saved ${key}`);
    }
    record('Review edits preserve measurements and notes; submission contains every required answer.');
    await ui.expectText('Check-in saved');
    await checkpoint('saved');
  }

  if (screen === 'health-access') {
    await ui.expectText('Your health data, your choice');
    await ui.expectText('Dawnage does not write to your health apps.');
    await ui.expectText('Change or remove access');
    const publicRoute = await ui.evaluate('({ path: location.pathname, token: localStorage.getItem("sb-preview-auth-token") })');
    assert.equal(publicRoute.path, '/health-access', 'Permission rationale must stay on its public route');
    assert.equal(publicRoute.token, null, 'The rationale capture must remain signed out');
    await ui.expectAbsent('Sign in');
    assert.equal(writes.length, 0, 'Reading health-access guidance must not write a record');
    await checkpoint('signed-out');
    record('The public health-access rationale is available without an auth token and explains read-only access, review, coach sharing and revocation.');
  }

  if (screen === 'workout') {
    await ui.expectAbsent('Finish workout');
    await ui.expectAbsent('Add an exercise');
    const weight = { css: '[data-testid="current-set-editor"] input[aria-label$="weight in kilograms"]' };
    const reps = { css: '[data-testid="current-set-editor"] input[aria-label$="repetitions"]' };
    const firstCompletedSet = { css: '[role="button"][aria-label^="Edit warm-up 1:"], [role="button"][aria-label^="Edit set 1:"]' };
    assert.equal(await ui.evaluate(`document.querySelectorAll('[role="button"][aria-label^="Edit warm-up "], [role="button"][aria-label^="Edit set "]').length`), 3, 'All three prescribed sets must be present without a disclosure action');
    await ui.fill(weight, '40');
    await ui.fill(reps, '8');
    await ui.click({ id: 'complete-current-set' });
    await ui.click({css:'[role="button"][aria-label^="Undo completed "]'});
    await ui.expectValue(weight, '40');
    await ui.expectValue(reps, '8');
    assert.equal(await ui.evaluate(`document.querySelectorAll('[role="button"][aria-label^="Edit warm-up "], [role="button"][aria-label^="Edit set "]').length`), 3, 'Undo must preserve the set list');
    await ui.click({ id: 'complete-current-set' });
    record('Undo completion restores the chosen set with its entered weight and repetitions; completing it again preserves the set list.');
    await ui.expectValue(weight, '');
    await ui.expectValue(reps, '');
    await ui.waitFor('compatible history suggestions', async () => ui.evaluate(`(() => {
      const editor = document.querySelector('[data-testid="current-set-editor"]');
      return editor?.querySelector('input[aria-label$="weight in kilograms"]')?.placeholder === '50'
        && editor?.querySelector('input[aria-label$="repetitions"]')?.placeholder === '8';
    })()`));
    assert.equal(await ui.evaluate(`Boolean(document.querySelector('[data-testid="current-weight-entry"] [aria-label="Keep set 2 weight blank for bodyweight"]'))`), true, 'The bodyweight choice must be beside the suggested load');
    await ui.expectAbsent('Leave blank for bodyweight.');
    await checkpoint('history-suggestion');
    const increaseWeight = { css: '[data-testid="current-set-editor"] [role="button"][aria-label^="Increase "][aria-label$="weight by 2.5 kilograms"]' };
    const decreaseWeight = { css: '[data-testid="current-set-editor"] [role="button"][aria-label^="Decrease "][aria-label$="weight by 2.5 kilograms"]' };
    await ui.click(increaseWeight);
    await ui.expectValue(weight, '52.5');
    await ui.click(decreaseWeight);
    await ui.expectValue(weight, '50');
    await ui.fill(weight, '62.25');
    await ui.click(increaseWeight);
    await ui.expectValue(weight, '64.75');
    await ui.click(decreaseWeight);
    await ui.expectValue(weight, '62.25');
    await ui.click({ id: 'complete-current-set' });
    await ui.waitFor('typed weight preserved on completion', async () => ui.evaluate(`Boolean(document.querySelector('[aria-label="Edit set 2: 62.25 kg × 8 reps, completed"]'))`));
    await ui.expectValue(weight, '');
    await ui.expectValue(reps, '');
    await ui.click({ id: 'complete-current-set' });
    await ui.waitFor('one-tap suggestion completion', async () => ui.evaluate(`Boolean(document.querySelector('[aria-label="Edit set 3: 50 kg × 8 reps, completed"]'))`));
    record('Sets are visible immediately; steppers begin from suggestions, preserve decimal precision, and one-tap completion fills only untouched fields.');
    // Follow the rendered editor so warm-up sets and working sets use the
    // same completion path without assuming how a plan counts them.
    let completed = 3;
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

    await ui.click(firstCompletedSet);
    await ui.expectValue(weight, '40');
    await ui.fill(weight, '42.5');
    await ui.click({ text: 'Back to exercise summary' });
    await ui.click(firstCompletedSet);
    await ui.expectValue(weight, '42.5');
    await ui.click({ text: 'Back to exercise summary' });
    await ui.click({ id: 'workout-continue' });
    await ui.expectText('Seated cable row');
    await checkpoint('next-exercise');
    record('A completed set remains editable; Continue selects the next unfinished exercise.');

    await ui.click({ id: 'workout-overview' });
    await ui.fill({ id: 'workout-exercise-name' }, 'GoB');
    await ui.click({ label: 'Add Goblet squat from suggestions' });
    await ui.expectText('Goblet squat');
    await ui.click({ id: 'workout-overview' });
    await ui.fill({ id: 'workout-exercise-name' }, 'Cable curl');
    await ui.expectText('No matches · add a custom exercise.');
    await ui.click({ id: 'workout-add-exercise' });
    await ui.expectText('Cable curl');
    await ui.click({ id: 'workout-overview' });
    await checkpoint('overview');
    await ui.click({ id: 'logger-finish' });
    await ui.expectText('Review workout');
    await checkpoint('review');
    assert.equal(writes.length, 0, 'Review must not submit the partial workout');
    await ui.click({ text: 'Return to editing' });
    await ui.expectText('Cable curl');
    record('Overview filters plan names case-insensitively, adds a suggested or custom exercise, and opens partial-workout review without saving or losing entries.');
    await ui.click({id:'workout-overview'});
    await ui.click({id:'logger-finish'});
    await ui.expectText('Incomplete sets');
    await ui.click({id:'confirm-save-workout'});
    await ui.waitFor('partial workout acknowledgment', async () => (await ui.text()).includes('Workout saved') && (await ui.text()).includes('Done'));
    const workoutWrites = writes.filter(write => write.table === 'workout_logs');
    assert.equal(workoutWrites.length, 1, 'Partial workout confirmation must send one record');
    const payload = Array.isArray(workoutWrites[0].payload) ? workoutWrites[0].payload[0] : workoutWrites[0].payload;
    assert.equal(payload.date, '2026-09-15');
    const content = typeof payload.content === 'string' ? JSON.parse(payload.content) : payload.content;
    assert.equal(content.version, 2);
    assert.ok(content.exercises.some(exercise => exercise.name === 'Bench press' && exercise.sets.some(set => set.completed && String(set.weight) === '42.5')), 'Saved workout must retain the edited completed set');
    assert.ok(content.exercises.some(exercise => exercise.sets.some(set => !set.completed)), 'Saved partial workout must retain unfinished sets');
    await ui.expectText('Incomplete sets');
    await checkpoint('partial-saved');
    record('Explicit confirmation saves one partial workout, preserving edited completed values and unfinished sets, with a receipt and incomplete warning.');
  }
  if (screen === 'nutrition') {
    await ui.expectAbsent('Greek yoghurt, oats');
    await ui.expectText('Planned meals 2000 kcal');
    await ui.expectText('2200');
    await ui.expectText('kcal / day');
    await ui.expectText('200 kcal below daily target');
    await ui.expectAbsent('Listed protein');
    await ui.expectAbsent('Your daily target is prescribed separately');
    await ui.click({ label: 'Nutrition details' });
    await ui.expectText('Listed protein');
    await ui.expectText('Confirm this difference with your coach.');
    await ui.click({ label: 'Nutrition details' });
    await ui.expectAbsent('Listed protein');
    await ui.expectText('200 kcal below daily target');
    await ui.click({ label: 'Breakfast, 550 kcal' });
    await ui.expectText('Greek yoghurt, oats');
    await ui.expectText('Protein 35 g');
    await checkpoint('meal-details');
    await ui.click({ label: 'Lunch, 750 kcal' });
    await ui.expectText('Lentils, brown rice');
    await ui.expectText('Greek yoghurt, oats');
    await ui.click({ label: 'Breakfast, 550 kcal' });
    await ui.expectAbsent('Greek yoghurt, oats');
    await ui.expectText('Lentils, brown rice');
    await ui.expectText('Planned meals 2000 kcal');
    await ui.expectText('200 kcal below daily target');
    record('Meal details expand independently; the prescribed daily target, planned-meals total and mismatch remain visible, while protein and explanations use a separate disclosure.');
    assert.equal(writes.length, 0, 'Reading a meal plan must not record intake');
  }
  if (screen === 'measurements-chart') {
    const selectedIndex = () => ui.evaluate(`document.querySelector('[aria-label="Selected recorded date"]').getAttribute('aria-valuenow')`);
    assert.equal(await selectedIndex(), '3');
    await ui.click({ label: '1M' });
    await ui.click({ label: 'All' });
    await ui.click({ label: 'Metric: Waist' });
    await ui.click({ label: 'Chest' });
    await ui.click({ label: 'Compare measurements' });
    await ui.click({ label: 'Hips' });
    await ui.click({ label: 'Previous date' });
    assert.equal(await selectedIndex(), '2');
    await ui.expectText('99 cm');
    await ui.expectText('Hips: Not reported');
    await checkpoint('selected-date');
    await ui.click({ label: 'All values' });
    await ui.expectText('Chest: 100 cm');
    await checkpoint('chronological-values');
    record('Previous date selects an actual observation; missing measurements remain unreported.');
    record('The chronological values list exposes recorded values with dates and units.');
    await ui.click({ label: 'Compare: Hips' });
    await ui.click({ label: 'No comparison' });
    await ui.expectAbsent('Hips: Not reported');
    record('The default single metric supports calendar ranges and an optional comparison that can be removed.');
    assert.equal(writes.length, 0, 'Chart exploration must not write health data');
  }
  return checks;
}
