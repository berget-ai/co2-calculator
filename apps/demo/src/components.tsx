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
    <select
      {...props}
      className="w-full px-3 py-2.5 border border-[rgba(229,221,213,0.12)] rounded-lg text-sm bg-[rgba(0,0,0,0.3)] text-white cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%2352B788\" stroke-width=\"2\"%3E%3Cpolyline points=\"6 9 12 15 18 9\"%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-[right_0.75rem_center] pr-10 focus:outline-none focus:border-[#52B788]"
    >
      {children}
    </select>
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
