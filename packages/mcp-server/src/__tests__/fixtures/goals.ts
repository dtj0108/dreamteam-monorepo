/**
 * Goals test fixtures
 */

export const testProfileId = 'profile-123'

// ============================================
// Goal fixtures
// ============================================
export const mockGoal = {
  id: 'goal-123',
  profile_id: testProfileId,
  name: 'Revenue Target Q1',
  type: 'revenue',
  target_amount: 100000,
  current_amount: 45000,
  start_date: '2024-01-01',
  end_date: '2024-03-31',
  notes: 'Q1 revenue goal',
  is_achieved: false,
  achieved_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-02-15T00:00:00Z',
}

export const mockGoalAchieved = {
  id: 'goal-456',
  profile_id: testProfileId,
  name: 'Customer Count',
  type: 'valuation',
  target_amount: 50,
  current_amount: 55,
  start_date: '2024-01-01',
  end_date: '2024-02-28',
  notes: 'Customer growth goal',
  is_achieved: true,
  achieved_at: '2024-02-20T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-02-20T00:00:00Z',
}

export const mockGoalList = [mockGoal, mockGoalAchieved]

// ============================================
// KPI fixtures
// ============================================
export const mockKpiInput = {
  id: 'kpi-123',
  profile_id: testProfileId,
  period_start: '2024-01-01',
  period_end: '2024-01-31',
  revenue: 25000,
  expenses: 18000,
  customer_count: 100,
  customer_acquisition_cost: 150,
  lifetime_value: 1200,
  churned_customers: 5,
  inventory_value: null,
  units_sold: null,
  billable_hours: 120,
  employee_count: 8,
  utilization_target: 75,
  created_at: '2024-02-01T00:00:00Z',
  updated_at: '2024-02-01T00:00:00Z',
}

export const mockKpiInputPrevious = {
  id: 'kpi-456',
  profile_id: testProfileId,
  period_start: '2023-12-01',
  period_end: '2023-12-31',
  revenue: 22000,
  expenses: 17000,
  customer_count: 95,
  customer_acquisition_cost: 160,
  lifetime_value: 1100,
  churned_customers: 3,
  inventory_value: 50000,
  units_sold: 500,
  billable_hours: 110,
  employee_count: 7,
  utilization_target: 75,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

export const mockKpiInputList = [mockKpiInput, mockKpiInputPrevious]

// ============================================
// Exit Plan fixtures
// ============================================
export const mockExitPlan = {
  id: 'exit-plan-123',
  profile_id: testProfileId,
  target_valuation: 10000000,
  current_valuation: 3000000,
  target_multiple: 5,
  target_runway: 24,
  target_exit_date: '2026-06-30',
  notes: 'Acquisition target by mid-2026',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-02-15T00:00:00Z',
}
