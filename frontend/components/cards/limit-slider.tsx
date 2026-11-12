"use client";

import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from "@/components/paceui/motion/slider";

/** Slider for a spending limit in whole pounds, kept in sync with the form's number input (which stays the validated source). */
export function LimitSlider({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (pounds: number) => void }) {
  const clamped = Math.min(max, Math.max(1, Number.isFinite(value) ? value : 1));
  return (
    <Slider
      value={[clamped]} min={1} max={max} step={max > 1000 ? 25 : 5} aria-label={`${label} slider`}
      onValueChange={v => onChange(Array.isArray(v) ? v[0] : v)}
      className="mt-3"
    >
      <SliderControl className="h-6"><SliderTrack><SliderIndicator /></SliderTrack><SliderThumb aria-label={label} /></SliderControl>
    </Slider>
  );
}
