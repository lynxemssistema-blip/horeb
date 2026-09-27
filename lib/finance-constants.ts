export interface FinancialKPIs {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  nominalTithesTotal: number;
  nominalTithesCount: number;
  anonymousOfferingsTotal: number;
  anonymousOfferingsCount: number;
}

export interface MonthlyChartPoint {
  month: string;
  monthKey: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategorySummary {
  category: string;
  label: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  color: string;
}

export interface DetailedTransaction {
  id: string;
  amount: number;
  type: string; // INCOME | EXPENSE
  category: string;
  description: string | null;
  status: string;
  paymentMethod: string;
  createdAt: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  isNominal: boolean;
  member?: {
    id: string;
    name: string;
    email: string;
    cpf: string | null;
  } | null;
}

export interface ChurchFilterOption {
  id: string;
  name: string;
  slug: string;
  isMatriz: boolean;
}

export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  DIZIMO: { label: "Dízimos Nominais", color: "#f59e0b" },
  OFERTA: { label: "Ofertas Voluntárias", color: "#10b981" },
  MISSOES: { label: "Ofertas de Missões", color: "#3b82f6" },
  ALUGUEL: { label: "Aluguel do Templo", color: "#ef4444" },
  LUZ: { label: "Energia Elétrica / Água", color: "#f97316" },
  SALARIO: { label: "Prebenda Pastoral / Salários", color: "#8b5cf6" },
  SOM: { label: "Equipamentos de Som & Mídia", color: "#06b6d4" },
  REFORMA: { label: "Manutenção & Reformas", color: "#ec4899" },
  OUTROS: { label: "Outras Despesas", color: "#64748b" },
};
