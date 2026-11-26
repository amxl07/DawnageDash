# Revised assessment question mapping

Implementation decision within the approved Phase 2 content scope. Preserve the original catalog from `/tmp/dawnage-cleanup-2026-10-03/baseline/mobile/src/lib/questionnaire-data.ts` exactly for historical definitions. Short input labels below do not rename saved keys. New meanings use the explicit v2 IDs below.

| Stable section | Short title | Active question IDs, in order |
|---|---|---|
|basic_details|About you|q1, q2, q3, q4, q5, q6, q7|
|body_measurements|Measurements|q8, q9, q10, q11, q12, q13|
|goals|Goals|q14, q15, v2_goal_history, v2_goal_support, v2_goal_reason|
|lifestyle|Your routine|q28, q29, v2_routine_changes, q33, q34|
|training_history|Training|q35, v2_weight_change, v2_weight_history, q43, q45|
|nutrition_history|Eating habits|q46, v2_diet_history, q50, q51, q52, v2_usual_meals, v2_eating_challenges|
|health_medical|Health|q56, q57, q58, q59, q61, q62, q63, q64, q65, q66, v2_supplement_preferences, q68|
|daily_activity|Daily activity|q69, q70, q71|
|sleep_recovery|Sleep|q72, q73, q75|
|stress_gut|Wellbeing & digestion|v2_stress_routine, v2_digestion, q82, q83, q84, q85, q86, q87|

This is 61 maximum active questions, with 12 conditional follow-ups; the no-follow-up path has 49. All fields remain optional except the original q1/q2/q3/q4/q7/q14. Known saved Profile facts reduce retyping. Body measurements remain optional intake values.

## New questions and conditions

All textarea prompts are optional. Radio prompts use Yes / No.

| New ID | Input | Prompt | Show when |
|---|---|---|---|
|v2_goal_history|textarea|What have you tried, and what helped or got in the way?|q15 = Yes|
|v2_goal_support|textarea|What support would help you now?|Always|
|v2_goal_reason|textarea|Why does this goal matter to you?|Always|
|v2_routine_changes|textarea|What changes feel realistic, and what might make them difficult?|Always|
|v2_weight_change|radio|Have you intentionally changed your weight before?|Always|
|v2_weight_history|textarea|When was it, how much did your weight change, and over how long?|v2_weight_change = Yes|
|v2_diet_history|textarea|What plan did you follow, when, and for how long?|q46 = Yes|
|v2_usual_meals|textarea|What do you usually eat and drink in a day?|Always|
|v2_eating_challenges|textarea|What makes eating as planned difficult?|Always|
|v2_supplement_preferences|textarea|Any preferences or concerns about supplements?|Always|
|v2_stress_routine|textarea|Does stress affect your routine? Share anything you would like us to plan around.|Always|
|v2_digestion|radio|Do digestion symptoms affect your eating or training?|Always|

Existing conditional questions: q29 after q28 = Yes; q59 after q58 = Yes; q66 after q65 = Yes; q82–q87 after v2_digestion = Yes. Hidden answers remain recoverable and are classified as earlier/hidden in summaries, not presented as current facts. New parents remain unanswered on old records.

## Copy / meaning decisions

- q1 Name; q2 Age; q3 Height (cm); q4 Weight (kg); q5 City and country; q6 Occupation; q7 WhatsApp number. Known phone is a reviewable suggestion, not an assumption that it is WhatsApp-verified.
- Keep q14 fitness goal, q56 current injury, q64 allergy and q33 workout-day meanings and option values stable for Profile sync.
- q28 asks whether the user drinks alcohol; q29 asks frequency/quantity, retaining its original meaning.
- q35 gym experience; q43 past exercise types; q45 current routine. Previous attempts are described once in Goals; the conditional weight-history prompt collects only timing/amount/timeframe.
- q51 numeric anchors: 0 = No experience; 10 = Very experienced. q73: 0 = Tired on waking; 5 = Well rested. q82–q86: 1 = Rare or absent; 5 = Severe or frequent. Preserve original ranges and historical descriptions; render compact anchors with numeric controls.
- Keep useful medical, surgery, medication, allergy, activity and sleep information. Optional preferences and realistic changes replace judgmental wording.
- The q8 intake control keeps cm units but omits the ambiguous distance. Historical definition remains unchanged; the exact waist protocol is an unresolved content dependency, not an invented distance.

## Retired active IDs (preserve saved values and original labels)

q16–q27, q30–q32, q36–q42, q44, q47–q49, q53–q55, q60, q67, q74, q76–q81.

Consumer mapping for q77–q81 found only question definitions/readback and test fixtures; there is no downstream fitness calculation depending on those keys. The focused optional stress question plus current medical constraints/eating difficulties replace the broad cravings/anxiety/agitation/illness/life-stress prompts. Historical data remains available.
