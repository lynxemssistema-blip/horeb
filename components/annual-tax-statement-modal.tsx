"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getMemberAnnualTaxStatement } from "@/app/actions/tax-statement";

interface AnnualTaxStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  memberId?: string;
  memberName?: string;
}

export function AnnualTaxStatementModal({
  isOpen,
  onClose,
  slug,
  memberId,
  memberName,
}: AnnualTaxStatementModalProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [loading, setLoading] = useState(false);
  const [statementData, setStatementData] = useState<any | null>(null);

  const fetchStatement = async (yr: number) => {
    setLoading(true);
    try {
      const res = await getMemberAnnualTaxStatement(slug, yr, memberId);
      if (res.success) {
        setStatementData(res);
      } else {
        setStatementData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatement(selectedYear);
    }
  }, [isOpen, selectedYear, slug, memberId]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border-border p-4 sm:p-8 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              <span>Informe de Contribuições & Dízimos (IRPF)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Demonstrativo anual oficial para comprovação perante a Receita Federal do Brasil.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Seletor de Ano */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-bold focus:outline-primary"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                <option key={yr} value={yr}>
                  Ano-Calendário {yr}
                </option>
              ))}
            </select>

            <Button
              onClick={handlePrint}
              disabled={!statementData || loading}
              className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 rounded-xl shadow-md cursor-pointer h-9"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-medium">Consolidando lançamentos fiscais...</p>
          </div>
        ) : !statementData ? (
          <div className="py-16 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-bold text-foreground">Nenhum registro encontrado</p>
            <p className="text-xs mt-1">Não foram localizadas contribuições registradas para este ano-calendário.</p>
          </div>
        ) : (
          /* DOCUMENTO FISCAL DE IRPF (Imprimível) */
          <div className="bg-white text-zinc-950 p-6 sm:p-10 rounded-2xl border border-zinc-200 font-sans print:border-none print:p-0">
            {/* Cabeçalho Oficial */}
            <div className="text-center pb-6 border-b-2 border-zinc-300 space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 uppercase tracking-tight">
                {statementData.church.name}
              </h2>
              <p className="text-xs text-zinc-600 font-semibold">
                CNPJ / Identificação: <strong className="font-mono text-zinc-900">{statementData.church.cnpj}</strong>
              </p>
              <p className="text-xs text-zinc-500">
                {statementData.church.address} • {statementData.church.cityState}
              </p>
              <div className="pt-2">
                <span className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-[11px] font-black uppercase text-zinc-800 tracking-wider">
                  DECLARAÇÃO DE CONTRIBUIÇÕES VOLUNTÁRIAS — EXERCÍCIO {selectedYear + 1} / ANO-CALENDÁRIO {selectedYear}
                </span>
              </div>
            </div>

            {/* Identificação do Contribuinte / Membro */}
            <div className="py-4 my-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-zinc-500 block">Doador / Contribuinte:</span>
                <strong className="text-sm text-zinc-900">{statementData.member.name}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block">CPF do Titular:</span>
                <strong className="text-sm font-mono text-zinc-900">{statementData.member.cpf}</strong>
              </div>
            </div>

            {/* Tabela Mensal de Contribuições */}
            <div className="overflow-x-auto my-4">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-800 border-b border-zinc-300">
                    <th className="py-2.5 px-3 font-black">Mês</th>
                    <th className="py-2.5 px-3 font-black text-right">Dízimos</th>
                    <th className="py-2.5 px-3 font-black text-right">Ofertas / Outros</th>
                    <th className="py-2.5 px-3 font-black text-right">Total do Mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {statementData.months.map((m: any) => (
                    <tr key={m.month} className="hover:bg-zinc-50">
                      <td className="py-2 px-3 font-semibold text-zinc-900">{m.monthName}</td>
                      <td className="py-2 px-3 font-mono text-right text-zinc-700">
                        {formatCurrency(m.totalTithe)}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-zinc-700">
                        {formatCurrency(m.totalOffering)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-right text-zinc-950">
                        {formatCurrency(m.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-100 border-t-2 border-zinc-400 font-black text-zinc-950 text-xs">
                    <td className="py-3 px-3 uppercase">Total Anual Consolidado</td>
                    <td className="py-3 px-3 font-mono text-right">
                      {formatCurrency(statementData.totals.tithe)}
                    </td>
                    <td className="py-3 px-3 font-mono text-right">
                      {formatCurrency(statementData.totals.offering)}
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-sm text-emerald-800">
                      {formatCurrency(statementData.totals.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Declaração e Assinatura */}
            <div className="pt-6 space-y-4 text-xs text-zinc-600 leading-relaxed">
              <p>
                Declaramos para os devidos fins de comprovação perante a <strong>Secretaria da Receita Federal do Brasil</strong> que os valores acima descritos foram efetivamente recebidos por esta entidade religiosa, sem qualquer contraprestação de bens ou serviços, configurando doações e dízimos voluntários no ano-calendário de <strong>{selectedYear}</strong>.
              </p>

              <div className="pt-8 text-center max-w-sm mx-auto">
                <div className="border-t border-zinc-400 pt-1.5">
                  <p className="font-bold text-sm text-zinc-900">{statementData.church.pastorName}</p>
                  <p className="text-[10px] uppercase text-zinc-500 font-semibold">Tesouraria / Representante Legal</p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                <span>Chave de Autenticidade: {statementData.verificationHash}</span>
                <span>Emissão: {format(new Date(statementData.issuedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
