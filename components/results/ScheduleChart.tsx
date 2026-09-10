'use client'

import {
  Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { SyntheticBadge } from '@/components/layout/SyntheticBadge'
import type { DerivedBattery } from '@/lib/battery'
import { BLOCK_HOURS, BLOCKS_PER_DAY, blockToSpan } from '@/lib/constants'
import { formatNumber, formatRs } from '@/lib/format'
import type { Schedule } from '@/lib/lp/types'
import type { PriceSeries } from '@/lib/types'

interface ChartPoint {
  readonly block: number
  readonly price: number
  readonly soc: number | null
  readonly chargeMwh: number | null
  readonly dischargeMwh: number | null
}

const AXIS = { stroke: '#5C6679', fontSize: 10, fontFamily: 'ui-monospace, monospace' } as const
const X_TICKS = Array.from({ length: BLOCKS_PER_DAY / 8 }, (_, i) => i * 8)

function clockTick(block: number): string {
  const hour = Math.floor((block * 24) / BLOCKS_PER_DAY)
  return `${String(hour).padStart(2, '0')}:00`
}

/** Round quarter-capacity gridlines plus one tick in the charge region below zero. */
function energyTicks(capacityMwh: number, blockEnergyMwh: number): number[] {
  const quarters = [0, 0.25, 0.5, 0.75, 1].map((fraction) =>
    Number((capacityMwh * fraction).toFixed(2)),
  )
  return [-Number(blockEnergyMwh.toFixed(2)), ...quarters]
}

interface TooltipItem {
  readonly payload?: ChartPoint
}

interface ChartTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly TooltipItem[]
  readonly capacityMwh: number
}

function ChartTooltip({ active, payload, capacityMwh }: ChartTooltipProps) {
  const point = active ? payload?.[0]?.payload : undefined
  if (!point) return null

  const socPct = capacityMwh > 0 && point.soc !== null ? (point.soc / capacityMwh) * 100 : null
  const chargeMw = point.chargeMwh ? Math.abs(point.chargeMwh) / BLOCK_HOURS : 0
  const dischargeMw = point.dischargeMwh ? point.dischargeMwh / BLOCK_HOURS : 0

  return (
    <div className="rounded-md border border-edge bg-panel/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="num text-2xs font-semibold text-ink">
        Block {point.block} · {blockToSpan(point.block)}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-2xs text-price">Price</dt>
        <dd className="num text-2xs text-ink">{formatRs(point.price, 2)}/MWh</dd>

        {point.soc !== null && (
          <>
            <dt className="text-2xs text-soc">SOC</dt>
            <dd className="num text-2xs text-ink">
              {formatNumber(point.soc, 2)} MWh{socPct !== null ? ` · ${formatNumber(socPct, 1)}%` : ''}
            </dd>
          </>
        )}

        {chargeMw > 0 && (
          <>
            <dt className="text-2xs text-charge">Charge</dt>
            <dd className="num text-2xs text-ink">
              {formatNumber(chargeMw, 2)} MW · {formatNumber(Math.abs(point.chargeMwh ?? 0), 3)} MWh
            </dd>
          </>
        )}

        {dischargeMw > 0 && (
          <>
            <dt className="text-2xs text-discharge">Discharge</dt>
            <dd className="num text-2xs text-ink">
              {formatNumber(dischargeMw, 2)} MW · {formatNumber(point.dischargeMwh ?? 0, 3)} MWh
            </dd>
          </>
        )}
      </dl>
    </div>
  )
}

type LegendShape = 'line' | 'area' | 'bar'

const LEGEND: readonly {
  readonly key: string
  readonly label: string
  readonly swatch: string
  readonly shape: LegendShape
}[] = [
  { key: 'price', label: 'Price ₹/MWh', swatch: 'bg-price', shape: 'line' },
  { key: 'soc', label: 'State of charge MWh', swatch: 'bg-soc', shape: 'area' },
  { key: 'discharge', label: 'Discharge (sell)', swatch: 'bg-discharge', shape: 'bar' },
  { key: 'charge', label: 'Charge (buy)', swatch: 'bg-charge', shape: 'bar' },
]

