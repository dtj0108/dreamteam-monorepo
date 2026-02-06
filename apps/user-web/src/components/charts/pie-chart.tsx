"use client"

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface PieChartProps {
  data: {
    name: string
    value: number
    color: string
  }[]
  height?: number
  showLegend?: boolean
  innerRadius?: number
  outerRadius?: number
}

export function PieChart({
  data,
  height = 300,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 100,
}: PieChartProps) {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString()}`
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }: { name?: string; percent?: number }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          // @ts-expect-error recharts formatter type mismatch
          formatter={(value: number) => [formatCurrency(value), ""]}
        />
        {showLegend && (
          <Legend 
            formatter={(value: string) => (
              <span className="text-sm">{value}</span>
            )}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}

