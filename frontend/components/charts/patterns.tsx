/**
 * Spending-by-merchant series. All slices are the EXPENSE colour (one category = one colour everywhere), told apart by
 * tint and texture so they stay distinguishable without relying on hue. <ChartPatterns/> goes inside the chart <svg>;
 * `css` is the matching legend swatch.
 */
const mix = (pct: number) => `color-mix(in srgb, var(--expense) ${pct}%, transparent)`;
export const SERIES = [
  { id: "fx-solid", fill: "var(--expense)", css: "var(--expense)" },
  { id: "fx-stripes", fill: "url(#fx-stripes)", css: "repeating-linear-gradient(45deg, var(--expense) 0 2px, var(--card) 2px 5px)" },
  { id: "fx-dots", fill: "url(#fx-dots)", css: "radial-gradient(var(--expense) 1.3px, var(--card) 1.6px) 0 0/5px 5px" },
  { id: "fx-mid", fill: mix(55), css: mix(55) },
  { id: "fx-cross", fill: "url(#fx-cross)", css: "repeating-linear-gradient(45deg, var(--expense) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, var(--expense) 0 1px, var(--card) 1px 4px)" },
  { id: "fx-light", fill: mix(28), css: mix(28) },
] as const;

export function ChartPatterns() {
  return (
    <defs>
      <pattern id="fx-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--card)" /><rect width="3" height="6" fill="var(--expense)" /></pattern>
      <pattern id="fx-dots" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--card)" /><circle cx="3" cy="3" r="1.8" fill="var(--expense)" /></pattern>
      <pattern id="fx-cross" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--card)" /><path d="M0 0L6 6M6 0L0 6" stroke="var(--expense)" strokeWidth="1" /></pattern>
    </defs>
  );
}