const SHAPE_CLASS: Record<LegendShape, string> = {
  line: 'h-0.5 w-4',
  area: 'h-2.5 w-4 rounded-sm opacity-40',
  bar: 'h-2.5 w-2 rounded-[1px]',
}

interface ScheduleChartProps {
  readonly series: PriceSeries
  readonly schedule: Schedule | null
  readonly battery: DerivedBattery
  readonly capacityMwh: number
}

/**
 * Price, state of charge and the charge/discharge decisions on one 96-block axis.
 * SOC and the bars share a single MWh axis so their magnitudes stay honestly
 * comparable; charge hangs below zero because it is energy bought, not sold.
 */
export function ScheduleChart({ series, schedule, battery, capacityMwh }: ScheduleChartProps) {
  const data: ChartPoint[] = series.prices.map((price, block) => ({
    block,
    price,
    soc: schedule ? schedule.soc[block] : null,
    chargeMwh: schedule ? -schedule.charge[block] : null,
    dischargeMwh: schedule ? schedule.discharge[block] : null,
  }))

  const energyFloor = -battery.maxBlockEnergyMwh * 1.6
  const energyCeil = Math.max(capacityMwh * 1.04, battery.maxBlockEnergyMwh * 1.6)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {LEGEND.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-2xs text-muted">
            <span aria-hidden className={`${item.swatch} ${SHAPE_CLASS[item.shape]}`} />
            {item.label}
          </span>
        ))}
        {series.origin.synthetic && (
          <span className="ml-auto">
            <SyntheticBadge label={series.origin.label} />
          </span>
        )}
      </div>

      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <defs>
              {/* Fades downward so the SOC boundary stays legible without the fill
                  becoming a solid block over the price line. */}
              <linearGradient id="socFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B7BF0" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#8B7BF0" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#1A2130" strokeDasharray="2 4" vertical={false} />

            <XAxis
              dataKey="block"
              ticks={X_TICKS}
              tickFormatter={clockTick}
              tick={AXIS}
              tickLine={false}
              axisLine={{ stroke: '#232C3D' }}
              interval={0}
            />

            <YAxis
              yAxisId="price"
              orientation="left"
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={60}
              tickFormatter={(value: number) => formatNumber(value, 0)}
              label={{ value: '₹/MWh', angle: -90, position: 'insideLeft', fill: '#5C6679', fontSize: 10, offset: 10 }}
            />

            <YAxis
              yAxisId="energy"
              orientation="right"
              domain={[energyFloor, energyCeil]}
              ticks={energyTicks(capacityMwh, battery.maxBlockEnergyMwh)}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={50}
              tickFormatter={(value: number) => formatNumber(value, value % 1 === 0 ? 0 : 1)}
              label={{ value: 'MWh', angle: 90, position: 'insideRight', fill: '#5C6679', fontSize: 10, offset: 10 }}
            />

            <Tooltip
              cursor={{ stroke: '#5C6679', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as readonly TooltipItem[] | undefined}
                  capacityMwh={capacityMwh}
                />
              )}
            />

            <Area
              yAxisId="energy"
              dataKey="soc"
              type="stepAfter"
              stroke="#8B7BF0"
              strokeWidth={1.5}
              fill="url(#socFill)"
              fillOpacity={1}
              isAnimationActive={false}
              connectNulls={false}
            />

            <ReferenceLine yAxisId="energy" y={0} stroke="#232C3D" strokeWidth={1} />

            <Bar yAxisId="energy" dataKey="dischargeMwh" fill="#2ED095" isAnimationActive={false} barSize={4} />
            <Bar yAxisId="energy" dataKey="chargeMwh" fill="#F0A030" isAnimationActive={false} barSize={4} />

            <Line
              yAxisId="price"
              dataKey="price"
              type="linear"
              stroke="#5AA9FF"
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
