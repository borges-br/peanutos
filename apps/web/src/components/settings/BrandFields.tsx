"use client";
import React, { useEffect, useId, useState } from "react";

export function Range({
  label,
  value,
  min,
  max,
  onChange,
  unit = "px",
  step = 1,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
}) {
  const id = useId();
  return (
    <label className="brand-field" htmlFor={id}>
      <span className="brand-range-label">
        <span>{label}</span>
        <output>
          {value}
          {unit ? ` ${unit}` : ""}
        </output>
      </span>
      <input
        id={id}
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const id = useId();
  useEffect(() => setText(value), [value]);
  return (
    <label className="brand-field" htmlFor={id}>
      <span>{label}</span>
      <span className="brand-color-row">
        <input
          type="color"
          aria-label={`Selecionar ${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          id={id}
          aria-label={label}
          value={text}
          maxLength={7}
          onChange={(e) => {
            setText(e.target.value);
            if (/^#[\da-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => setText(value)}
        />
      </span>
    </label>
  );
}
export function Choice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string | number;
  choices: ReadonlyArray<readonly [string, string]>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="brand-field">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {choices.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="brand-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
