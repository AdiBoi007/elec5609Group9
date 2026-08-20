import { useState } from "react";
import { ChevronRight, Droplets, Dumbbell, Moon, ScanLine, Scale, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { DetailDrawer } from "./ui";

const actions = [
  { label: "Log a meal", detail: "Foods, servings and macros", type: "Meal", icon: Utensils, color: "bg-[#fff1ef] text-coral" },
  { label: "Log a workout", detail: "Exercises, sets and duration", type: "Workout", icon: Dumbbell, color: "bg-[#eeeaff] text-violet" },
  { label: "Log sleep", detail: "Duration and recovery quality", type: "Sleep", icon: Moon, color: "bg-[#f1edff] text-violet" },
  { label: "Log body measurement", detail: "Weight and measurements", type: "Body", icon: Scale, color: "bg-[#e9ffef] text-green" },
];

export function QuickLogDrawer({ open, onClose, onWaterAdded }: { open: boolean; onClose: () => void; onWaterAdded?: () => void }) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!open) return null;
  const go = (to: string) => { onClose(); navigate(to); };
  const addWater = async (amount: number) => {
    setSaving(amount); setError(""); setMessage("");
    try { await api.addWater(amount); setMessage(`${amount} ml added to today.`); onWaterAdded?.(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to log water"); }
    finally { setSaving(null); }
  };
  return <DetailDrawer title="Quick log" eyebrow="Today" onClose={onClose} footer={<button type="button" onClick={() => go("/log")} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white">Open full logging page <ChevronRight size={15}/></button>}>
    <p className="text-sm leading-6 text-muted">Record the essentials without losing your place.</p>
    {(message || error) && <div role="status" className={`mt-4 rounded-2xl p-3 text-sm font-semibold ${error ? "bg-[#fff1ef] text-coral" : "bg-[#e9ffef] text-green"}`}>{error || message}</div>}
    <div className="mt-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Water</p>
      <div className="mt-2 grid grid-cols-3 gap-2">{[250, 500, 750].map(amount => <button key={amount} type="button" disabled={saving !== null} onClick={() => void addWater(amount)} className="rounded-2xl bg-[#eaf8ff] p-3 text-left text-cyan transition hover:-translate-y-0.5 disabled:opacity-50"><Droplets size={17}/><span className="mt-3 block text-sm font-bold">{saving === amount ? "Adding…" : `+${amount} ml`}</span></button>)}</div>
    </div>
    <div className="mt-6 divide-y divide-black/[0.06]">{actions.map(({ label, detail, type, icon: Icon, color }) => <button key={type} type="button" onClick={() => go(`/log?type=${type}`)} className="flex w-full items-center gap-3 py-3.5 text-left"><span className={`grid size-10 place-items-center rounded-2xl ${color}`}><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-muted">{detail}</span></span><ChevronRight size={16} className="text-muted"/></button>)}</div>
    <button type="button" onClick={() => go("/log?type=Meal&scan=1")} className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-black/[0.07] p-3.5 text-left"><span className="grid size-10 place-items-center rounded-2xl bg-[#f1f1ee]"><ScanLine size={18}/></span><span className="flex-1"><span className="block text-sm font-semibold">Scan a food barcode</span><span className="block text-xs text-muted">Open the camera or enter it manually</span></span><ChevronRight size={16} className="text-muted"/></button>
  </DetailDrawer>;
}
