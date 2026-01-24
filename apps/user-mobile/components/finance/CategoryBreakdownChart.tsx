import { Text, View } from "react-native";

import { CategoryBreakdown } from "@/lib/types/finance";

interface CategoryBreakdownChartProps {
  data: CategoryBreakdown[];
  maxItems?: number;
  showPercentage?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

export function CategoryBreakdownChart({
  data,
  maxItems = 5,
  showPercentage = true,
}: CategoryBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <View className="items-center justify-center rounded-xl bg-muted py-8">
        <Text className="text-muted-foreground">No category data available</Text>
      </View>
    );
  }

  // Take top N categories
  const displayData = data.slice(0, maxItems);
  const maxAmount = Math.max(...displayData.map((d) => Math.abs(d.amount)), 1);

  return (
    <View className="gap-3">
      {displayData.map((item, index) => {
        const percentage = item.percentage ?? (Math.abs(item.amount) / maxAmount) * 100;
        const barWidth = Math.max((Math.abs(item.amount) / maxAmount) * 100, 5);

        return (
          <View key={index}>
            {/* Category Header */}
            <View className="mb-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <Text className="font-medium text-foreground">{item.name}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="font-semibold text-foreground">
                  {formatCurrency(item.amount)}
                </Text>
                {showPercentage && (
                  <Text className="text-xs text-muted-foreground">
                    ({percentage.toFixed(0)}%)
                  </Text>
                )}
              </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: item.color,
                }}
              />
            </View>

            {/* Transaction Count */}
            <Text className="mt-1 text-xs text-muted-foreground">
              {item.count} transaction{item.count !== 1 ? "s" : ""}
            </Text>
          </View>
        );
      })}

      {/* Show more indicator if data was truncated */}
      {data.length > maxItems && (
        <Text className="text-center text-sm text-muted-foreground">
          +{data.length - maxItems} more categories
        </Text>
      )}
    </View>
  );
}
