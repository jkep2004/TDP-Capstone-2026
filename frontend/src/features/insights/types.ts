export type MonthlyInsights = {
  month: string
  totalSpendGbp: number
  totalCarbonKg: number | null
  categories: { name: string; carbonKg: number | null; spendGbp: number }[]
  recommendations: { category: string; advice: string; savingsGbp: number; savingsKg: number }[]
  savings?: { gbp: number; kg: number }
}
