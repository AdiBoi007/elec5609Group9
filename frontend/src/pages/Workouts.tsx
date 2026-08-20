import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  Filter,
  Plus,
  Search,
  Star,
  Video,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Card,
  PageHeader,
  PillButton,
  SegmentedControl,
  DetailDrawer,
  MetricItem,
  MetricStrip,
} from "../components/ui";
import { api } from "../services/api";
import { ExerciseVideo } from "../components/ExerciseVideo";
import type { ApiExercise, PersonalRecords, Workout } from "../types";

type WorkoutCard = Workout & { month: string; volumeKg?: number; muscleGroups?: string };

export default function WorkoutsPage() {
  const [tab, setTab] = useState("History");
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [history, setHistory] = useState<WorkoutCard[]>([]);
  const [exerciseLibrary, setExerciseLibrary] =
    useState<ApiExercise[]>([]);
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<ApiExercise | null>(null);
  const [volume, setVolume] = useState(0);
  const [records, setRecords] = useState<PersonalRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    Promise.all([api.getWorkouts(), api.getExercises(), api.getProgress("month"), api.getPersonalRecords()]).then(([items, library, progress, personalRecords]) => {
      setHistory(
        items.map((item) => {
          const date = new Date(item.startedAt);
          return {
            id: item.id,
            name: item.name,
            focus: item.notes || `${item.exerciseCount} exercises`,
            duration: `${item.durationMinutes} min`,
            status: "Completed",
            exercises: item.exerciseCount,
            date: date.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
            month: date.toLocaleDateString("en-AU", {
              month: "long",
              year: "numeric",
            }),
            volumeKg: item.trainingVolumeKg,
            muscleGroups: item.muscleGroups,
          };
        }),
      );
      setExerciseLibrary(library); setVolume(progress.workouts.trainingVolumeKg); setRecords(personalRecords);
    }).catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load workouts")).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (searchParams.get("tab") === "library") setTab("Exercise library");
    const requestedQuery = searchParams.get("query");
    if (requestedQuery) setQuery(requestedQuery);
  }, [searchParams]);
  const months = [...new Set(history.map((workout) => workout.month))];
  const activeMonth = months.includes(month) ? month : months[0] ?? month;
  const visibleHistory = history.filter((workout) => workout.month === activeMonth);
  const filteredExercises = exerciseLibrary.filter((exercise) => exercise.name.toLowerCase().includes(query.toLowerCase()) && (!muscle || exercise.muscleGroup === muscle) && (!equipment || exercise.equipment === equipment) && (!difficulty || exercise.difficulty === difficulty));
  const toggleFavourite = async (exercise: ApiExercise) => { setError(""); try { if (exercise.favourite) await api.unfavouriteExercise(exercise.id); else await api.favouriteExercise(exercise.id); const next={...exercise,favourite:!exercise.favourite};setExerciseLibrary((current) => current.map((item) => item.id === exercise.id ? next : item));setSelectedExercise(current=>current?.id===exercise.id?next:current); } catch (reason) { setError(reason instanceof Error?reason.message:"Unable to update favourite"); } };
  const totalMinutes = history.reduce((sum, workout) => sum + Number.parseInt(workout.duration, 10), 0);
  const favouriteCount = exerciseLibrary.filter(exercise => exercise.favourite).length;
  return (
    <div>
      <PageHeader
        eyebrow="Training"
        title="Workouts"
        description="Build strength, stay consistent, and see every session add up."
        action={
          <Link to="/workouts/new">
            <PillButton className="bg-ink text-white">
              <Plus size={16} />
              New workout
            </PillButton>
          </Link>
        }
      />
      {error && <p className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}
      {!loading && <MetricStrip className="mb-4 grid-cols-2 md:grid-cols-4"><MetricItem label="Sessions" value={history.length} detail="Recorded workouts" accent="bg-violet"/><MetricItem label="Training time" value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`} detail="Across history" accent="bg-[#2ba75c]"/><MetricItem label="30-day volume" value={`${Math.round(volume / 100) / 10}k`} detail="Kilograms moved" accent="bg-coral"/><MetricItem label="Favourites" value={favouriteCount} detail={`${exerciseLibrary.length} exercises available`} accent="bg-amber"/></MetricStrip>}
      <div className="mb-5">
        <SegmentedControl
          options={["History", "Exercise library"]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {loading ? <div className="h-72 animate-pulse rounded-card bg-white"/> : tab === "History" ? (
        <div>
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-[-.03em]">
                Recent sessions
              </h2>
              <label className="flex items-center gap-2 text-sm font-semibold text-muted">
                <CalendarDays size={16} />
                <select value={activeMonth} onChange={(e) => setMonth(e.target.value)} className="bg-transparent outline-none">{months.map(value => <option key={value}>{value}</option>)}</select>
              </label>
            </div>
            <div className="mt-5 space-y-2">
              {visibleHistory.map((workout) => (
                <Link
                  to={`/workouts/${workout.id}`}
                  key={workout.id}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-black/[.05] hover:bg-[#f7f7f4]"
                >
                  <span
                    className={`grid size-10 place-items-center rounded-xl ${workout.status === "Completed" ? "bg-[#eef9f1] text-[#2ba75c]" : "bg-[#eeeaff] text-violet"}`}
                  >
                    {workout.status === "Completed" ? (
                      <Check size={20} />
                    ) : (
                      <Clock3 size={20} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-ink">{workout.name}</h3>
                    <p className="truncate text-sm text-muted">
                      {workout.muscleGroups || workout.focus}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">{workout.exercises} exercises{workout.volumeKg ? ` · ${Math.round(workout.volumeKg).toLocaleString()} kg volume` : ""}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-bold">{workout.duration}</p>
                    <p className="text-xs text-muted">{workout.date}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-muted transition group-hover:translate-x-1"
                  />
                </Link>
              ))}
              {!visibleHistory.length && (
                <div className="rounded-[20px] bg-[#f7f7f4] px-5 py-10 text-center text-sm text-muted">
              No sessions logged for {activeMonth}.
                </div>
              )}
            </div>
          </Card>
          {records && <Card className="mt-4 p-5 md:p-6"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Derived from history</p><h2 className="mt-1 text-xl font-bold">Personal records</h2></div><span className="text-xs text-muted">Recorded values only</span></div><div className="mt-4 grid gap-px overflow-hidden rounded-[18px] bg-line sm:grid-cols-3"><div className="bg-surface p-4"><p className="text-[10px] font-bold uppercase text-muted">Best session volume</p><p className="mt-2 text-xl font-bold">{Math.round(records.highestSessionVolumeKg).toLocaleString()} kg</p><p className="mt-1 truncate text-xs text-muted">{records.highestVolumeSession || "No strength volume"}</p></div><div className="bg-surface p-4"><p className="text-[10px] font-bold uppercase text-muted">Most in one week</p><p className="mt-2 text-xl font-bold">{records.mostWorkoutsInWeek}</p><p className="mt-1 text-xs text-muted">completed workouts</p></div><div className="bg-surface p-4"><p className="text-[10px] font-bold uppercase text-muted">Workout streak</p><p className="mt-2 text-xl font-bold">{records.longestWorkoutStreak} days</p><p className="mt-1 text-xs text-muted">consecutive training days</p></div></div>{records.exerciseRecords.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{records.exerciseRecords.map(record=><span key={record.exercise} className="rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-semibold">{record.exercise} · {record.highestWeightKg} kg</span>)}</div>}</Card>}
        </div>
      ) : (
        <Card className="p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex h-11 flex-1 items-center gap-3 rounded-xl bg-[#f5f5f2] px-4">
              <Search size={17} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent outline-none"
                placeholder="Search exercise library"
              />
            </label>
            {[{value:muscle,set:setMuscle,label:"Muscle",options:[...new Set(exerciseLibrary.map(e=>e.muscleGroup))]},{value:equipment,set:setEquipment,label:"Equipment",options:[...new Set(exerciseLibrary.map(e=>e.equipment))]},{value:difficulty,set:setDifficulty,label:"Difficulty",options:[...new Set(exerciseLibrary.map(e=>e.difficulty))]}].map(filter=><label key={filter.label} className="flex h-11 items-center gap-2 rounded-xl bg-[#f2f2ef] px-3 text-xs font-semibold"><Filter size={14}/><select className="bg-transparent outline-none" value={filter.value} onChange={e=>filter.set(e.target.value)}><option value="">{filter.label}</option>{filter.options.sort().map(value=><option key={value}>{value}</option>)}</select></label>)}
            {(query||muscle||equipment||difficulty)&&<button onClick={()=>{setQuery("");setMuscle("");setEquipment("");setDifficulty("");}} className="h-11 rounded-xl px-3 text-xs font-bold text-muted hover:bg-[#f2f2ef]">Clear</button>}
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredExercises.map((exercise) => (
                <div
                  key={exercise.name}
                  onClick={() => setSelectedExercise(exercise)}
                  onKeyDown={(event) => event.key === "Enter" && setSelectedExercise(exercise)}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-3 rounded-2xl bg-[#f8f8f6] p-3 transition hover:bg-[#f1f1ed]"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-white text-violet">
                    <Dumbbell size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{exercise.name}</p>
                    <p className="truncate text-xs text-muted">
                      {exercise.muscleGroup} · {exercise.equipment} ·{" "}
                      {exercise.difficulty}
                    </p>
                  </div>
                  <button
                    aria-label="Favourite"
                    onClick={(event) => { event.stopPropagation(); toggleFavourite(exercise); }}
                  >
                    <Star
                      size={18}
                      className={
                        exercise.favourite
                          ? "fill-amber text-amber"
                          : "text-muted"
                      }
                    />
                  </button>
                </div>
              ))}
            {!filteredExercises.length && <div className="col-span-full rounded-[20px] bg-[#f7f7f4] py-12 text-center text-sm text-muted">No exercises match those filters.</div>}
          </div>
        </Card>
      )}
      {selectedExercise && <DetailDrawer title={selectedExercise.name} eyebrow="Exercise details" onClose={() => setSelectedExercise(null)} footer={<div className="flex flex-col gap-2 sm:flex-row"><PillButton onClick={() => toggleFavourite(selectedExercise)} className="flex-1 bg-[#f2f2ef] text-ink"><Star size={16} className={selectedExercise.favourite?"fill-amber text-amber":""}/>{selectedExercise.favourite?"Remove favourite":"Add favourite"}</PillButton><Link to={`/workouts/new?exercise=${selectedExercise.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5"><Plus size={16}/>Add to workout</Link></div>}><div className="flex flex-wrap gap-2">{[selectedExercise.muscleGroup,selectedExercise.equipment,selectedExercise.difficulty].map(value=><span key={value} className="rounded-full bg-[#f2f2ef] px-3 py-1 text-xs font-bold">{value}</span>)}</div><div className="mt-5"><ExerciseVideo exerciseName={selectedExercise.name} mediaUrl={selectedExercise.mediaUrl}/></div><div className="mt-5"><div className="flex items-center gap-2"><Video size={16} className="text-violet"/><h3 className="font-bold">How to perform it</h3></div><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#555550]">{selectedExercise.instructions || "Move through a comfortable range with controlled technique."}</p></div></DetailDrawer>}
    </div>
  );
}
