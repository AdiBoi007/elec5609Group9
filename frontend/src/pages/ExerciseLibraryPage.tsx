import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Filter, Plus, Search, Star, Video } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ExerciseVideo } from "../components/ExerciseVideo";
import { Card, DetailDrawer, PageHeader, PillButton } from "../components/ui";
import { api } from "../services/api";
import type { ApiExercise } from "../types";

export default function ExerciseLibraryPage() {
  const [searchParams] = useSearchParams();
  const [exercises, setExercises] = useState<ApiExercise[]>([]);
  const [query, setQuery] = useState(() => searchParams.get("query") ?? "");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [selected, setSelected] = useState<ApiExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getExercises().then(setExercises).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load exercises")).finally(() => setLoading(false));
  }, []);

  const options = useMemo(() => ({
    muscles: [...new Set(exercises.map((item) => item.muscleGroup))].sort(),
    equipment: [...new Set(exercises.map((item) => item.equipment))].sort(),
    difficulties: [...new Set(exercises.map((item) => item.difficulty))].sort(),
  }), [exercises]);
  const visible = exercises.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && (!muscle || item.muscleGroup === muscle) && (!equipment || item.equipment === equipment) && (!difficulty || item.difficulty === difficulty));
  const toggleFavourite = async (exercise: ApiExercise) => {
    setError("");
    try {
      if (exercise.favourite) await api.unfavouriteExercise(exercise.id); else await api.favouriteExercise(exercise.id);
      const updated = { ...exercise, favourite: !exercise.favourite };
      setExercises((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelected((current) => current?.id === updated.id ? updated : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update favourite"); }
  };

  return <div>
    <PageHeader eyebrow="Library" title="Exercise Library" description="Find movements, review technique and add exercises to a real workout log." action={<Link to="/log?tab=workout"><PillButton className="bg-ink text-white"><Plus size={16}/>Log workout</PillButton></Link>}/>
    {error && <p role="alert" className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-3 xl:flex-row">
        <label className="flex h-11 flex-1 items-center gap-3 rounded-xl bg-surface-muted px-4"><Search size={17} className="text-muted"/><span className="sr-only">Search exercises</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search by exercise name"/></label>
        {[{ label: "Muscle", value: muscle, set: setMuscle, values: options.muscles }, { label: "Equipment", value: equipment, set: setEquipment, values: options.equipment }, { label: "Difficulty", value: difficulty, set: setDifficulty, values: options.difficulties }].map((filter) => <label key={filter.label} className="flex h-11 items-center gap-2 rounded-xl bg-surface-muted px-3 text-xs font-semibold"><Filter size={14}/><span className="sr-only">{filter.label}</span><select value={filter.value} onChange={(event) => filter.set(event.target.value)} className="max-w-36 bg-transparent outline-none"><option value="">{filter.label}</option>{filter.values.map((value) => <option key={value}>{value}</option>)}</select></label>)}
      </div>
      {loading ? <div className="mt-5 h-64 animate-pulse rounded-2xl bg-surface-muted"/> : <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{visible.map((exercise) => <article key={exercise.id} className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3"><button type="button" onClick={() => setSelected(exercise)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-violet"><Dumbbell size={19}/></span><span className="min-w-0"><span className="block truncate font-bold">{exercise.name}</span><span className="block truncate text-xs text-muted">{exercise.muscleGroup} · {exercise.equipment} · {exercise.difficulty}</span></span></button><button type="button" aria-label={`${exercise.favourite ? "Remove" : "Add"} ${exercise.name} ${exercise.favourite ? "from" : "to"} favourites`} onClick={() => void toggleFavourite(exercise)} className="grid size-9 place-items-center rounded-full hover:bg-surface"><Star size={18} className={exercise.favourite ? "fill-amber text-amber" : "text-muted"}/></button></article>)}{!visible.length && <p className="col-span-full py-14 text-center text-sm text-muted">No exercises match those filters.</p>}</div>}
    </Card>
    {selected && <DetailDrawer title={selected.name} eyebrow="Exercise details" onClose={() => setSelected(null)} footer={<div className="flex flex-col gap-2 sm:flex-row"><PillButton onClick={() => void toggleFavourite(selected)} className="flex-1 bg-surface-muted text-ink"><Star size={16} className={selected.favourite ? "fill-amber text-amber" : ""}/>{selected.favourite ? "Remove favourite" : "Add favourite"}</PillButton><Link to={`/log?tab=workout&exercise=${selected.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"><Plus size={16}/>Add to workout</Link></div>}><div className="flex flex-wrap gap-2">{[selected.muscleGroup, selected.equipment, selected.difficulty].map((value) => <span key={value} className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold">{value}</span>)}</div><div className="mt-5"><ExerciseVideo exerciseName={selected.name} mediaUrl={selected.mediaUrl}/></div><div className="mt-5"><div className="flex items-center gap-2"><Video size={16} className="text-violet"/><h3 className="font-bold">How to perform it</h3></div><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">{selected.instructions || "Move through a comfortable range with controlled technique."}</p></div></DetailDrawer>}
  </div>;
}
