import { mergeAnswers, parseAnswers, parseCompletedSections, questionnaireSections, validCompletedSections, type Answers, type Section } from './questionnaire';

/** Minimal PostgREST boundary shared by the two existing Supabase clients. */
type Database = { from: (table: string) => any };
export async function saveAssessment(
 database: Database, userId: string, patch: Answers, history: string[], active: () => boolean,
 options: { create?: boolean; sections?: Section[] } = {},
): Promise<{ answers: Answers; completed: string[]; status: string } | null> {
 const guard = () => { if (!active()) throw new Error('Assessment account changed.'); };
 const sections = options.sections ?? questionnaireSections;
 for (let attempt = 0; attempt < 3; attempt++) {
  guard();
  const {data: existing, error: readError} = await database.from('onboarding_questionnaire').select('id, user_id, answers, completed_sections').eq('user_id',userId).maybeSingle();
  guard(); if (readError) throw readError;
  if (!existing && options.create === false) return null;
  const answers = mergeAnswers(existing ? parseAnswers(existing.answers) : {}, patch, options.create !== false);
  const completed = Array.from(new Set([...(existing ? parseCompletedSections(existing.completed_sections) : []), ...history]));
  const status = validCompletedSections(answers,completed,sections).length === sections.length ? 'completed' : 'in_progress';
  const payload = {user_id:userId, answers:JSON.stringify(answers), completed_sections:JSON.stringify(completed), status};
  guard();
  let query;
  if(existing) {
   query = database.from('onboarding_questionnaire').update(payload).eq('id',existing.id).eq('user_id',userId);
   for (const field of ['answers','completed_sections']) query = existing[field] == null ? query.is(field,null) : query.eq(field,existing[field]);
  } else query = database.from('onboarding_questionnaire').insert({id:userId,...payload});
  const {data: saved, error} = await query.select('id, user_id, answers, completed_sections, status').maybeSingle();
  guard();
  if(error) { if(error.code === '23505') continue; throw error; }
  if(!saved) continue;
  if(saved.id !== (existing?.id ?? userId) || saved.user_id !== userId || saved.answers !== payload.answers || saved.completed_sections !== payload.completed_sections || saved.status !== status) throw new Error('Assessment save was not acknowledged.');
  return {answers:parseAnswers(saved.answers),completed:parseCompletedSections(saved.completed_sections),status};
 }
 throw new Error('Assessment changed elsewhere. Please retry.');
}
