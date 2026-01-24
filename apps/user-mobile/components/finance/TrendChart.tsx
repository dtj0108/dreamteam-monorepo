import { Dimensions, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { TrendDataPoint } from "@/lib/types/finance";

const screenWidth = Dimensions.get("window").width;

interface TrendChartProps {
  data: TrendDataPoint[];
  showIncome?: boolean;
  showExpenses?: boolean;
  showProfit?: boolean;
  height?: number;
}

export function TrendChart({
  data,
  showIncome = true,
  showExpenses = true,
  showProfit = false,
  height = 200,
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <View
        className="items-center justify-center rounded-xl bg-muted"
        style={{ height }}
      >
        <Text className="text-muted-foreground">No trend data available</Text>
      </View>
    );
  }

  // Calculate max value for scaling
  const allValues: number[] = [];
  data.forEach((d) => {
    if (showIncome) allValues.push(d.income);
    if (showExpenses) allValues.push(d.expenses);
    if (showProfit) allValues.push(Math.abs(d.profit));
  });
  const maxValue = Math.max(...allValues, 1);

  const barWidth = (screenWidth - 80) / data.length / 2 - 4;
  const chartHeight = height - 50;

  return (
    <View style={{ height }}>
      {/* Chart Area */}
      <View className="flex-1 flex-row items-end justify-around px-2">
        {data.map((item, index) => {
          const incomeHeight = (item.income / maxValue) * chartHeight;
          const expenseHeight = (item.expenses / maxValue) * chartHeight;
          const profitHeight = (Math.abs(item.profit) / maxValue) * chartHeight;

          return (
            <View key={index} className="items-center">
              <View className="flex-row items-end gap-1">
                {showIncome && (
                  <View
                    className="rounded-t"
                    style={{
                      width: barWidth,
                      height: Math.max(incomeHeight, 4),
                      backgroundColor: Colors.success,
                    }}
                  />
                )}
                {showExpenses && (
                  <View
                    className="rounded-t"
                    style={{
                      width: barWidth,
                      height: Math.max(expenseHeight, 4),
                      backgroundColor: Colors.destructive,
                    }}
                  />
                )}
                {showProfit && (
                  <View
                    className="rounded-t"
                    style={{
                      width: barWidth,
                      height: Math.max(profitHeight, 4),
                      backgroundColor:
                        item.profit >= 0 ? Colors.success : Colors.destructive,
                    }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* X-Axis Labels */}
      <View className="mt-2 flex-row justify-around px-2">
        {data.map((item, index) => (
          <Text key={index} className="text-xs text-muted-foreground">
            {item.label}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View className="mt-2 flex-row justify-center gap-4">
        {showIncome && (
          <View className="flex-row items-center gap-1">
            <View
              className="h-3 w-3 rounded"
              style={{ backgroundColor: Colors.success }}
            />
            <Text className="text-xs text-muted-foreground">Income</Text>
          </View>
        )}
        {showExpenses && (
          <View className="flex-row items-center gap-1">
            <View
              className="h-3 w-3 rounded"
              style={{ backgroundColor: Colors.destructive }}
            />
            <Text className="text-xs text-muted-foreground">Expenses</Text>
          </View>
        )}
        {showProfit && (
          <View className="flex-row items-center gap-1">
            <View
              className="h-3 w-3 rounded"
              style={{ backgroundColor: Colors.primary }}
            />
            <Text className="text-xs text-muted-foreground">Profit</Text>
          </View>
        )}
      </View>
    </View>
  );
}
