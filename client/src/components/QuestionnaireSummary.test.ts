import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { questionnaireSections, questionsById } from '../lib/questionnaire-data';

// The production Vite plugin supplies the automatic JSX runtime; tsx uses the
// root's preserve setting, so expose React for this server-render-only harness.
(globalThis as unknown as { React: typeof React }).React = React;
const { QuestionnaireSummary } = await import('./QuestionnaireSummary');

test('web readback renders mixed legacy/revised labels, hidden answers and zero without metadata', () => {
 const answers = {q60:'Historical response',q15:'Yes',v2_goal_history:'New goal history',q51:0,q83:4,future:{private:'not a question'},__assessment_catalog_version:2};
 const html=renderToStaticMarkup(React.createElement(QuestionnaireSummary,{answers,completed:[],onEdit:()=>{}}));
 assert.ok(html.includes(questionsById.q60.text));
 assert.ok(html.includes('Historical response')); assert.ok(html.includes('New goal history'));
 assert.ok(html.includes('Earlier or currently hidden answers'));
 assert.ok(html.includes('1 = Rarely · 5 = Severe'));
 assert.ok(html.includes('0 (0–10)')); assert.ok(html.includes('Assessment in progress'));
 assert.ok(!html.includes('not a question')); assert.ok(!html.includes('__assessment_catalog_version'));
});
test('web summary does not announce completion after clearing a required value',()=>{
 const html=renderToStaticMarkup(React.createElement(QuestionnaireSummary,{answers:{q14:' '},completed:questionnaireSections.map(s=>s.id),onEdit:()=>{}}));
 assert.ok(html.includes('Assessment in progress')); assert.ok(!html.includes('Assessment complete'));
});
