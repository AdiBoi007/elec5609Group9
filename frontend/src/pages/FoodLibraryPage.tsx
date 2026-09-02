import { useEffect, useMemo, useState } from "react";
import { Apple, Plus, ScanLine, Search, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { Card, FormField, inputClass, Modal, PageHeader, PillButton } from "../components/ui";
import { api } from "../services/api";
import type { FoodLookup } from "../types";

const emptyFood = { name: "", servingSize: 100, servingUnit: "g", calories: 0, protein: 0, carbohydrates: 0, fat: 0, fibre: 0 };

export default function FoodLibraryPage() {
  const [foods, setFoods] = useState<FoodLookup[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodLookup | null>(null);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [form, setForm] = useState(emptyFood);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api.getFoods().then(setFoods).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load foods")).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => foods.filter((food) => `${food.name} ${food.brand ?? ""}`.toLowerCase().includes(query.toLowerCase())), [foods, query]);
  const save = async () => {
    setSaving(true); setError("");
    try { const food = await api.createFood(form); setFoods((current) => [food, ...current]); setSelected(food); setCreating(false); setForm(emptyFood); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create food"); }
    finally { setSaving(false); }
  };
  return <div>
    <PageHeader eyebrow="Nutrition" title="Food Library" description="Search persisted foods, inspect serving nutrition, scan a barcode or create a reusable custom food." action={<div className="flex gap-2"><PillButton onClick={() => setScanning(true)} className="bg-surface text-ink shadow-sm"><ScanLine size={16}/>Scan</PillButton><PillButton onClick={() => setCreating(true)} className="bg-ink text-white"><Plus size={16}/>Custom food</PillButton></div>}/>
    {error && <p role="alert" className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}
    <Card className="p-5 md:p-6"><label className="flex h-12 items-center gap-3 rounded-2xl bg-surface-muted px-4"><Search size={18} className="text-muted"/><span className="sr-only">Search foods</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search foods and brands"/></label>
      {loading ? <div className="mt-5 h-64 animate-pulse rounded-2xl bg-surface-muted"/> : <div className="mt-5 divide-y divide-line">{visible.map((food) => <button key={food.id} type="button" onClick={() => setSelected(food)} className="grid w-full gap-2 py-4 text-left sm:grid-cols-[1fr_auto] sm:items-center"><span><span className="block font-bold">{food.name}</span><span className="mt-1 block text-xs text-muted">{food.brand || "Circle custom food"} · {food.servingSize} {food.servingUnit}</span></span><span className="text-xs font-bold">{Math.round(food.calories)} kcal · {Math.round(food.protein)}P · {Math.round(food.carbohydrates)}C · {Math.round(food.fat)}F</span></button>)}{!visible.length && <p className="py-14 text-center text-sm text-muted">No foods match that search.</p>}</div>}
    </Card>
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-surface-muted px-3 py-1.5">{selected.servingSize} {selected.servingUnit}</span><span className="rounded-full bg-surface-muted px-3 py-1.5">{selected.measurementType.toLowerCase()}</span></div><div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-4">{[["Calories", selected.calories, "kcal"], ["Protein", selected.protein, "g"], ["Carbs", selected.carbohydrates, "g"], ["Fat", selected.fat, "g"]].map(([label, value, unit]) => <div key={String(label)} className="bg-surface p-4"><p className="text-[10px] font-bold uppercase text-muted">{label}</p><p className="mt-1 text-lg font-bold">{Math.round(Number(value))} <span className="text-[10px] text-muted">{unit}</span></p></div>)}</div>{selected.compatibility.warnings.length > 0 && <div className="mt-4 rounded-2xl bg-[#fff6e8] p-4 text-xs leading-5 text-warning">{selected.compatibility.warnings.join(" · ")}</div>}<Link to={`/log?tab=meal&food=${encodeURIComponent(selected.name)}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"><Utensils size={16}/>Log this food</Link></Modal>}
    {creating && <Modal title="Create custom food" onClose={() => setCreating(false)}><div className="grid gap-4"><FormField label="Food name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></FormField><div className="grid grid-cols-2 gap-3"><FormField label="Serving size"><input type="number" min="0.1" className={inputClass} value={form.servingSize} onChange={(event) => setForm({ ...form, servingSize: Number(event.target.value) })}/></FormField><FormField label="Unit"><input className={inputClass} value={form.servingUnit} onChange={(event) => setForm({ ...form, servingUnit: event.target.value })}/></FormField></div><div className="grid grid-cols-2 gap-3">{(["calories", "protein", "carbohydrates", "fat", "fibre"] as const).map((key) => <FormField key={key} label={key === "carbohydrates" ? "Carbohydrates" : key[0].toUpperCase() + key.slice(1)}><input type="number" min="0" step="0.1" className={inputClass} value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })}/></FormField>)}</div><PillButton disabled={saving || !form.name.trim()} onClick={() => void save()} className="w-full bg-ink text-white"><Apple size={16}/>{saving ? "Saving…" : "Save custom food"}</PillButton></div></Modal>}
    {scanning && <Modal title="Scan a food" onClose={() => setScanning(false)}><BarcodeScanner onCancel={() => setScanning(false)} onSelected={(food) => { setScanning(false); setSelected(food); }}/></Modal>}
  </div>;
}
