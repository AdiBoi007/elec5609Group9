import { useEffect, useState } from "react";
import { ArrowLeft, Check, Dumbbell, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Card,
  FormField,
  inputClass,
  PageHeader,
  PillButton,
} from "../components/ui";
import { api } from "../services/api";
import type { ApiExercise, ApiWorkoutDetail } from "../types";

export default function NewWorkoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("Upper Body Strength");
  const [duration, setDuration] = useState(60);
  const [library, setLibrary] = useState<ApiExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [exercises, setExercises] = useState<
    Array<{
      exerciseId: number;
      name: string;
      sets: number;
      reps: number;
      weight: number;
    }>
  >([]);
  useEffect(() => {
    api.getExercises().then((items) => {
      setLibrary(items);
      const requestedId = Number(searchParams.get("exercise"));
      const requested = Number.isInteger(requestedId) ? items.find(item => item.id === requestedId) : undefined;
      setExercises(
        (requested ? [requested] : items.slice(0, 2)).map((exercise, index) => ({
          exerciseId: exercise.id,
          name: exercise.name,
          sets: 3,
          reps: index === 0 ? 8 : 10,
          weight: index === 0 ? 70 : 55,
        })),
      );
      if (requested) setName(`${requested.name} Session`);
    }).catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load exercise library"));
  }, [searchParams]);
  const saveWorkout = async () => {
    if (!name.trim() || !exercises.length) {
      setError("Add a workout name and at least one exercise.");
      return;
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) { setError("Duration must be between 1 and 1,440 minutes."); return; }
    if (exercises.some(exercise => !Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > 100 || !Number.isInteger(exercise.reps) || exercise.reps < 1 || exercise.reps > 1000 || !Number.isFinite(exercise.weight) || exercise.weight < 0 || exercise.weight > 1000)) {
      setError("Sets and reps must be positive whole numbers, and weight must be between 0 and 1,000 kg.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.createWorkout({
        name: name.trim(),
        durationMinutes: duration,
        notes: `${exercises.length} exercise strength session`,
        exercises: exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          reps: exercise.reps,
          weightKg: exercise.weight,
        })),
      });
      navigate("/workouts");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save workout");
    } finally {
      setSaving(false);
    }
  };
  const addExercise = () => {
    const next = library.find(item => !exercises.some(exercise => exercise.exerciseId === item.id));
    if (next) setExercises(current => [...current, { exerciseId: next.id, name: next.name, sets: 3, reps: 10, weight: 0 }]);
  };
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const totalVolume = exercises.reduce((sum, exercise) => sum + exercise.sets * exercise.reps * exercise.weight, 0);
  const muscleGroups = [...new Set(exercises.map(exercise => library.find(item => item.id === exercise.exerciseId)?.muscleGroup).filter(Boolean))];
  return (
    <div>
      <Link
        to="/workouts"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={16} />
        Back to workouts
      </Link>
      <PageHeader
        title="New workout"
        description="Create a focused session and track every set."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
      <Card className="p-5 md:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_170px]"><FormField label="Workout name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)}/></FormField><FormField label="Duration (minutes)"><input type="number" min="1" max="1440" className={inputClass} value={duration} onChange={event=>setDuration(Number(event.target.value))}/></FormField></div>
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xl font-bold">Exercises</h2>
          <PillButton
            disabled={!library.length || exercises.length >= library.length}
            onClick={addExercise}
            className="bg-[#f1f1ee] text-ink"
          >
            <Plus size={15} />
            Add exercise
          </PillButton>
        </div>
        <div className="mt-4 space-y-3">
          {exercises.map((exercise, index) => (
            <div
              key={`${exercise.name}-${index}`}
              className="flex items-center gap-3 border-b border-black/[.055] px-1 py-4 last:border-b-0"
            >
              <GripVertical size={17} className="text-muted" />
              <div className="flex-1">
                <select
                  value={exercise.exerciseId}
                  onChange={(e) => {
                    const selected = library.find(
                      (item) => item.id === Number(e.target.value),
                    );
                    setExercises(
                      exercises.map((x, i) =>
                        i === index && selected
                          ? {
                              ...x,
                              exerciseId: selected.id,
                              name: selected.name,
                            }
                          : x,
                      ),
                    );
                  }}
                  className="w-full bg-transparent font-bold outline-none"
                >
                  {library.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["sets", "reps", "weight"] as const).map((key) => (
                    <label key={key} className="rounded-xl bg-white px-3 py-2">
                      <span className="block text-[9px] font-bold uppercase text-muted">
                        {key}
                      </span>
                      <input
                        type="number"
                        min={key === "weight" ? 0 : 1}
                        max={key === "sets" ? 100 : 1000}
                        step={key === "weight" ? 0.5 : 1}
                        value={exercise[key]}
                        onChange={(e) =>
                          setExercises(
                            exercises.map((x, i) =>
                              i === index
                                ? { ...x, [key]: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                        className="w-full bg-transparent text-sm font-bold outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={() =>
                  setExercises(exercises.filter((_, i) => i !== index))
                }
                className="text-muted hover:text-coral"
                aria-label={`Remove ${exercise.name}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
        {!exercises.length&&<div className="rounded-2xl border border-dashed border-black/10 py-10 text-center"><Dumbbell className="mx-auto text-muted"/><p className="mt-2 text-sm text-muted">Add an exercise to begin building your session.</p></div>}
      </Card>
      <aside className="h-fit rounded-[22px] bg-ink p-5 text-white xl:sticky xl:top-[84px]"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/40">Session summary</p><h2 className="mt-2 truncate text-xl font-bold">{name.trim()||"Untitled workout"}</h2><div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10">{[["Exercises",exercises.length],["Total sets",totalSets],["Duration",`${duration} min`],["Volume",`${Math.round(totalVolume).toLocaleString()} kg`]].map(([label,value])=><div key={String(label)} className="bg-white/[.045] p-3"><p className="text-[9px] font-bold uppercase text-white/35">{label}</p><p className="mt-1 text-base font-bold">{value}</p></div>)}</div><div className="mt-5"><p className="text-[9px] font-bold uppercase text-white/35">Muscle groups</p><div className="mt-2 flex flex-wrap gap-1.5">{muscleGroups.length?muscleGroups.map(group=><span key={group} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">{group}</span>):<span className="text-xs text-white/40">Add exercises to see coverage.</span>}</div></div>{error&&<p className="mt-4 rounded-xl bg-coral/15 p-3 text-xs font-semibold text-[#ff9b8d]">{error}</p>}<PillButton disabled={saving||!exercises.length} onClick={saveWorkout} className="mt-6 w-full bg-white text-ink"><Check size={16}/>{saving?"Saving…":"Save workout"}</PillButton><PillButton disabled={!library.length||exercises.length>=library.length} onClick={addExercise} className="mt-2 w-full border border-white/15 bg-transparent text-white"><Plus size={15}/>Add exercise</PillButton></aside>
      </div>
    </div>
  );
}

export function WorkoutDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [workout,setWorkout]=useState<ApiWorkoutDetail|null>(null); const [error,setError]=useState(""); const [deleting,setDeleting]=useState(false); const [repeating,setRepeating]=useState(false);
  useEffect(()=>{if(id)api.getWorkout(Number(id)).then(setWorkout).catch(reason=>setError(reason instanceof Error?reason.message:"Unable to load workout"));},[id]);
  if(error)return <Card className="p-8 text-center"><p className="font-bold">{error}</p><Link to="/workouts" className="mt-4 inline-block text-sm font-bold text-violet">Return to workouts</Link></Card>;
  if(!workout)return <div className="h-72 animate-pulse rounded-card bg-white"/>;
  return (
    <div>
      <Link
        to="/workouts"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted"
      >
        <ArrowLeft size={16} />
        All workouts
      </Link>
      <PageHeader
        eyebrow={new Date(workout.startedAt).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}
        title={workout.name}
        description={`${workout.notes || `${workout.exercises.length} exercises`} · ${workout.durationMinutes} min`}
        action={
          <div className="flex flex-wrap gap-2"><PillButton disabled={repeating} onClick={async()=>{setRepeating(true);setError("");try{const repeated=await api.repeatWorkout(workout.id);navigate(`/workouts/${repeated.id}`);}catch(reason){setError(reason instanceof Error?reason.message:"Unable to repeat workout");setRepeating(false);}}} className="bg-ink text-white"><RotateCcw size={15}/>{repeating?"Logging…":"Repeat workout"}</PillButton><Link to="/workouts/new"><PillButton className="bg-surface-muted text-ink">Build new</PillButton></Link><PillButton disabled={deleting} onClick={async()=>{if(!window.confirm("Delete this workout?"))return;setDeleting(true);setError("");try{await api.deleteWorkout(workout.id);navigate("/workouts");}catch(reason){setError(reason instanceof Error?reason.message:"Unable to delete workout");setDeleting(false);}}} className="bg-[#fff1ef] text-coral"><Trash2 size={15}/>{deleting?"Deleting…":"Delete"}</PillButton></div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {workout.exercises.map((exercise, i) => (
          <Card key={exercise.id} className="p-5">
            <p className="text-xs font-bold text-muted">{i + 1} / {workout.exercises.length}</p>
            <h3 className="mt-2 font-bold">{exercise.name}</h3>
            <p className="mt-5 text-2xl font-bold">{exercise.sets ?? 0} × {exercise.reps ?? 0}</p>
            <p className="mt-1 text-xs text-muted">
              {exercise.weightKg ? `${exercise.weightKg} kg` : exercise.durationSeconds ? `${exercise.durationSeconds} sec` : exercise.notes || "Completed"}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
