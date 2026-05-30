import { useState } from "react";

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  displayValue,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  displayValue: string;
}) {
  return (
    <div>
      <label className="flex justify-between items-center text-sm font-medium text-[hsl(var(--foreground))] mb-2">
        {label}
        <span className="bg-[rgba(82,183,136,0.12)] text-[#52B788] px-2 py-0.5 rounded-full text-xs font-bold font-mono border border-[rgba(82,183,136,0.2)]">
          {displayValue}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-[rgba(229,221,213,0.12)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#52B788] [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(82,183,136,0.4)] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white"
      />
    </div>
  );
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm bg-[#1a1a1a] text-white cursor-pointer appearance-none pr-10 focus:outline-none focus:border-[#52B788] dark:[color-scheme:dark]"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#52B788] text-xs">
        ▼
      </div>
    </div>
  );
}

export function Checkbox({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      className="w-5 h-5 accent-[#52B788] rounded cursor-pointer"
    />
  );
}
