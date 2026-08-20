import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Check, ChefHat, Heart, Leaf, Save, ShieldCheck, Utensils } from "lucide-react";
import type { DietaryProfile, UserProfile } from "../types";
import { Card, FormField, inputClass, PillButton } from "./ui";

const defaultDietaryProfile = (): DietaryProfile => ({
  dietaryPattern: "OMNIVORE", customDietaryPattern: "", restrictions: [], customExclusions: [],
  culturalPreferences: [], customCulturalPreferences: [], allergies: [], customAllergies: [],
  intolerances: [], customIntolerances: [], favouriteFoods: [], dislikedFoods: [], preferredCuisines: [],
  preferredProteinSources: [], customProteinSources: [], preferredMealsPerDay: 3,
  mealPrepDifficulty: "EASY", mealPrepTime: "MIN_15_30", budgetPreference: "MODERATE",
});

const patterns = [["OMNIVORE","Omnivore / Non-Vegetarian"],["VEGETARIAN","Vegetarian"],["VEGAN","Vegan"],["PESCATARIAN","Pescatarian"],["EGGETARIAN","Eggetarian"],["FLEXITARIAN","Flexitarian"],["CUSTOM","Other / Custom"]] as const;
const restrictions = [["NO_BEEF","No beef"],["NO_PORK","No pork"],["NO_POULTRY","No poultry"],["NO_RED_MEAT","No red meat"],["NO_SEAFOOD","No seafood"],["NO_EGGS","No eggs"],["DAIRY_FREE","Dairy-free"],["GLUTEN_FREE","Gluten-free"],["NUT_FREE","Nut-free"],["SOY_FREE","Soy-free"]] as const;
const cultural = [["HALAL","Halal preference"],["KOSHER","Kosher preference"],["JAIN","Jain"],["CUSTOM","Other / Custom"]] as const;
const allergies = [["PEANUTS","Peanuts"],["TREE_NUTS","Tree nuts"],["MILK","Milk"],["EGGS","Eggs"],["WHEAT","Wheat"],["SOY","Soy"],["FISH","Fish"],["SHELLFISH","Shellfish"],["SESAME","Sesame"]] as const;
const intolerances = [["LACTOSE","Lactose"],["GLUTEN","Gluten"]] as const;
const cuisines = ["INDIAN","MEDITERRANEAN","CHINESE","JAPANESE","KOREAN","THAI","ITALIAN","MEXICAN","MIDDLE_EASTERN","WESTERN","OTHER"];
const proteins = ["CHICKEN","BEEF","FISH","EGGS","DAIRY","TOFU","TEMPEH","LENTILS","BEANS","CHICKPEAS","SEITAN","PROTEIN_POWDER"];
const label = (value:string) => value.toLowerCase().replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());
const split = (value:string) => value.split(",").map(item=>item.trim()).filter(Boolean);

