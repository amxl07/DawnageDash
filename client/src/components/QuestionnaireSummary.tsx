import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { questionnaireSections, historicalGuidance, readbackSections, validCompletedSections, type Answers } from '@/lib/questionnaire-data';

export function QuestionnaireSummary({ answers, completed = [], onEdit }: { answers: Answers; completed?: string[]; onEdit: () => void }) {
 return <div className="max-w-3xl mx-auto space-y-6">
  <Card className="p-6 space-y-3">
   <h2 className="text-xl font-bold">{validCompletedSections(answers,completed).length === questionnaireSections.length ? 'Assessment complete' : 'Assessment in progress'}</h2>
   <p>Your answers help build your plan. You can update them any time.</p>
   <Button onClick={onEdit} variant="outline">Edit answers</Button>
  </Card>
  {readbackSections(answers).filter(s=>s.current.length || s.earlier.length).map(section=><Card key={section.id} className="p-6 space-y-4">
   <h3 className="text-lg font-semibold">{section.title}</h3>
   {section.id === 'body_measurements' && <p>Initial measurements in cm · {section.description}</p>}
   {[['Current answers',section.current],['Earlier or currently hidden answers',section.earlier]].map(([title,questions])=>typeof questions !== 'string' && questions.length > 0 && <div key={String(title)} className="space-y-4">
    <h4 className="font-semibold">{String(title)}</h4>
    {questions.map(q=><div key={q.id} className="space-y-1">
     <p className="font-medium">{q.text}</p>
     {historicalGuidance(q) && <p className="text-sm text-muted-foreground">{historicalGuidance(q)}</p>}
     {q.placeholder && <p className="text-sm text-muted-foreground">{q.placeholder}</p>}
     <p className="whitespace-pre-wrap">{String(answers[q.id])}{q.type === 'rating' ? ` (${q.min ?? 1}–${q.max ?? 5})` : ''}</p>
    </div>)}
   </div>)}
  </Card>)}
 </div>;
}
