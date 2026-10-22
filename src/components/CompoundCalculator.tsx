"use client";

import { useMemo, useState } from "react";
import { formatUSD } from "@/lib/program";

export default function CompoundCalculator() {
  const [age, setAge] = useState(0);
  const [initial, setInitial] = useState(1000);
  const [monthly, setMonthly] = useState(50);
  const [rate, setRate] = useState(4.5);
  const [stateMatch, setStateMatch] = useState(400);

  const data = useMemo(() => {
    const startAge = Math.min(Math.max(age, 0), 17);
    const years = 18 - startAge;
    const r = Math.min(Math.max(rate, 0), 12) / 100;
    const series: { age: number; withProgram: number; withoutProgram: number }[] = [];
    let withP = initial + stateMatch;
    let withoutP = initial;
    series.push({ age: startAge, withProgram: withP, withoutProgram: withoutP });
    for (let i = 1; i <= years; i += 1) {
      const contribution = monthly * 12;
      const supplement = startAge + i <= 6 ? 150 : 0;
      withP = withP * (1 + r) + contribution + supplement;
      withoutP = withoutP * (1 + r) + contribution;
      series.push({ age: startAge + i, withProgram: withP, withoutProgram: withoutP });
    }
    return { series, years, startAge };
  }, [age, initial, monthly, rate, stateMatch]);

  const final = data.series[data.series.length - 1] ?? { withProgram: 0, withoutProgram: 0 };
  const max = Math.max(final.withProgram, 1);
  const W = 640;
  const H = 220;
  const pad = 34;

  const toPoint = (v: number, i: number) => {
    const x = pad + (i / Math.max(data.series.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 1.6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const programPath = data.series.map((p, i) => toPoint(p.withProgram, i)).join(" ");
  const baselinePath = data.series.map((p, i) => toPoint(p.withoutProgram, i)).join(" ");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr]">
      <div className="space-y-5">
        <Slider
          id="calc-age"
          label="Child's current age"
          value={age}
          min={0}
          max={17}
          step={1}
          suffix={age === 0 ? "newborn" : `years`}
          onChange={setAge}
        />
        <Slider
          id="calc-initial"
          label="Opening deposit (federal seed + your deposit)"
          value={initial}
          min={0}
          max={5000}
          step={50}
          prefix="$"
          onChange={setInitial}
        />
        <Slider
          id="calc-match"
          label="State opening match"
          value={stateMatch}
          min={0}
          max={600}
          step={25}
          prefix="$"
          onChange={setStateMatch}
        />
        <Slider
          id="calc-monthly"
          label="Guardian contribution per month"
          value={monthly}
          min={0}
          max={416}
          step={5}
          prefix="$"
          onChange={setMonthly}
        />
        <Slider
          id="calc-rate"
          label="Assumed annual return"
          value={rate}
          min={0}
          max={9}
          step={0.5}
          suffix="%"
          onChange={setRate}
        />
        <p className="m-0 text-xs leading-relaxed text-gov-base">
          The calculator assumes contributions are made at the end of each year, the $150 federal
          birthday supplement runs until the child turns 6, and no withdrawals occur before age 18.
          Returns are estimates — the TA Growth Portfolio is subject to market risk.
        </p>
      </div>

      <div>
        <div className="rounded border border-gov-base-light bg-white p-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Projected account balance by age">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = H - pad - f * (H - pad * 1.6);
              return (
                <g key={f}>
                  <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="#dfe1e2" strokeWidth="1" />
                  <text x={4} y={y + 4} fontSize="10" fill="#71767a">
                    {formatUSD(max * f, false)}
                  </text>
                </g>
              );
            })}
            {data.series.map((p, i) =>
              i % Math.max(1, Math.round(data.series.length / 9)) === 0 || i === data.series.length - 1 ? (
                <text
                  key={p.age}
                  x={pad + (i / Math.max(data.series.length - 1, 1)) * (W - pad * 2)}
                  y={H - 10}
                  fontSize="10"
                  fill="#71767a"
                  textAnchor="middle"
                >
                  {p.age}
                </text>
              ) : null,
            )}
            <polyline points={baselinePath} fill="none" stroke="#71767a" strokeWidth="2" strokeDasharray="5 4" />
            <polyline points={programPath} fill="none" stroke="#005ea2" strokeWidth="3" />
            <text x={W - pad} y={20} fontSize="11" fill="#005ea2" textAnchor="end" fontWeight="bold">
              With the Trump Account
            </text>
            <text x={W - pad} y={34} fontSize="11" fill="#71767a" textAnchor="end">
              Savings account only
            </text>
          </svg>
          <p className="m-0 mt-1 text-center text-[0.7rem] uppercase tracking-wider text-gov-base">
            Projected balance by the child&apos;s age
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-gov-base-light bg-gov-base-lightest p-4">
            <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-gov-base">
              Deposits in
            </p>
            <p className="m-0 mt-1 font-serif text-xl font-bold tabular-nums text-gov-navy">
              {formatUSD(
                Math.round(
                  (initial + stateMatch + monthly * 12 * data.years + (data.startAge <= 6 ? 150 * Math.min(6 - data.startAge, data.years) : 0)) *
                    100,
                ),
                false,
              )}
            </p>
          </div>
          <div className="rounded border border-gov-base-light bg-gov-base-lightest p-4">
            <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-gov-base">
              Without the program
            </p>
            <p className="m-0 mt-1 font-serif text-xl font-bold tabular-nums text-gov-navy">
              {formatUSD(Math.round(final.withoutProgram * 100), false)}
            </p>
          </div>
          <div className="rounded border-2 border-gov-green bg-[#f0f9ec] p-4">
            <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-gov-green-dark">
              At age 18 with TA
            </p>
            <p className="m-0 mt-1 font-serif text-2xl font-bold tabular-nums text-gov-green-dark">
              {formatUSD(Math.round(final.withProgram * 100), false)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  prefix,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="usa-label !mb-1" htmlFor={id}>
          {label}
        </label>
        <span className="font-serif text-base font-bold tabular-nums text-gov-navy">
          {prefix ?? ""}
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gov-primary"
      />
    </div>
  );
}
