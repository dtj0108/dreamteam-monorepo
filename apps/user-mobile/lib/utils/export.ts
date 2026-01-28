import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

import { Transaction } from "../types/finance";

interface ExportOptions {
  filename: string;
  data: string;
  mimeType?: string;
}

/**
 * Convert transactions to CSV format
 */
export function transactionsToCSV(transactions: Transaction[]): string {
  const headers = ["Date", "Description", "Category", "Account", "Amount", "Type", "Notes"];

  const rows = transactions.map((t) => {
    const type = t.amount > 0 ? "Income" : "Expense";
    return [
      t.date,
      escapeCSV(t.description),
      escapeCSV(t.category?.name || "Uncategorized"),
      escapeCSV(t.account?.name || "Unknown"),
      Math.abs(t.amount).toFixed(2),
      type,
      escapeCSV(t.notes || ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Convert generic data to CSV format
 */
export function dataToCSV(
  data: Record<string, unknown>[],
  columns: { key: string; header: string }[]
): string {
  const headers = columns.map((c) => c.header);

  const rows = data.map((row) => {
    return columns
      .map((c) => {
        const value = row[c.key];
        if (value === null || value === undefined) return "";
        if (typeof value === "number") return value.toString();
        return escapeCSV(String(value));
      })
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Convert expense/income analysis to CSV
 */
export function categoryBreakdownToCSV(
  breakdown: Array<{ name: string; amount: number; count: number; percentage?: number }>
): string {
  const headers = ["Category", "Amount", "Count", "Percentage"];

  const rows = breakdown.map((item) => {
    return [
      escapeCSV(item.name),
      Math.abs(item.amount).toFixed(2),
      item.count.toString(),
      item.percentage ? `${item.percentage.toFixed(1)}%` : "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Convert profit/loss report to CSV
 */
export function profitLossToCSV(report: {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  incomeByCategory: Array<{ name: string; amount: number; count: number }>;
  expensesByCategory: Array<{ name: string; amount: number; count: number }>;
}): string {
  const lines: string[] = [];

  // Summary section
  lines.push("PROFIT & LOSS SUMMARY");
  lines.push("Metric,Amount");
  lines.push(`Total Income,${report.summary.totalIncome.toFixed(2)}`);
  lines.push(`Total Expenses,${report.summary.totalExpenses.toFixed(2)}`);
  lines.push(`Net Profit,${report.summary.netProfit.toFixed(2)}`);
  lines.push(`Profit Margin,${report.summary.profitMargin.toFixed(1)}%`);
  lines.push("");

  // Income breakdown
  lines.push("INCOME BY CATEGORY");
  lines.push("Category,Amount,Count");
  for (const item of report.incomeByCategory) {
    lines.push(`${escapeCSV(item.name)},${item.amount.toFixed(2)},${item.count}`);
  }
  lines.push("");

  // Expenses breakdown
  lines.push("EXPENSES BY CATEGORY");
  lines.push("Category,Amount,Count");
  for (const item of report.expensesByCategory) {
    lines.push(`${escapeCSV(item.name)},${Math.abs(item.amount).toFixed(2)},${item.count}`);
  }

  return lines.join("\n");
}

/**
 * Convert cash flow report to CSV
 */
export function cashFlowToCSV(report: {
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    averageNetFlow: number;
  };
  trend: Array<{
    period: string;
    inflow: number;
    outflow: number;
    netFlow: number;
    runningBalance: number;
  }>;
}): string {
  const lines: string[] = [];

  // Summary section
  lines.push("CASH FLOW SUMMARY");
  lines.push("Metric,Amount");
  lines.push(`Total Inflow,${report.summary.totalInflow.toFixed(2)}`);
  lines.push(`Total Outflow,${report.summary.totalOutflow.toFixed(2)}`);
  lines.push(`Net Cash Flow,${report.summary.netCashFlow.toFixed(2)}`);
  lines.push(`Average Net Flow,${report.summary.averageNetFlow.toFixed(2)}`);
  lines.push("");

  // Trend data
  lines.push("PERIOD BREAKDOWN");
  lines.push("Period,Inflow,Outflow,Net Flow,Running Balance");
  for (const item of report.trend) {
    lines.push(
      `${item.period},${item.inflow.toFixed(2)},${item.outflow.toFixed(2)},${item.netFlow.toFixed(2)},${item.runningBalance.toFixed(2)}`
    );
  }

  return lines.join("\n");
}

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: string): string {
  if (!value) return "";
  // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export data as a CSV file and open share sheet
 */
export async function exportCSV({ filename, data, mimeType = "text/csv" }: ExportOptions): Promise<void> {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Export Not Available",
        "Sharing is not available on this device."
      );
      return;
    }

    // Create a temporary file
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, data, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Open share sheet
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Export ${filename}`,
      UTI: Platform.OS === "ios" ? "public.comma-separated-values-text" : undefined,
    });
  } catch (error) {
    console.error("Export failed:", error);
    Alert.alert(
      "Export Failed",
      "An error occurred while exporting the data. Please try again."
    );
  }
}

/**
 * Get formatted date string for filename
 */
export function getExportFilename(prefix: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  return `${prefix}_${dateStr}.csv`;
}
