import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CalendarClock, CheckCircle2, ChevronRight, CirclePause, Pencil, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
import { Card, DetailDrawer, FormField, inputClass, PageHeader, PillButton, SegmentedControl } from "../components/ui";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import type { Goal, GoalDirection, GoalInput, GoalType, UserProfile } from "../types";

const types: Array<{ value: GoalType; label: string; unit: string; direction: GoalDirection }> = [
  { value: "WEIGHT", label: "Weight", unit: "kg", direction: "DECREASE" },
  { value: "BODY_FAT", label: "Body fat", unit: "%", direction: "DECREASE" },
  { value: "WAIST", label: "Waist", unit: "cm", direction: "DECREASE" },
  { value: "PROTEIN", label: "Protein", unit: "g/day", direction: "AT_LEAST" },
  { value: "CALORIES", label: "Calories", unit: "kcal/day", direction: "AT_MOST" },
  { value: "WATER", label: "Water", unit: "mL/day", direction: "AT_LEAST" },
  { value: "SLEEP", label: "Sleep", unit: "hours", direction: "AT_LEAST" },
  { value: "WORKOUT_FREQUENCY", label: "Workout frequency", unit: "workouts/week", direction: "AT_LEAST" },
  { value: "STREAK", label: "Consistency streak", unit: "days", direction: "AT_LEAST" },
];
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const futureDate = () => { const date = new Date(); date.setDate(date.getDate() + 84); return localDate(date); };
const readable = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
const tone = (status: string) => status === "COMPLETED" || status === "AHEAD" || status === "ON_TRACK" ? "bg-[#e8f7ed] text-success" : status === "BEHIND" || status === "NEEDS_ATTENTION" || status === "FAILED" ? "bg-[#fff1ef] text-coral" : status === "PAUSED" || status === "ARCHIVED" ? "bg-surface-muted text-muted" : "bg-[#fff6e8] text-warning";
const formatValue = (value: number | undefined, unit: string) => value == null ? "—" : `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;

export default function GoalsPage() {
  const [searchParams] = useSearchParams();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState("Active");
  const [selected, setSelected] = useState<Goal | null>(null);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try { const [items, user] = await Promise.all([api.getGoals(), api.getProfile()]); setGoals(items); setProfile(user); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load goals"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (searchParams.get("new") === "1") setEditing("new"); }, [searchParams]);
  const visible = goals.filter(goal => tab === "Active" ? ["ACTIVE", "PAUSED"].includes(goal.status) : ["COMPLETED", "ARCHIVED", "FAILED"].includes(goal.status));
  const changeStatus = async (goal: Goal, action: "pause" | "resume" | "archive") => {
    setError("");
    try { const updated = action === "pause" ? await api.pauseGoal(goal.id) : action === "resume" ? await api.resumeGoal(goal.id) : await api.archiveGoal(goal.id); setGoals(current => current.map(item => item.id === updated.id ? updated : item)); setSelected(updated); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update goal"); }
  };
  const remove = async (goal: Goal) => {
    if (!window.confirm(`Delete “${goal.title}”? This cannot be undone.`)) return;
    try { await api.deleteGoal(goal.id); setGoals(current => current.filter(item => item.id !== goal.id)); setSelected(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete goal"); }
  };

  return <div>
    <PageHeader eyebrow="Progress" title="Goals" description="Turn your health data into measurable outcomes." action={<PillButton onClick={() => setEditing("new")} className="bg-ink text-white"><Plus size={16}/>New goal</PillButton>}/>
    {error && <p className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}
    <SegmentedControl options={["Active", "Completed"]} value={tab} onChange={setTab}/>
    {loading ? <div className="mt-4 h-48 animate-pulse rounded-card bg-surface"/> : visible.length ? <Card className="mt-4 overflow-hidden px-4 sm:px-5">
      {visible.map(goal => <button key={goal.id} type="button" onClick={() => setSelected(goal)} className="group grid w-full gap-3 border-b border-line py-4 text-left last:border-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(190px,.9fr)_100px_120px_18px] sm:items-center">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">{readable(goal.type)}</p><p className="mt-1 truncate text-[15px] font-bold text-ink">{goal.title}</p><p className="mt-1 text-xs text-muted">{formatValue(goal.startValue, goal.unit)} → {formatValue(goal.targetValue, goal.unit)}</p></div>
        <div><div className="flex items-center justify-between text-[11px]"><span className="font-bold">{Math.round(goal.progress)}%</span><span className="text-muted">{formatValue(goal.currentValue, goal.unit)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-coral transition-[width] duration-200" style={{width:`${goal.progress}%`}}/></div></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted">Target</p><p className="mt-1 text-xs font-semibold">{goal.targetDate ? new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString(undefined,{day:"numeric",month:"short"}) : "Ongoing"}</p></div>
        <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.08em] ${tone(goal.trackStatus)}`}>{readable(goal.trackStatus)}</span>
        <ChevronRight size={16} className="text-muted transition group-hover:translate-x-0.5"/>
      </button>)}
    </Card> : <Card className="mt-4 grid min-h-48 place-items-center p-7 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#fff1ef] text-coral"><Target size={20}/></span><h2 className="mt-4 font-bold">{tab === "Active" ? "Turn your health data into something measurable" : "No completed goals yet"}</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted">{tab === "Active" ? "Track a target weight, train consistently, improve sleep or build a daily nutrition habit." : "Completed and archived goals will remain available here."}</p>{tab === "Active" && <PillButton onClick={() => setEditing("new")} className="mt-4 bg-ink text-white">Create your first goal</PillButton>}</div></Card>}
    {selected && <GoalDetail goal={selected} onClose={() => setSelected(null)} onEdit={() => setEditing(selected)} onPause={() => void changeStatus(selected,"pause")} onResume={() => void changeStatus(selected,"resume")} onArchive={() => void changeStatus(selected,"archive")} onDelete={() => void remove(selected)}/>}
    {editing && <GoalEditor value={editing === "new" ? null : editing} profile={profile} saving={saving} onClose={() => setEditing(null)} onSave={async input => { setSaving(true); setError(""); try { const saved = editing === "new" ? await api.createGoal(input) : await api.updateGoal(editing.id,input); await load(); setSelected(saved); setEditing(null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save goal"); } finally { setSaving(false); } }}/>}
  </div>;
}

function GoalDetail({goal,onClose,onEdit,onPause,onResume,onArchive,onDelete}:{goal:Goal;onClose:()=>void;onEdit:()=>void;onPause:()=>void;onResume:()=>void;onArchive:()=>void;onDelete:()=>void}) {
  return <DetailDrawer title={goal.title} eyebrow={readable(goal.type)} onClose={onClose} footer={<div className="flex flex-wrap gap-2"><PillButton onClick={onEdit} className="bg-ink text-white"><Pencil size={14}/>Edit</PillButton>{goal.status === "ACTIVE" ? <PillButton onClick={onPause} className="bg-surface-muted text-ink"><CirclePause size={14}/>Pause</PillButton> : goal.status === "PAUSED" ? <PillButton onClick={onResume} className="bg-surface-muted text-ink"><RotateCcw size={14}/>Resume</PillButton> : null}<PillButton onClick={onArchive} className="bg-surface-muted text-ink"><Archive size={14}/>Archive</PillButton><button type="button" onClick={onDelete} className="ml-auto grid size-11 place-items-center rounded-full text-coral hover:bg-[#fff1ef]" aria-label="Delete goal"><Trash2 size={16}/></button></div>}>
    {goal.status === "COMPLETED" && <div className="mb-4 flex items-center gap-3 rounded-[20px] bg-[#e8f7ed] p-4 text-success"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-success text-white"><CheckCircle2 size={19}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.12em]">Goal completed</p><p className="mt-1 text-sm font-bold">{formatValue(goal.targetValue,goal.unit)} reached{goal.completedDate ? ` · ${new Date(`${goal.completedDate}T00:00:00`).toLocaleDateString()}` : ""}</p></div></div>}
    <div className="rounded-[20px] bg-ink p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-[38px] font-bold leading-none tracking-[-.05em]">{Math.round(goal.progress)}%</p><p className="mt-2 text-xs text-white/50">{formatValue(goal.currentValue,goal.unit)} of {formatValue(goal.targetValue,goal.unit)}</p></div><span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase ${tone(goal.trackStatus)}`}>{readable(goal.trackStatus)}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-coral" style={{width:`${goal.progress}%`}}/></div></div>
    <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-line"><Detail label="Started" value={new Date(`${goal.startDate}T00:00:00`).toLocaleDateString()}/><Detail label="Target" value={goal.targetDate ? new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString() : "Ongoing"}/><Detail label="Current pace" value={goal.pacePerWeek == null ? "Not enough data" : `${goal.pacePerWeek > 0 ? "+" : ""}${goal.pacePerWeek.toFixed(2)} ${goal.unit}/week`}/><Detail label="Projected" value={goal.projectedDate ? new Date(`${goal.projectedDate}T00:00:00`).toLocaleDateString() : "Not enough data"}/></div>
    <p className="mt-4 text-xs leading-5 text-muted">{goal.methodology}</p>
    <h3 className="mt-7 text-sm font-bold">Timeline</h3>
    <div className="mt-3 border-l border-line pl-4">{goal.timeline.length ? goal.timeline.map((point,index)=><div key={`${point.date}-${index}`} className="relative pb-5 last:pb-0"><span className={`absolute -left-[20.5px] top-1 size-2.5 rounded-full border-2 border-surface ${point.projected ? "bg-violet" : "bg-coral"}`}/><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold">{point.label}</p><p className="mt-0.5 text-[11px] text-muted">{new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}{point.projected ? " · Based on recent trend" : ""}</p></div><p className="text-sm font-bold">{formatValue(point.value,point.unit)}</p></div></div>) : <p className="text-sm text-muted">Record more health data to build this timeline.</p>}</div>
    {goal.projectedDate && <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-xs leading-5 text-muted"><CalendarClock size={14} className="mr-2 inline"/>Projection is based on your recent recorded trend. Actual progress may vary.</p>}
  </DetailDrawer>;
}
function Detail({label,value}:{label:string;value:string}) { return <div className="bg-surface p-4"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-muted">{label}</p><p className="mt-1 text-xs font-semibold text-ink">{value}</p></div>; }

function GoalEditor({value,profile,saving,onClose,onSave}:{value:Goal|null;profile:UserProfile|null;saving:boolean;onClose:()=>void;onSave:(input:GoalInput)=>Promise<void>}) {
  const initialType = value?.type ?? "WEIGHT";
  const defaultFor = (type:GoalType) => type === "WEIGHT" ? 68 : type === "PROTEIN" ? profile?.proteinTarget ?? 150 : type === "CALORIES" ? profile?.calorieTarget ?? 2200 : type === "WATER" ? profile?.hydrationTargetMl ?? 2500 : type === "SLEEP" ? 7.5 : type === "WORKOUT_FREQUENCY" ? 4 : type === "STREAK" ? 30 : type === "BODY_FAT" ? 15 : 80;
  const config = (type:GoalType) => types.find(item => item.value === type)!;
  const [form,setForm] = useState<GoalInput>({type:initialType,title:value?.title ?? config(initialType).label + " goal",targetValue:value?.targetValue ?? defaultFor(initialType),unit:value?.unit ?? config(initialType).unit,startDate:value?.startDate ?? localDate(),targetDate:value?.targetDate ?? futureDate(),direction:value?.direction ?? config(initialType).direction});
  const currentHint = useMemo(() => form.type === "WEIGHT" && profile?.weight ? `${profile.weight.toFixed(1)} kg from your profile` : "Circle Health will use your latest persisted health records",[form.type,profile]);
  return <DetailDrawer title={value ? "Edit goal" : "New goal"} eyebrow="Trackable goal" onClose={onClose} footer={<PillButton disabled={saving} onClick={()=>void onSave(form)} className="w-full bg-ink text-white">{saving ? "Saving…" : value ? "Save changes" : "Create goal"}</PillButton>}>
    <div className="grid gap-4">
      <FormField label="Goal type"><div className="grid grid-cols-2 gap-2">{types.map(item=><button key={item.value} type="button" onClick={()=>setForm(current=>({...current,type:item.value,title:`${item.label} goal`,targetValue:defaultFor(item.value),unit:item.unit,direction:item.direction}))} className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${form.type===item.value?"border-ink bg-ink text-white":"border-line bg-surface hover:bg-surface-muted"}`}>{item.label}</button>)}</div></FormField>
      <FormField label="Title"><input className={inputClass} maxLength={140} value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/></FormField>
      <div className="grid grid-cols-[1fr_130px] gap-3"><FormField label="Target"><input type="number" min="0.01" max="1000000" step="0.1" className={inputClass} value={form.targetValue} onChange={event=>setForm({...form,targetValue:Number(event.target.value)})}/></FormField><FormField label="Unit"><input className={inputClass} value={form.unit} readOnly/></FormField></div>
      <p className="-mt-2 text-[11px] text-muted">Current value: {currentHint}.</p>
      <div className="grid gap-3 sm:grid-cols-2"><FormField label="Start date"><input type="date" max={localDate()} className={inputClass} value={form.startDate} onChange={event=>setForm({...form,startDate:event.target.value})}/></FormField><FormField label="Target date"><input type="date" min={form.startDate} className={inputClass} value={form.targetDate} onChange={event=>setForm({...form,targetDate:event.target.value})}/></FormField></div>
      <div className="rounded-2xl bg-surface-muted p-4 text-xs leading-5 text-muted">Progress is calculated from your existing health data. Circle Health never creates duplicate measurements inside a goal.</div>
    </div>
  </DetailDrawer>;
}
