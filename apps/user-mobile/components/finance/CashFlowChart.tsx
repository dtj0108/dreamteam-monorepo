import { Dimensions, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { CashFlowPeriod } from "@/lib/types/finance";

const screenWidth = Dimensions.get("window").width;

interface CashFlowChartProps {
  data: CashFlowPeriod[];
  height?: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPeriodLabel = (period: string) => {
  // Handle different period formats (YYYY-MM, YYYY-WXX, YYYY-MM-DD)
  if (period.includes("W")) {
    // Weekly format: YYYY-WXX
    return period.split("-W")[1] ? `W${period.split("-W")[1]}` : period;
  }
  if (period.length === 7) {
    // Monthly format: YYYY-MM
    const date = new Date(period + "-01");
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  // Daily or other format
  const date = new Date(period);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function CashFlowChart({ data, height = 250 }: CashFlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <View
        className="items-center justify-center rounded-xl bg-muted"
        style={{ height }}
      >
        <Text className="text-muted-foreground">No cash flow data available</Text>
      </View>
    );
  }

  // Calculate max values for scaling
  const maxFlow = Math.max(
    ...data.map((d) => Math.max(d.inflow, d.outflow)),
    1
  );
  const barWidth = Math.min((screenWidth - 80) / data.length / 2 - 4, 20);
  const chartHeight = height - 80;

  return (
    <View style={{ height }}>
      {/* Chart Area */}
      <View className="flex-1 flex-row items-end justify-around px-2">
        {data.map((item, index) => {
          const inflowHeight = (item.inflow / maxFlow) * chartHeight;
          const outflowHeight = (item.outflow / maxFlow) * chartHeight;

          return (
            <View key={index} className="items-center">
              <View className="flex-row items-end gap-1">
                <View
                  className="rounded-t"
                  style={{
                    width: barWidth,
                    height: Math.max(inflowHeight, 4),
                    backgroundColor: Colors.success,
                  }}
                />
                <View
                  className="rounded-t"
                  style={{
                    width: barWidth,
                    height: Math.max(outflowHeight, 4),
                    backgroundColor: Colors.destructive,
                  }}
                />
              </View>
              {/* Net Flow indicator */}
              <View
                className="mt-1 h-1 rounded-full"
                style={{
                  width: barWidth * 2 + 4,
                  backgroundColor:
                    item.netFlow >= 0 ? Colors.success : Colors.destructive,
                  opacity: 0.5,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* X-Axis Labels */}
      <View className="mt-2 flex-row justify-around px-2">
        {data.map((item, index) => (
          <Text key={index} className="text-xs text-muted-foreground">
            {formatPeriodLabel(item.period)}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View className="mt-3 flex-row justify-center gap-4">
        <View className="flex-row items-center gap-1">
          <View
            className="h-3 w-3 rounded"
            style={{ backgroundColor: Colors.success }}
          />
          <Text className="text-xs text-muted-foreground">Inflow</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View
            className="h-3 w-3 rounded"
            style={{ backgroundColor: Colors.destructive }}
          />
          <Text className="text-xs text-muted-foreground">Outflow</Text>
        </View>
      </View>
    </View>
  );
}
