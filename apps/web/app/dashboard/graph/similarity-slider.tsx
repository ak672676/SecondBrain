"use client";

interface SimilaritySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function SimilaritySlider({ value, onChange }: SimilaritySliderProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Threshold:</span>
      <input
        type="range"
        min={0.5}
        max={0.9}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-32 accent-primary"
      />
      <span className="text-xs tabular-nums w-10">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}
