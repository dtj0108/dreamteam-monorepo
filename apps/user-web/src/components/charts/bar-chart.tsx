"use client"

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts"

interface BarChartProps {
  data: Record<string, string | number>[]
  xKey: string
  bars: {
    dataKey: string
    name: string
    color: string
  }[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  layout?: "horizontal" | "vertical"
  useDataColors?: boolean // Use color from data instead of bar config
}

export function BarChart({
  data,
  xKey,
  bars,
  height = 300,
  showGrid = true,
  showLegend = false,
  layout = "horizontal",
  useDataColors = false,
}: BarChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  if (layout === "vertical") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 10, right: 10, left: 80, bottom: 0 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />}
          <XAxis 
            type="number"
            tick={{ fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
            className="text-muted-foreground"
          />
          <YAxis 
            dataKey={xKey}
            type="category"
            tick={{ fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            // @ts-expect-error recharts formatter type mismatch
            formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
          />
          {showLegend && <Legend />}
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color}
              radius={[0, 4, 4, 0]}
            >
              {useDataColors && data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={String(entry.color || bar.color)} />
              ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />}
        <XAxis 
          dataKey={xKey} 
          tick={{ fontSize: 12 }} 
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 12 }} 
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCurrency}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          // @ts-expect-error recharts formatter type mismatch
          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
        />
        {showLegend && <Legend />}
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
          >
            {useDataColors && data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={String(entry.color || bar.color)} />
            ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

