# BESS Arbitrage Optimiser

Computes the profit-maximising charge/discharge schedule for a battery energy storage
system over one day of 15-minute electricity prices, and the project economics that
follow from it.

Next.js 14 (App Router) · TypeScript · Tailwind · Recharts · GLPK. No database, no auth,
no server state — everything runs in the browser.

## What it does

You configure a battery, supply or generate 96 blocks of prices, and the app solves a
perfect-foresight linear programme for the optimal schedule.

## The optimisation

A linear programme over 96 blocks of 0.25 h, solved with [glpk.js](https://github.com/jvail/glpk.js)
inside a Web Worker so the UI never blocks. Two variables per block: charge `c_t` and
discharge `d_t`, both grid-side energies in MWh.

```
maximise    Σ_t (d_t − c_t) · price_t

subject to  0 ≤ c_t ≤ P·Δt
            0 ≤ d_t ≤ P·Δt
            SOC_t = SOC_0 + Σ_{s≤t} (c_s·η_c − d_s/η_d)
            SOC_min ≤ SOC_t ≤ SOC_max
            Σ_t d_t ≤ max_cycles × usable_energy
            SOC_95 = SOC_0
```

Round-trip efficiency is split as `√RTE` on charge and `√RTE` on discharge, so a full
round trip returns exactly RTE. The recursive SOC balance is expanded into a running sum,
making each block's state of charge one linear row over the variables preceding it.

This is a linear programme, not a heuristic. The schedule it returns is provably optimal
for the prices given.

## Price data

**Generate** — a synthetic "Karnataka-shaped" day: overnight trough, morning ramp
06:00–09:00, deep midday solar depression 11:00–15:00, sharp evening peak 18:00–22:00.
The shape is built from monotone cubic (Fritsch–Carlson) interpolation over hand-placed
anchors, then rescaled so the peak and trough sliders map to the literal maximum and
minimum. Noise is AR(1) with a seeded PRNG, so a given seed always reproduces the same
series.

Anything computed from generated prices is labelled **SYNTHETIC** everywhere it appears.

**Upload CSV** — two columns:

```csv
block,price_rs_per_mwh
0,2431.50
1,2388.20
...
95,3011.75
```

Exactly 96 rows. The block index may start at 0 or 1. The parser rejects the file and
reports every problem with its source row rather than loading partial data.

## Outputs

- **Chart** — price line, SOC area and charge/discharge bars on one 96-block axis.
  SOC and the bars share a single MWh axis so their magnitudes stay comparable; charge
  hangs below zero because it is energy bought rather than sold.
- **Daily** — gross margin, energy cycled, effective cycles, achieved spread, capture rate.
- **Project** — year-1 revenue with degradation applied, NPV, IRR (bisection), simple and
  discounted payback, plus a full year-by-year cashflow table.
- **Sensitivity** — the LP re-solved 16 times across RTE (80/85/90/95%) × max cycles
  (1.0/1.5/2.0/2.5), with your current configuration marked.

### Capture rate

`achieved spread ÷ theoretical max spread`, where the theoretical maximum moves the same
energy but ignores SOC coupling and block ordering: it discharges into the dearest blocks
and charges from the cheapest, still paying the efficiency penalty. It is an upper bound
no real schedule can beat, so the ratio never exceeds 100%.

## Traceability

Every derived number has a **Show working** toggle that prints its formula, the
substituted inputs and the assumptions behind it. Turn it on before trusting any figure.

No market data is bundled with this tool. Fields with no sourced default — fixed O&M,
project life, discount rate — are marked `assumption` in the interface and are yours to
set. Annual figures repeat one optimised day 365 times, which the app states plainly next
to them; a single day is not a year.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Deploying to Vercel

Import the repository. Vercel detects Next.js automatically:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `./` (repository root) |
| Build Command | default (`next build`) |
| Output Directory | default |

The page is statically prerendered and the solver runs entirely client-side, so no
serverless functions or environment variables are required.

## Layout

```
app/          route, layout, global styles
components/   layout primitives, input panels, result panels
hooks/        config state, price series, debounced solver calls
lib/          domain logic — battery, metrics, economics, prices, LP model
workers/      the Web Worker that owns GLPK
```

`lib/` holds pure functions with no React dependency, which is what makes the LP model
and the economics independently testable.
