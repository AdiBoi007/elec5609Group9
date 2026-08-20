import { useEffect, useMemo, useState } from "react";
import { Check, MoonStar, Pencil, Plus, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, FormField, inputClass, Modal, PageHeader, PillButton } from "../components/ui";
import { api } from "../services/api";
import type { SleepEntry, SleepSummary } from "../types";

const blank = () => {
  const wake = new Date(); wake.setSeconds(0, 0);
  const bed = new Date(wake); bed.setHours(bed.getHours() - 8);
  const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return { startedAt: local(bed), endedAt: local(wake), quality: 4, notes: "" };
};
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;

export default function SleepPage() {
  const [summary, setSummary] = useState<SleepSummary | null>(null);
  const [editing, setEditing] = useState<SleepEntry | null | "new">(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = () => api.getSleepSummary().then(setSummary).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  const chart = useMemo(() => [...(summary?.history ?? [])].reverse().slice(-14).map((entry) => ({ day: new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }), hours: Math.round(entry.durationMinutes / 6) / 10, quality: entry.quality })), [summary]);
  const open = (entry?: SleepEntry) => { setError(""); setEditing(entry ?? "new"); setForm(entry ? { startedAt: entry.startedAt.slice(0, 16), endedAt: entry.endedAt.slice(0, 16), quality: entry.quality, notes: entry.notes ?? "" } : blank()); };
  const save = async () => {
    setSaving(true); setError("");
    try {
      const start = new Date(form.startedAt); const end = new Date(form.endedAt); const minutes = (end.getTime() - start.getTime()) / 60000;
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) throw new Error("Wake time must be after bedtime and sleep cannot exceed 24 hours.");
      if (end.getTime() > Date.now()) throw new Error("Wake time cannot be in the future.");
      const payload = { ...form, startedAt: form.startedAt.length === 16 ? `${form.startedAt}:00` : form.startedAt, endedAt: form.endedAt.length === 16 ? `${form.endedAt}:00` : form.endedAt };
      if (editing !== "new" && editing) await api.updateSleep(editing.id, payload); else await api.createSleep(payload); setEditing(null); await load();
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save sleep entry"); }
    finally { setSaving(false); }
  };
  const remove = async (entry: SleepEntry) => { if (!window.confirm(`Delete the sleep entry for ${entry.date}?`)) return; setError(""); try { await api.deleteSleep(entry.id); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete sleep entry"); } };
  return <div>
    <PageHeader eyebrow="Recovery" title="Sleep" description="See how better nights shape stronger days." action={<PillButton onClick={() => open()} className="bg-ink text-white"><Plus size={16}/>Log sleep</PillButton>}/>
    {error && !editing && <p className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}
    {!summary && !error ? <div className="h-80 animate-pulse rounded-card bg-white"/> : summary ? <>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <Card className="p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-muted">Seven-day sleep</p><p className="mt-2 text-[38px] font-bold tracking-[-.05em]">{duration(summary.averageMinutes)} <span className="text-base text-muted">average</span></p></div><p className={`text-xs font-bold ${summary.trendMinutes >= 0 ? "text-[#2ba75c]" : "text-coral"}`}>{summary.trendMinutes >= 0 ? "+" : ""}{Math.round(summary.trendMinutes)}m vs prior week</p></div>
          <div className="mt-7 h-64"><ResponsiveContainer><BarChart data={chart}><CartesianGrid vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis hide domain={[0, 10]}/><Tooltip contentStyle={{ background:"var(--chart-tooltip)",border:"1px solid var(--chart-tooltip-border)",borderRadius: 14 }}/><Bar dataKey="hours" fill="#765bd6" radius={[9,9,9,9]}/></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="bg-[#f1efff] p-7 shadow-none"><MoonStar className="text-[#765bd6]" fill="currentColor"/><p className="mt-8 text-sm font-semibold text-muted">Last night</p><p className="mt-1 text-[42px] font-bold tracking-[-.05em]">{duration(summary.lastNightMinutes)}</p><p className="mt-2 text-sm text-muted">Average quality {summary.averageQuality.toFixed(1)} / 5</p><div className="mt-8 flex gap-2">{[1,2,3,4,5].map(i => <span key={i} className={`h-9 flex-1 rounded-xl ${i <= Math.round(summary.averageQuality) ? "bg-[#765bd6]" : "bg-white/70"}`}/>)}</div></Card>
      </div>
      <Card className="mt-4 p-7"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Sleep history</h2><p className="mt-1 text-sm text-muted">Your recent recovery entries</p></div></div>
        {!summary.history.length ? <div className="mt-6 rounded-[22px] bg-[#f7f7f4] px-6 py-12 text-center"><MoonStar className="mx-auto text-muted"/><h3 className="mt-4 font-bold">No sleep entries yet</h3><p className="mt-2 text-sm text-muted">Log your first night to begin seeing recovery trends.</p><PillButton onClick={() => open()} className="mt-5 bg-ink text-white">Log sleep</PillButton></div> : <div className="mt-5 divide-y divide-black/[.055]">{summary.history.map(entry => <div key={entry.id} className="group flex flex-wrap items-center gap-4 py-4"><span className="grid size-11 place-items-center rounded-2xl bg-[#f1efff] text-[#765bd6]"><Check size={17}/></span><div className="min-w-[180px] flex-1"><p className="font-bold">{new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"short"})}</p><p className="text-xs text-muted">{new Date(entry.startedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} – {new Date(entry.endedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} · Quality {entry.quality}/5</p></div><p className="font-bold">{duration(entry.durationMinutes)}</p><button onClick={() => open(entry)} className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Edit sleep"><Pencil size={15}/></button><button onClick={() => remove(entry)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-[#fff1ef] hover:text-coral" aria-label="Delete sleep"><Trash2 size={15}/></button></div>)}</div>}
      </Card>
    </> : null}
    {editing && <Modal title={editing === "new" ? "Log sleep" : "Edit sleep"} onClose={() => setEditing(null)}><div className="space-y-4"><FormField label="Bedtime"><input className={inputClass} type="datetime-local" value={form.startedAt} onChange={e => setForm({...form,startedAt:e.target.value})}/></FormField><FormField label="Wake time"><input className={inputClass} type="datetime-local" value={form.endedAt} onChange={e => setForm({...form,endedAt:e.target.value})}/></FormField><FormField label="Sleep quality"><div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map(i => <button key={i} onClick={() => setForm({...form,quality:i})} className={`h-11 rounded-2xl text-sm font-bold ${i <= form.quality ? "bg-[#765bd6] text-white" : "bg-[#f4f4f1]"}`}>{i}</button>)}</div></FormField><FormField label="Notes (optional)"><textarea className={`${inputClass} h-24 py-3`} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="How did you sleep?"/></FormField>{error && <p className="text-sm font-semibold text-coral">{error}</p>}<PillButton disabled={saving || !form.startedAt || !form.endedAt} onClick={save} className="w-full bg-ink text-white">{saving ? "Saving…" : "Save sleep entry"}</PillButton></div></Modal>}
  </div>;
}
