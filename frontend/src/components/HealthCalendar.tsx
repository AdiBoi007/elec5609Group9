import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleMinus, Droplets, Dumbbell, MoonStar, Target, Utensils, X } from "lucide-react";
import { api } from "../services/api";
import type { CalendarDay, CalendarMonth, DailyStatus } from "../types";
import { Card, DetailDrawer, PillButton } from "./ui";

const statusMeta: Record<DailyStatus, { label: string; short: string; cell: string; badge: string; icon: typeof Check }> = {
  ON_TRACK: { label: "On track", short: "On track", cell: "border-[#c8efd5] bg-[#effbf3]", badge: "bg-[#daf5e3] text-[#218c49]", icon: Check },
  PARTIAL: { label: "Partially on track", short: "Partial", cell: "border-[#f5ddb0] bg-[#fff8e9]", badge: "bg-[#ffedc9] text-[#a86c10]", icon: AlertTriangle },
  OFF_TRACK: { label: "Off track", short: "Off track", cell: "border-[#ffd2ca] bg-[#fff3f0]", badge: "bg-[#ffe1dc] text-[#c9503d]", icon: X },
  NO_DATA: { label: "No data", short: "No data", cell: "border-black/[.055] bg-[#fafaf8]", badge: "bg-[#eeeeeb] text-muted", icon: CircleMinus },
};
const categoryMeta = [
  { key: "nutrition", label: "Nutrition", icon: Utensils },
  { key: "hydration", label: "Hydration", icon: Droplets },
  { key: "sleep", label: "Sleep", icon: MoonStar },
  { key: "activity", label: "Activity", icon: Dumbbell },
] as const;
const statusDot: Record<DailyStatus, string> = { ON_TRACK: "bg-[#35b766]", PARTIAL: "bg-[#e2a22d]", OFF_TRACK: "bg-[#e76753]", NO_DATA: "bg-[#d5d5d0]" };
const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
const monthDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export function HealthCalendar() {
  const [cursor, setCursor] = useState(() => monthDate(new Date()));
  const [data, setData] = useState<CalendarMonth | null>(null);
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null); setError(""); setSelected(null);
    api.getHealthCalendar(cursor.getFullYear(), cursor.getMonth() + 1).then(setData).catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load health calendar"));
  }, [cursor]);
  const leadingDays = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay(), [cursor]);
  const today = new Date();
  const isCurrentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
  const move = (months: number) => setCursor(current => new Date(current.getFullYear(), current.getMonth() + months, 1));
  return <Card className="mt-4 overflow-hidden">
    <div className="border-b border-black/[.05] p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-muted">Health adherence</p><h2 className="mt-1 text-xl font-bold tracking-[-.03em] md:text-2xl">Your month at a glance</h2><p className="mt-1 text-sm text-muted">Select a day to see what shaped its score.</p></div><div className="flex flex-wrap items-center gap-2"><PillButton onClick={()=>move(-1)} className="min-h-10 bg-[#f2f2ef] px-3 text-ink" aria-label="Previous month"><ChevronLeft size={16}/></PillButton><div className="min-w-32 text-center text-sm font-bold">{cursor.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</div><PillButton onClick={()=>move(1)} className="min-h-10 bg-[#f2f2ef] px-3 text-ink" aria-label="Next month"><ChevronRight size={16}/></PillButton><PillButton disabled={isCurrentMonth} onClick={()=>setCursor(monthDate(new Date()))} className="min-h-10 bg-ink px-4 text-white">Today</PillButton></div></div>
      {data&&<div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-black/[.055] md:grid-cols-4">{[["On track",data.summary.onTrackDays,"text-[#218c49]"],["Partial",data.summary.partialDays,"text-[#a86c10]"],["Off track",data.summary.offTrackDays,"text-coral"],["Current streak",data.summary.currentStreak,"text-violet"]].map(([label,value,tone])=><div key={String(label)} className="border-b border-r border-black/[.055] px-4 py-3 last:border-r-0 md:border-b-0"><p className={`text-xl font-bold ${tone}`}>{value}</p><p className="mt-0.5 text-[11px] font-semibold text-muted">{label} · days</p></div>)}</div>}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">{(Object.keys(statusMeta) as DailyStatus[]).map(status=>{const meta=statusMeta[status];const Icon=meta.icon;return <span key={status} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted"><span className={`grid size-4 place-items-center rounded-full ${meta.badge}`}><Icon size={9}/></span>{meta.label}</span>;})}</div>
    </div>
    <div className="overflow-x-auto p-3 sm:p-4 md:p-5">
      {error&&<p className="rounded-[20px] bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}
      {!data&&!error?<div className="h-[430px] animate-pulse rounded-[22px] bg-[#f4f4f1]"/>:data?<div className="min-w-[620px]">
        <div className="grid grid-cols-7 gap-1.5">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=><div key={day} className="px-1 pb-2 text-center text-[9px] font-bold uppercase tracking-[.1em] text-muted">{day}</div>)}{Array.from({length:leadingDays}).map((_,index)=><div key={`blank-${index}`} aria-hidden="true"/>)}{data.days.map(day=>{const meta=statusMeta[day.status];const Icon=meta.icon;const date=new Date(`${day.date}T00:00:00`);const isToday=day.date===`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;return <button key={day.date} onClick={()=>setSelected(day)} aria-label={`${date.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}: ${meta.label}${day.status!=="NO_DATA"?`, ${day.score} percent`:""}`} className={`group min-h-[78px] rounded-[14px] border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md md:min-h-[88px] ${meta.cell} ${isToday?"ring-2 ring-ink ring-offset-1":""}`}><div className="flex items-start justify-between"><span className="text-xs font-bold">{date.getDate()}</span><span className={`grid size-4 place-items-center rounded-full ${meta.badge}`}><Icon size={9}/></span></div><p className="mt-2 text-base font-bold">{day.status==="NO_DATA"?"—":`${day.score}%`}</p><div className="mt-2 flex gap-1">{categoryMeta.map(({key,label})=><span key={key} title={`${label}: ${statusMeta[day[key].status].label}`} aria-label={`${label}: ${statusMeta[day[key].status].label}`} className={`size-1.5 rounded-full ${statusDot[day[key].status]}`}/>)}</div></button>;})}</div>
      </div>:null}
    </div>
    {selected&&<DayDetail day={selected} onClose={()=>setSelected(null)}/>}
  </Card>;
}

function DayDetail({day,onClose}:{day:CalendarDay;onClose:()=>void}) {
  const meta=statusMeta[day.status]; const StatusIcon=meta.icon; const date=new Date(`${day.date}T00:00:00`);
  const rows = [
    { icon: Utensils, tone:"bg-[#fff1ef] text-coral", title:"Nutrition", status:day.nutrition.status, lines:[`Calories ${Math.round(day.nutrition.calories).toLocaleString()} / ${day.nutrition.calorieTarget.toLocaleString()} kcal`,`Protein ${Math.round(day.nutrition.protein)} / ${day.nutrition.proteinTarget} g`,`Carbs ${Math.round(day.nutrition.carbohydrates)} / ${day.nutrition.carbohydrateTarget} g · Fat ${Math.round(day.nutrition.fat)} / ${day.nutrition.fatTarget} g`] },
    { icon: Droplets, tone:"bg-[#eaf8ff] text-cyan", title:"Hydration", status:day.hydration.status, lines:[`${(day.hydration.amountMl/1000).toFixed(1)} / ${(day.hydration.targetMl/1000).toFixed(1)} L`] },
    { icon: MoonStar, tone:"bg-[#f1efff] text-[#765bd6]", title:"Sleep", status:day.sleep.status, lines:day.sleep.status==="NO_DATA"?["No sleep logged"]:[formatMinutes(day.sleep.minutes),`Quality ${day.sleep.quality.toFixed(1)} / 5`] },
    { icon: Dumbbell, tone:"bg-[#eeeaff] text-violet", title:"Activity", status:day.activity.status, lines:day.activity.entries.length?day.activity.entries.map(item=>`${item.name} · ${item.durationMinutes} min`):["No workout logged · neutral"] },
  ];
  return <DetailDrawer title={date.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})} eyebrow="Daily adherence" onClose={onClose}>
    <div className={`rounded-[22px] p-5 ${meta.cell}`}><div className="flex items-center justify-between"><div><p className="text-[38px] font-bold tracking-[-.05em]">{day.status==="NO_DATA"?"—":`${day.score}%`}</p><p className="text-xs font-bold uppercase tracking-[.12em]">{meta.label}</p></div><span className={`grid size-12 place-items-center rounded-full ${meta.badge}`}><StatusIcon size={21}/></span></div></div>
    <div className="mt-4 space-y-2">{rows.map(({icon:Icon,tone,title,status,lines})=><div key={title} className="rounded-[20px] bg-[#f7f7f4] p-4"><div className="flex items-start gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-[13px] ${tone}`}><Icon size={16}/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="font-bold">{title}</p><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusMeta[status].badge}`}>{statusMeta[status].short}</span></div>{lines.map(line=><p key={line} className="mt-1 text-xs leading-5 text-muted">{line}</p>)}</div></div></div>)}</div>
    {day.body&&(day.body.weight!=null||day.body.bodyFatPercentage!=null||day.body.waistCm!=null)&&<div className="mt-2 rounded-[20px] bg-[#f7f7f4] p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[13px] bg-white"><Target size={16}/></span><div><p className="font-bold">Body</p><p className="mt-1 text-xs text-muted">{[day.body.weight!=null&&`${day.body.weight.toFixed(1)} kg`,day.body.bodyFatPercentage!=null&&`${day.body.bodyFatPercentage.toFixed(1)}% body fat`,day.body.waistCm!=null&&`${day.body.waistCm.toFixed(1)} cm waist`].filter(Boolean).join(" · ")}</p></div></div></div>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><InsightList title="What went well" items={day.wins} tone="bg-[#effbf3]" empty="No positive signals recorded."/><InsightList title="Needs attention" items={day.attentionAreas} tone="bg-[#fff8e9]" empty="Nothing flagged from recorded data."/></div>
  </DetailDrawer>;
}
function InsightList({title,items,tone,empty}:{title:string;items:string[];tone:string;empty:string}) { return <div className={`rounded-[20px] p-4 ${tone}`}><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">{title}</p><ul className="mt-3 space-y-2">{items.length?items.map(item=><li key={item} className="flex gap-2 text-xs leading-5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink"/>{item}</li>):<li className="text-xs leading-5 text-muted">{empty}</li>}</ul></div>; }
