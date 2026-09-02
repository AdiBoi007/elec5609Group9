import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, PageHeader, PillButton } from "../components/ui";
import { api } from "../services/api";
import type { ApiWorkoutDetail } from "../types";

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<ApiWorkoutDetail | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [repeating, setRepeating] = useState(false);
  useEffect(() => { if (id) api.getWorkout(Number(id)).then(setWorkout).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load workout")); }, [id]);
  if (error) return <Card className="p-8 text-center"><p className="font-bold">{error}</p><Link to="/progress?tab=training" className="mt-4 inline-block text-sm font-bold text-violet">Return to training progress</Link></Card>;
  if (!workout) return <div className="h-72 animate-pulse rounded-card bg-surface"/>;
  return <div>
    <Link to="/progress?tab=training" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted"><ArrowLeft size={16}/>Training progress</Link>
    <PageHeader eyebrow={new Date(workout.startedAt).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} title={workout.name} description={`${workout.notes || `${workout.exercises.length} exercises`} · ${workout.durationMinutes} min`} action={<div className="flex flex-wrap gap-2"><PillButton disabled={repeating} onClick={async () => { setRepeating(true); setError(""); try { const repeated = await api.repeatWorkout(workout.id); navigate(`/workouts/${repeated.id}`); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to repeat workout"); setRepeating(false); } }} className="bg-ink text-white"><RotateCcw size={15}/>{repeating ? "Logging…" : "Repeat workout"}</PillButton><Link to="/log?tab=workout"><PillButton className="bg-surface-muted text-ink">Build new</PillButton></Link><PillButton disabled={deleting} onClick={async () => { if (!window.confirm("Delete this workout?")) return; setDeleting(true); setError(""); try { await api.deleteWorkout(workout.id); navigate("/progress?tab=training"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete workout"); setDeleting(false); } }} className="bg-[#fff1ef] text-coral"><Trash2 size={15}/>{deleting ? "Deleting…" : "Delete"}</PillButton></div>}/>
    <div className="grid gap-4 lg:grid-cols-3">{workout.exercises.map((exercise, index) => <Card key={exercise.id} className="p-5"><p className="text-xs font-bold text-muted">{index + 1} / {workout.exercises.length}</p><h3 className="mt-2 font-bold">{exercise.name}</h3><p className="mt-5 text-2xl font-bold">{exercise.sets ?? 0} × {exercise.reps ?? 0}</p><p className="mt-1 text-xs text-muted">{exercise.weightKg ? `${exercise.weightKg} kg` : exercise.durationSeconds ? `${exercise.durationSeconds} sec` : exercise.notes || "Completed"}</p></Card>)}</div>
  </div>;
}
