import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  Minus,
  Plus,
  ScanLine,
} from "lucide-react";
import { inputClass, PillButton } from "./ui";
import { api } from "../services/api";
import type { ApiMeal, FoodLookup } from "../types";

type Props = {
  onAdded?: (meal: ApiMeal) => void;
  onSelected?: (food: FoodLookup, quantity: number, unit: string) => void;
  onCancel: () => void;
};

const sameUnit = (left?: string, right?: string) =>
  left?.toLowerCase() === right?.toLowerCase();
const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export function BarcodeScanner({ onAdded, onSelected, onCancel }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [barcode, setBarcode] = useState("");
  const [food, setFood] = useState<FoodLookup | null>(null);
  const [amount, setAmount] = useState(100);
  const [unit, setUnit] = useState("g");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "camera" || food) return;
    let active = true;
    let controls: { stop: () => void } | undefined;
    const reader = new BrowserMultiFormatOneDReader();
    reader
      .decodeFromVideoDevice(undefined, video.current!, async (result) => {
        if (!active || !result) return;
        controls?.stop();
        await resolve(result.getText());
      })
      .then((value) => {
        controls = value;
      })
      .catch((reason) =>
        setError(
          reason?.name === "NotAllowedError"
            ? "Camera permission was denied. Use manual barcode entry below."
            : "Camera is unavailable. You can enter the barcode manually.",
        ),
      );
    return () => {
      active = false;
      controls?.stop();
    };
  }, [mode, food]);

  const resolve = async (value = barcode) => {
    const normalized = value.trim();
    if (!/^\d{6,14}$/.test(normalized)) {
      setError("Enter a valid 6–14 digit EAN or UPC barcode.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const found = await api.lookupBarcode(normalized);
      const basisUnit = found.nutritionBasisUnit || found.servingUnit || "g";
      const suggestedMatches =
        found.suggestedServingQuantity &&
        sameUnit(found.suggestedServingUnit, basisUnit);
      const packageMatches =
        found.packageQuantity && sameUnit(found.packageUnit, basisUnit);
      setFood(found);
      setUnit(basisUnit);
      setAmount(
        suggestedMatches
          ? found.suggestedServingQuantity!
          : packageMatches
            ? found.packageQuantity!
            : found.nutritionBasisQuantity || found.servingSize || 100,
      );
      setBarcode(normalized);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Barcode not found. You can still log food manually.",
      );
    } finally {
      setLoading(false);
    }
  };

  const basisQuantity =
    food?.nutritionBasisQuantity || food?.servingSize || 100;
  const basisUnit = food?.nutritionBasisUnit || food?.servingUnit || "g";
  const quantityForCalculation = useMemo(() => {
    if (!food) return amount;
    if (
      unit === "serving" &&
      basisUnit !== "serving" &&
      food.suggestedServingQuantity &&
      sameUnit(food.suggestedServingUnit, basisUnit)
    )
      return amount * food.suggestedServingQuantity;
    return amount;
  }, [amount, basisUnit, food, unit]);
  const multiplier = food ? quantityForCalculation / basisQuantity : 1;
  const compatiblePackage = Boolean(
    food?.packageQuantity && sameUnit(food.packageUnit, basisUnit),
  );
  const displayedUnit = unit === "serving" && amount !== 1 ? "servings" : unit;
  const persistedUnit =
    food?.measurementType === "UNKNOWN" && unit !== "serving"
      ? unit
      : basisUnit;

  const add = async () => {
    if (!food) return;
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 100000 ||
      quantityForCalculation > 100000
    ) {
      setError("Enter an amount between 1 and 100,000.");
      return;
    }
    if (onSelected) {
      onSelected(food, quantityForCalculation, persistedUnit);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const meal = await api.logMeal({
        name: food.name,
        mealType: "Snack",
        reusable: false,
        foods: [
          {
            foodId: food.id,
            quantity: quantityForCalculation,
            unit: persistedUnit,
          },
        ],
      });
      onAdded?.(meal);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add food");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!food && (
        <>
          <div className="overflow-hidden rounded-[20px] bg-ink text-white">
            {mode === "camera" ? (
              <div className="relative aspect-video">
                <video
                  ref={video}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80">
                  <ScanLine className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80" />
                </div>
              </div>
            ) : (
              <div className="grid aspect-video place-items-center">
                <Keyboard size={38} className="text-white/70" />
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("camera")}
              className={`rounded-xl p-2.5 text-xs font-bold ${mode === "camera" ? "bg-ink text-white" : "bg-[#f2f2ef]"}`}
            >
              <Camera size={14} className="mr-2 inline" />
              Camera
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-xl p-2.5 text-xs font-bold ${mode === "manual" ? "bg-ink text-white" : "bg-[#f2f2ef]"}`}
            >
              <Keyboard size={14} className="mr-2 inline" />
              Manual
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              inputMode="numeric"
              className={inputClass}
              value={barcode}
              onChange={(event) =>
                setBarcode(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Enter EAN / UPC barcode"
            />
            <PillButton
              disabled={loading || !barcode}
              onClick={() => void resolve()}
              className="bg-ink text-white"
            >
              {loading ? "Looking…" : "Look up"}
            </PillButton>
          </div>
        </>
      )}

      {food && (
        <div>
          <div className="border-b border-black/[0.06] pb-4">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-coral">
              {food.brand || "Barcode result"}
            </p>
            <h3 className="mt-1 text-2xl font-bold tracking-[-.03em]">
              {food.name}
            </h3>
            <p className="mt-1 text-xs text-muted">Barcode {barcode}</p>
            <CompatibilityNotice compatibility={food.compatibility} />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                Nutrition basis
              </p>
              <p className="mt-1 text-sm font-bold">
                Per {formatNumber(basisQuantity)} {basisUnit}
              </p>
            </div>
            <span className="rounded-full bg-[#f1f1ee] px-3 py-1 text-[10px] font-bold text-muted">
              {food.measurementType.replace("_", " ")}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-2xl border border-black/[0.06]">
            {[
              ["Calories", food.calories, "kcal"],
              ["Protein", food.protein, "g"],
              ["Carbs", food.carbohydrates, "g"],
              ["Fat", food.fat, "g"],
            ].map(([label, value, suffix]) => (
              <div
                key={String(label)}
                className="border-r border-black/[0.06] p-3 last:border-r-0"
              >
                <p className="text-[9px] font-bold uppercase text-muted">
                  {label}
                </p>
                <p className="mt-1 text-base font-bold">
                  {formatNumber(Number(value))}
                  <span className="ml-0.5 text-[9px] text-muted">{suffix}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[18px] bg-[#f7f7f4] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                  Amount consumed
                </p>
                <p className="mt-1 text-xl font-bold">
                  {formatNumber(amount)} {displayedUnit}
                </p>
              </div>
              <p className="text-right text-xs text-muted">
                {Math.round(food.calories * multiplier)} kcal
                <br />
                <span className="font-semibold text-ink">
                  {formatNumber(food.protein * multiplier)}g protein
                </span>
              </p>
            </div>
            {compatiblePackage && (
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {[
                  ["¼", 0.25],
                  ["½", 0.5],
                  ["¾", 0.75],
                  [
                    food.measurementType === "LIQUID"
                      ? "Full bottle"
                      : "Full pack",
                    1,
                  ],
                ].map(([label, fraction]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => {
                      setUnit(basisUnit);
                      setAmount(
                        Math.round(
                          food.packageQuantity! * Number(fraction) * 100,
                        ) / 100,
                      );
                    }}
                    className="rounded-xl bg-white px-2 py-2 text-[10px] font-bold transition hover:bg-ink hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setAmount((current) =>
                    Math.max(
                      unit === "serving" ? 1 : 1,
                      current - (unit === "serving" ? 1 : 10),
                    ),
                  )
                }
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-white"
                aria-label="Decrease amount"
              >
                <Minus size={15} />
              </button>
              <input
                aria-label="Amount consumed"
                type="number"
                min="0.1"
                max="100000"
                step={unit === "serving" ? 1 : 1}
                className={`${inputClass} min-w-0 text-center font-bold`}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
              {food.measurementType === "UNKNOWN" ? (
                <select
                  aria-label="Amount unit"
                  className={`${inputClass} w-28`}
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                >
                  <option value="g">g</option>
                  <option value="mL">mL</option>
                  {food.suggestedServingQuantity && (
                    <option value="serving">serving</option>
                  )}
                </select>
              ) : (
                <span className="grid h-11 min-w-16 place-items-center rounded-xl bg-white px-3 text-sm font-bold">
                  {displayedUnit}
                </span>
              )}
              <button
                type="button"
                onClick={() =>
                  setAmount(
                    (current) => current + (unit === "serving" ? 1 : 10),
                  )
                }
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-white"
                aria-label="Increase amount"
              >
                <Plus size={15} />
              </button>
            </div>
            {food.measurementType === "UNKNOWN" && (
              <p className="mt-3 text-[11px] leading-4 text-muted">
                Package units were unavailable. Choose the unit shown on the
                product label; nutrition remains scaled from the declared{" "}
                {basisQuantity} {basisUnit} basis.
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              ["Calories", food.calories * multiplier, "kcal"],
              ["Protein", food.protein * multiplier, "g"],
              ["Carbs", food.carbohydrates * multiplier, "g"],
              ["Fat", food.fat * multiplier, "g"],
            ].map(([label, value, suffix]) => (
              <div key={String(label)}>
                <p className="text-[9px] font-bold uppercase text-muted">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {formatNumber(Number(value))}
                  {suffix}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <PillButton
              onClick={() => setFood(null)}
              className="flex-1 bg-[#f2f2ef] text-ink"
            >
              Scan another
            </PillButton>
            <PillButton
              disabled={loading || amount <= 0}
              onClick={() => void add()}
              className="flex-1 bg-ink text-white"
            >
              {loading
                ? "Adding…"
                : onSelected
                  ? "Add to meal"
                  : "Add to nutrition"}
            </PillButton>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 w-full text-center text-sm font-semibold text-muted"
      >
        Cancel
      </button>
    </div>
  );
}

function CompatibilityNotice({
  compatibility,
}: {
  compatibility?: FoodLookup["compatibility"];
}) {
  if (!compatibility || compatibility.status === "UNKNOWN")
    return (
      <div className="mt-3 flex gap-2 rounded-xl bg-[#f7f7f4] p-3 text-xs leading-5 text-muted">
        <HelpCircle size={15} className="mt-0.5 shrink-0" />
        <span>
          Dietary compatibility could not be fully verified from the available
          ingredient metadata.
        </span>
      </div>
    );
  if (compatibility.status === "CONFLICT")
    return (
      <div className="mt-3 flex gap-2 rounded-xl bg-[#fff1ef] p-3 text-xs leading-5 text-coral">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>
          <strong>Preference warning.</strong>{" "}
          {compatibility.warnings.join(" ")} Check the product label before
          deciding whether to log it.
        </span>
      </div>
    );
  return (
    <div className="mt-3 flex gap-2 rounded-xl bg-[#e4f6e9] p-3 text-xs font-semibold text-[#218c49]">
      <CheckCircle2 size={15} className="shrink-0" />
      <span>No conflict was found in the available ingredient metadata.</span>
    </div>
  );
}
