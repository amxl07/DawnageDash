import type { WorkoutRecord, WorkoutRecordSet } from '@/lib/workout-record';
import { Input } from '@/components/ui/input';

type EditableField = 'weight' | 'reps' | 'duration' | 'rpe';
type Props = {
  document: WorkoutRecord;
  onSetChange?: (exerciseIndex: number, setIndex: number, field: EditableField, value: string) => void;
};

export function WorkoutRecordDetails({ document, onSetChange }: Props) {
  const editable = document.editable && Boolean(onSetChange);
  return <div className="space-y-4">
    {!document.editable && document.reason ? <p role="status" className="text-sm text-muted-foreground">{document.reason}</p> : null}
    {document.text ? <p className="whitespace-pre-wrap break-words text-sm">{document.text}</p> : null}
    {document.exercises.map((exercise, exerciseIndex) => {
      const completed = exercise.sets.filter(set => set.completed === true).length;
      const value = (set: WorkoutRecordSet, setIndex: number, field: EditableField, unit: string) => editable ?
        <Input aria-label={`${exercise.name} set ${set.setNumber} ${field}${unit ? ` in ${unit}` : ''}`}
          value={set[field]} onChange={event => onSetChange?.(exerciseIndex, setIndex, field, event.target.value)}
          inputMode={field === 'reps' ? 'numeric' : 'decimal'} className="min-w-20 max-w-28 text-center" />
        : <span className="tabular-nums">{set[field] || '—'}{set[field] && unit ? ` ${unit}` : ''}</span>;
      return <section key={exercise.id} aria-label={exercise.name} className="rounded-xl border bg-muted/20 p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold">{exercise.name}</h3>
          {exercise.sets.length ? <span className="text-xs text-muted-foreground">{exercise.sets.every(set => set.completed !== null)
            ? `${completed} of ${exercise.sets.length} sets complete` : `${exercise.sets.length} recorded sets`}</span> : null}
        </div>
        {exercise.summary ? <p className="text-sm text-muted-foreground">{exercise.summary}</p> : null}
        {exercise.videoUrl ? <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-primary underline">Watch exercise video</a> : null}
        {exercise.sets.length ? <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{exercise.name} recorded sets</caption>
            <thead><tr className="border-b text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-3">Set</th>
              {exercise.tracking === 'duration' ? <th scope="col" className="p-2">Duration (sec)</th> : <>
                <th scope="col" className="p-2">Weight (kg)</th><th scope="col" className="p-2">Reps</th>
              </>}
              <th scope="col" className="p-2">RPE</th><th scope="col" className="p-2">Status</th>
            </tr></thead>
            <tbody>{exercise.sets.map((set, setIndex) => <tr key={set.id} className="border-b last:border-0">
              <th scope="row" className="whitespace-nowrap py-3 pr-3 font-medium">{set.kind === 'warmup' ? 'Warm-up' : 'Set'} {set.setNumber}</th>
              {exercise.tracking === 'duration' ? <td className="p-2">{value(set, setIndex, 'duration', 'seconds')}</td> : <>
                <td className="p-2">{value(set, setIndex, 'weight', 'kg')}</td><td className="p-2">{value(set, setIndex, 'reps', '')}</td>
              </>}
              <td className="p-2">{value(set, setIndex, 'rpe', '')}</td>
              <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">{set.completed === true ? 'Complete' : set.completed === false ? 'Incomplete' : 'Not specified'}</td>
            </tr>)}</tbody>
          </table>
        </div> : null}
      </section>;
    })}
  </div>;
}
