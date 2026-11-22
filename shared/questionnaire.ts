import { inputCopy } from './questionnaire-input-copy';
import { questionnaireSections as originalSections, type Question, type Section } from './questionnaire-legacy';
export type { Question, Section } from './questionnaire-legacy';
export type Answers = Record<string, unknown>;
export const legacyQuestionnaireSections = originalSections;
const original = Object.fromEntries(originalSections.flatMap(s => s.questions).map(q => [q.id, q]));
const textarea = (id: string, text: string): Question => ({ id, text, type: 'textarea' });
const radio = (id: string, text: string): Question => ({ id, text, type: 'radio', options: ['Yes', 'No'] });
const added = [
  textarea('v2_goal_history', 'What have you tried, and what helped or got in the way?'),
  textarea('v2_goal_support', 'What support would help you now?'),
  textarea('v2_goal_reason', 'Why does this goal matter to you?'),
  textarea('v2_routine_changes', 'What changes feel realistic, and what might make them difficult?'),
  radio('v2_weight_change', 'Have you intentionally changed your weight before?'),
  textarea('v2_weight_history', 'When was it, how much did your weight change, and over how long?'),
  textarea('v2_diet_history', 'What plan did you follow, when, and for how long?'),
  textarea('v2_usual_meals', 'What do you usually eat and drink in a day?'),
  textarea('v2_eating_challenges', 'What makes eating as planned difficult?'),
  textarea('v2_supplement_preferences', 'Any preferences or concerns about supplements?'),
  textarea('v2_stress_routine', 'Does stress affect your routine? Share anything you would like us to plan around.'),
  radio('v2_digestion', 'Do digestion symptoms affect your eating or training?'),
];
/** Immutable IDs resolve historical wording, regardless of the last writer version. */
export const questionsById: Record<string, Question> = { ...original, ...Object.fromEntries(added.map(q => [q.id, q])) };
const selection = [
 ['About you', 'q1 q2 q3 q4 q5 q6 q7'],
 ['Measurements', 'q8 q9 q10 q11 q12 q13'],
 ['Goals', 'q14 q15 v2_goal_history v2_goal_support v2_goal_reason'],
 ['Your routine', 'q28 q29 v2_routine_changes q33 q34'],
 ['Training', 'q35 v2_weight_change v2_weight_history q43 q45'],
 ['Eating habits', 'q46 v2_diet_history q50 q51 q52 v2_usual_meals v2_eating_challenges'],
 ['Health', 'q56 q57 q58 q59 q61 q62 q63 q64 q65 q66 v2_supplement_preferences q68'],
 ['Daily activity', 'q69 q70 q71'],
 ['Sleep', 'q72 q73 q75'],
 ['Wellbeing & digestion', 'v2_stress_routine v2_digestion q82 q83 q84 q85 q86 q87'],
];
const labels: Record<string, string> = { q1: 'Name', q2: 'Age', q3: 'Height (cm)', q4: 'Weight (kg)', q5: 'City and country', q6: 'Occupation', q7: 'WhatsApp number' };
export function ratingAnchors(id: string): string | undefined {
 if (id === 'q51') return '0 = No experience · 10 = Very experienced';
 if (id === 'q73') return '0 = Tired on waking · 5 = Well rested';
 if (['q82','q83','q84','q85','q86'].includes(id)) return '1 = Rare or absent · 5 = Severe or frequent';
}
export const questionnaireSections: Section[] = originalSections.map((s, i) => ({
 ...s, title: selection[i][0], description: i === 1 ? 'Optional initial measurements in cm. Take measurements on an empty stomach.' : '',
 questions: selection[i][1].split(' ').map(id => ({ ...questionsById[id], ...inputCopy[id],
 ...(labels[id] ? { text: labels[id] } : {}),
 ...(id === 'q7' ? { description: 'Review this number, even if it is already on your profile.' } : {}),
 ...(id === 'q8' ? { description: 'Waist measurement in cm.' } : {}),
 ...(ratingAnchors(id) ? { description: ratingAnchors(id) } : {}),
 })),
}));
const parents: Record<string,string> = { q29: 'q28', v2_goal_history: 'q15', v2_weight_history: 'v2_weight_change', v2_diet_history: 'q46', q59: 'q58', q66: 'q65', q82:'v2_digestion', q83:'v2_digestion', q84:'v2_digestion', q85:'v2_digestion', q86:'v2_digestion', q87:'v2_digestion' };
export const isQuestionVisible = (question: Question, answers: Answers) => !parents[question.id] || answers[parents[question.id]] === 'Yes';
export const visibleQuestions = (section: Section, answers: Answers) => section.questions.filter(q => isQuestionVisible(q, answers));
export const hasAnswer = (value: unknown): boolean => typeof value === 'number' ? Number.isFinite(value) : typeof value === 'string' ? value.trim().length > 0 : Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string');
export const missingRequired = (section: Section, answers: Answers) => visibleQuestions(section, answers).filter(q => q.required && !hasAnswer(answers[q.id]));
export function validCompletedSections(answers: Answers, history: string[], sections: Section[] = questionnaireSections): string[] {
 return sections.filter(s => history.includes(s.id) && missingRequired(s, answers).length === 0).map(s => s.id);
}
export function readbackSections(answers: Answers) {
 return questionnaireSections.map((section, i) => {
  const currentIds = new Set(visibleQuestions(section, answers).map(q => q.id));
  const union = [...originalSections[i].questions, ...section.questions.filter(q => !original[q.id])];
  const answered = union.filter(q => hasAnswer(answers[q.id]) && (q.type === 'multiselect' ? Array.isArray(answers[q.id]) : !Array.isArray(answers[q.id])));
  return { ...section, description: originalSections[i].description, current: answered.filter(q => currentIds.has(q.id)), earlier: answered.filter(q => !currentIds.has(q.id)) };
 });
}
export function parseAnswers(value: unknown): Answers {
 if (value != null && typeof value !== 'string') throw new Error('Assessment answers must be JSON text.');
 const parsed: unknown = JSON.parse(value == null || value === '' ? '{}' : value as string);
 if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Assessment answers must be an object.');
 return parsed as Answers;
}
export function parseCompletedSections(value: unknown): string[] {
 const parsed: unknown = JSON.parse(value == null || value === '' ? '[]' : value as string);
 if (!Array.isArray(parsed) || !parsed.every(id => typeof id === 'string')) throw new Error('Assessment progress must be a string array.');
 return parsed;
}
export function changedAnswers(baseline: Answers, draft: Answers): Answers {
 return Object.fromEntries(Object.entries(draft).filter(([id, value]) => value !== undefined && JSON.stringify(value) !== JSON.stringify(baseline[id])));
}
export function mergeAnswers(latest: Answers, patch: Answers, version = true): Answers {
 const merged = { ...latest, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
 if (version) merged.__assessment_catalog_version = Math.max(2, typeof latest.__assessment_catalog_version === 'number' ? latest.__assessment_catalog_version : 0);
 return merged;
}
export function suggestProfileAnswers(answers: Answers, profile: { full_name?: unknown; phone_number?: unknown; profile_data?: Record<string, unknown> | null } | null): Answers {
 const pd = profile?.profile_data;
 const suggestions: Answers = { q1: profile?.full_name, q7: profile?.phone_number, q14: pd?.goal, q56: pd?.injuries, q64: pd?.allergies, q33: pd?.workoutDays };
 return { ...Object.fromEntries(Object.entries(suggestions).filter(([id,v]) => !Object.prototype.hasOwnProperty.call(answers,id) && hasAnswer(v))), ...answers };
}
export const answerText = (answers: Answers, id: string, fallback: unknown = '') => {
 const value = Object.prototype.hasOwnProperty.call(answers,id) ? answers[id] : fallback;
 if (value == null) return '';
 if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Invalid profile answer');
 return String(value);
};

/** These original symptom scales inherited their anchors from the legacy section. */
export const historicalGuidance = (question: Question) => question.description || (['q83','q84','q85','q86'].includes(question.id) ? '1 = Rarely · 5 = Severe' : undefined);
