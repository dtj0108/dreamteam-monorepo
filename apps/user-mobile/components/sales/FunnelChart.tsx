import { View, Text } from "react-native";
import { ConversionFunnelStage } from "../../lib/types/sales";

interface FunnelChartProps {
  stages: ConversionFunnelStage[];
  maxWidth?: number;
}

export function FunnelChart({ stages, maxWidth = 280 }: FunnelChartProps) {
  if (stages.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-muted-foreground">No data available</Text>
      </View>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <View className="gap-3">
      {stages.map((stage, index) => {
        const widthPercent = (stage.count / maxCount) * 100;
        const barWidth = Math.max((widthPercent / 100) * maxWidth, 60); // Min width 60

        return (
          <View key={stage.id} className="flex-row items-center">
            {/* Stage name and count */}
            <View className="w-24">
              <Text className="text-sm font-medium text-foreground">
                {stage.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {stage.count} leads
              </Text>
            </View>

            {/* Bar */}
            <View className="flex-1">
              <View
                className="h-8 items-center justify-center rounded-md"
                style={{
                  backgroundColor: stage.color,
                  width: barWidth,
                }}
              >
                <Text className="text-xs font-medium text-white">
                  {stage.conversionRate > 0 ? `${stage.conversionRate}%` : ""}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

interface FunnelStageBreakdownProps {
  stages: ConversionFunnelStage[];
}

export function FunnelStageBreakdown({ stages }: FunnelStageBreakdownProps) {
  if (stages.length < 2) return null;

  const transitions: { from: string; to: string; rate: number }[] = [];
  for (let i = 1; i < stages.length; i++) {
    transitions.push({
      from: stages[i - 1].name,
      to: stages[i].name,
      rate: stages[i].conversionRate,
    });
  }

  return (
    <View className="mt-4 rounded-xl bg-muted">
      {transitions.map((t, index) => (
        <View
          key={`${t.from}-${t.to}`}
          className={`flex-row items-center justify-between p-4 ${
            index < transitions.length - 1 ? "border-b border-background" : ""
          }`}
        >
          <Text className="text-foreground">
            {t.from} → {t.to}
          </Text>
          <Text
            className={`font-semibold ${
              t.rate >= 50
                ? "text-green-600"
                : t.rate >= 25
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
          >
            {t.rate}%
          </Text>
        </View>
      ))}
    </View>
  );
}