export function DietaryPreferencesEditor({profile,onChange,onSave,saving,saved}:{profile:UserProfile;onChange:(profile:UserProfile)=>void;onSave:()=>void;saving:boolean;saved:boolean}) {
  const dietary = profile.dietaryProfile ?? defaultDietaryProfile();
  const update = (changes:Partial<DietaryProfile>) => onChange({...profile,dietaryProfile:{...dietary,...changes}});
  const toggle = (key:keyof DietaryProfile,value:string) => {
    const current = dietary[key] as string[];
    update({[key]:current.includes(value)?current.filter(item=>item!==value):[...current,value]} as Partial<DietaryProfile>);
  };
  const allowedProteins = proteins.filter(source => {
    if (dietary.dietaryPattern==="VEGAN"&&["CHICKEN","BEEF","FISH","EGGS","DAIRY"].includes(source)) return false;
    if (["VEGETARIAN","EGGETARIAN"].includes(dietary.dietaryPattern)&&["CHICKEN","BEEF","FISH"].includes(source)) return false;
    if (dietary.dietaryPattern==="PESCATARIAN"&&["CHICKEN","BEEF"].includes(source)) return false;
    if (dietary.restrictions.includes("NO_POULTRY")&&source==="CHICKEN") return false;
    if ((dietary.restrictions.includes("NO_BEEF")||dietary.restrictions.includes("NO_RED_MEAT"))&&source==="BEEF") return false;
    if (dietary.restrictions.includes("NO_SEAFOOD")&&source==="FISH") return false;
    if (dietary.restrictions.includes("NO_EGGS")&&source==="EGGS") return false;
    if (dietary.restrictions.includes("DAIRY_FREE")&&source==="DAIRY") return false;
    if (dietary.restrictions.includes("SOY_FREE")&&["TOFU","TEMPEH"].includes(source)) return false;
    if (dietary.restrictions.includes("GLUTEN_FREE")&&source==="SEITAN") return false;
    if (dietary.allergies.includes("EGGS")&&source==="EGGS") return false;
    if ((dietary.allergies.includes("MILK")||dietary.intolerances.includes("LACTOSE"))&&source==="DAIRY") return false;
    if (dietary.allergies.includes("FISH")&&source==="FISH") return false;
    if (dietary.allergies.includes("SOY")&&["TOFU","TEMPEH"].includes(source)) return false;
    if ((dietary.allergies.includes("WHEAT")||dietary.intolerances.includes("GLUTEN"))&&source==="SEITAN") return false;
    if (dietary.culturalPreferences.includes("JAIN")&&["CHICKEN","BEEF","FISH","EGGS"].includes(source)) return false;
    return true;
  });
  return <Card className="mt-4 overflow-hidden">
    <div className="border-b border-black/[.055] p-7 md:p-8"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-[18px] bg-[#edf9f0] text-[#218c49]"><Leaf size={21}/></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#218c49]">Nutrition profile</p><h2 className="mt-2 text-2xl font-bold tracking-[-.035em]">Nutrition & Diet Preferences</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Meal plans, grocery lists, barcode warnings, and nutrition insights use these preferences automatically. Allergy warnings are stronger than exclusions or dislikes, but you always control what you log.</p></div></div></div>
    <div className="grid gap-8 p-7 md:p-8 xl:grid-cols-2">
      <Section icon={Utensils} title="Dietary pattern" description="Choose the pattern that most closely reflects how you eat."><ChipGroup options={patterns} selected={[dietary.dietaryPattern]} onToggle={value=>update({dietaryPattern:value as DietaryProfile["dietaryPattern"]})}/>{dietary.dietaryPattern==="CUSTOM"&&<input className={`${inputClass} mt-3`} maxLength={200} value={dietary.customDietaryPattern} onChange={event=>update({customDietaryPattern:event.target.value})} placeholder="Describe your dietary pattern"/>}</Section>
      <Section icon={ShieldCheck} title="Food restrictions" description="These are exclusions, not allergy claims."><ChipGroup options={restrictions} selected={dietary.restrictions} onToggle={value=>toggle("restrictions",value)}/><CommaField label="Custom exclusions" value={dietary.customExclusions} onChange={value=>update({customExclusions:value})} placeholder="e.g. mushrooms, gelatine"/></Section>
      <Section icon={AlertTriangle} title="Allergies" description="Used as a high-priority filter when ingredient data is available." tone="bg-[#fff1ef] text-coral"><ChipGroup options={allergies} selected={dietary.allergies} onToggle={value=>toggle("allergies",value)} alert/><CommaField label="Other allergies" value={dietary.customAllergies} onChange={value=>update({customAllergies:value})} placeholder="Comma separated"/></Section>
      <Section icon={Heart} title="Intolerances & preferences" description="Tracked separately from allergies and dislikes."><ChipGroup options={intolerances} selected={dietary.intolerances} onToggle={value=>toggle("intolerances",value)}/><CommaField label="Other intolerances" value={dietary.customIntolerances} onChange={value=>update({customIntolerances:value})} placeholder="Comma separated"/></Section>
      <Section icon={ShieldCheck} title="Religious & cultural preferences" description="Used for preference filtering, not certification claims."><ChipGroup options={cultural} selected={dietary.culturalPreferences} onToggle={value=>toggle("culturalPreferences",value)}/><CommaField label="Custom cultural preferences" value={dietary.customCulturalPreferences} onChange={value=>update({customCulturalPreferences:value})} placeholder="Optional"/></Section>
      <Section icon={Heart} title="Foods I enjoy or avoid" description="Dislikes influence planning but are not treated as allergies."><CommaField label="Favourite foods" value={dietary.favouriteFoods} onChange={value=>update({favouriteFoods:value})} placeholder="e.g. paneer, berries, rice"/><CommaField label="Disliked foods" value={dietary.dislikedFoods} onChange={value=>update({dislikedFoods:value})} placeholder="e.g. olives, mushrooms"/></Section>
      <Section icon={ChefHat} title="Preferred cuisines" description="Select as many as you like."><ChipGroup options={cuisines.map(value=>[value,label(value)] as const)} selected={dietary.preferredCuisines} onToggle={value=>toggle("preferredCuisines",value)}/></Section>
      <Section icon={Leaf} title="Preferred protein sources" description="Options are filtered where practical for your pattern and exclusions."><ChipGroup options={allowedProteins.map(value=>[value,label(value)] as const)} selected={dietary.preferredProteinSources} onToggle={value=>toggle("preferredProteinSources",value)}/><CommaField label="Custom protein sources" value={dietary.customProteinSources} onChange={value=>update({customProteinSources:value})} placeholder="e.g. paneer, pea protein"/></Section>
      <Section icon={ChefHat} title="Meal preparation" description="Planning preferences only—not medical recommendations."><div className="grid gap-3 sm:grid-cols-2"><FormField label="Meals per day"><select className={inputClass} value={dietary.preferredMealsPerDay} onChange={event=>update({preferredMealsPerDay:Number(event.target.value)})}>{[2,3,4,5,6].map(value=><option key={value}>{value}</option>)}</select></FormField><FormField label="Difficulty"><select className={inputClass} value={dietary.mealPrepDifficulty} onChange={event=>update({mealPrepDifficulty:event.target.value as DietaryProfile["mealPrepDifficulty"]})}><option value="VERY_EASY">Very easy</option><option value="EASY">Easy</option><option value="MODERATE">Moderate</option></select></FormField><FormField label="Approximate prep time"><select className={inputClass} value={dietary.mealPrepTime} onChange={event=>update({mealPrepTime:event.target.value as DietaryProfile["mealPrepTime"]})}><option value="UNDER_15">Under 15 min</option><option value="MIN_15_30">15–30 min</option><option value="MIN_30_60">30–60 min</option></select></FormField><FormField label="Budget"><select className={inputClass} value={dietary.budgetPreference} onChange={event=>update({budgetPreference:event.target.value as DietaryProfile["budgetPreference"]})}><option value="BUDGET">Budget</option><option value="MODERATE">Moderate</option><option value="FLEXIBLE">Flexible</option></select></FormField></div></Section>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/[.055] bg-[#fafaf8] px-7 py-5 md:px-8"><p className="text-xs text-muted">Compatibility is shown only when trustworthy ingredient or allergen metadata exists.</p><PillButton disabled={saving} onClick={onSave} className="bg-ink text-white">{saved?<><Check size={16}/>Saved</>:<><Save size={16}/>{saving?"Saving…":"Save diet preferences"}</>}</PillButton></div>
  </Card>;
}

function Section({icon:Icon,title,description,children,tone="bg-[#f2f2ef] text-ink"}:{icon:typeof Leaf;title:string;description:string;children:ReactNode;tone?:string}) { return <section><div className="flex items-start gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-[15px] ${tone}`}><Icon size={17}/></span><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{description}</p></div></div><div className="mt-4">{children}</div></section>; }
function ChipGroup({options,selected,onToggle,alert=false}:{options:readonly (readonly [string,string])[];selected:string[];onToggle:(value:string)=>void;alert?:boolean}) { return <div className="flex flex-wrap gap-2">{options.map(([value,text])=>{const active=selected.includes(value);return <button type="button" key={value} onClick={()=>onToggle(value)} className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${active?(alert?"bg-coral text-white":"bg-ink text-white"):"bg-[#f2f2ef] text-muted hover:text-ink"}`}>{active&&<Check size={12} className="mr-1.5 inline"/>}{text}</button>;})}</div>; }
function CommaField({label:fieldLabel,value,onChange,placeholder}:{label:string;value:string[];onChange:(value:string[])=>void;placeholder:string}) {
  const [text,setText]=useState(value.join(", "));
  useEffect(()=>setText(value.join(", ")),[value]);
  const commit=()=>onChange(split(text));
  return <FormField label={fieldLabel}><input className={`${inputClass} mt-3`} value={text} onChange={event=>setText(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();commit();}}} placeholder={placeholder}/></FormField>;
}
