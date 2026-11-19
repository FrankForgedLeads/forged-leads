// Must match the `category` check constraint on public.items in
// supabase/migration.sql.
export const CATEGORIES = [
  { key: "roofing", label: "Roofing" },
  { key: "water_mitigation", label: "Water Mitigation" },
  { key: "mold", label: "Mold" },
  { key: "interior", label: "Interior" },
  { key: "exterior", label: "Exterior" },
  { key: "general_conditions", label: "General Conditions" },
  { key: "code_upgrades", label: "Code Upgrades" },
];

export function categoryLabel(key) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
