import * as contract from './questionnaire-data';

test('revised intake has 61 maximum questions and retains ten destinations', () => {
  expect(contract.questionnaireSections.flatMap(s => s.questions)).toHaveLength(61);
  expect(contract.questionnaireSections).toHaveLength(10);
});

const section = (id: string) => contract.questionnaireSections.find(s => s.id === id)!;
test('follow-ups recover Yes → No → Yes without counting hidden fields', () => {
 const answers = { q15: 'Yes', v2_goal_history: 'Walking helped', q14: 'Fitness' };
 expect(contract.visibleQuestions(section('goals'), answers).map(q=>q.id)).toContain('v2_goal_history');
 const hidden = {...answers, q15: 'No'};
 expect(contract.visibleQuestions(section('goals'), hidden).map(q=>q.id)).not.toContain('v2_goal_history');
 expect(contract.readbackSections(hidden).find(s=>s.id==='goals')!.earlier.map(q=>q.id)).toContain('v2_goal_history');
 expect(contract.visibleQuestions(section('goals'), {...hidden,q15:'Yes'}).map(q=>q.id)).toContain('v2_goal_history');
 expect(answers.v2_goal_history).toBe('Walking helped');
 expect(contract.questionnaireSections.flatMap(s=>contract.visibleQuestions(s,{}))).toHaveLength(49);
});
test('mixed records preserve original labels and never infer new parents', () => {
 const record = { q16:'Old essay', v2_goal_history:'New essay', q15:'Yes', q82:3, __assessment_catalog_version:2, future:{secret:true} };
 const rows = contract.readbackSections(record);
 expect(rows.find(s=>s.id==='goals')!.earlier.find(q=>q.id==='q16')!.text).toBe(contract.questionsById.q16.text);
 expect(rows.find(s=>s.id==='stress_gut')!.earlier.map(q=>q.id)).toContain('q82');
 expect(rows.flatMap(s=>[...s.current,...s.earlier]).map(q=>q.id)).not.toContain('future');
});
test('completion rejects whitespace, preserves zero, history and hidden validation', () => {
 expect(contract.hasAnswer(0)).toBe(true); expect(contract.hasAnswer('  ')).toBe(false);
 const custom = [{id:'test', title:'Test', description:'', questions:[{id:'q59',text:'Detail',type:'text' as const,required:true}]}];
 expect(contract.validCompletedSections({q58:'No'},['test','test','unknown'],custom)).toEqual(['test']);
 expect(contract.validCompletedSections({q58:'Yes'},['test'],custom)).toEqual([]);
 expect(contract.validCompletedSections({q14:' '},['goals'])).toEqual([]);
});
test('narrow patches preserve clears, hidden edits, unknown keys and future versions', () => {
 const patch = contract.changedAnswers({q14:'old',q56:'same'}, {q14:'',q56:'same',q59:'hidden'});
 expect(patch).toEqual({q14:'',q59:'hidden'});
 expect(contract.mergeAnswers({q56:'newer', future:{x:1},__assessment_catalog_version:9},patch)).toEqual({q14:'',q59:'hidden',q56:'newer',future:{x:1},__assessment_catalog_version:9});
 expect(contract.suggestProfileAnswers({q14:''},{full_name:'Alex',profile_data:{goal:'Fitness'}})).toEqual({q1:'Alex',q14:''});
});
