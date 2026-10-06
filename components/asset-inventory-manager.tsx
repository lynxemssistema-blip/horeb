"use client";

import React, { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  Filter,
  DollarSign,
  MapPin,
  Tag,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit,
  Printer,
  FileSpreadsheet,
  Tv,
  Music,
  Armchair,
  Wind,
  Car,
  Building,
  Laptop,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  createChurchAsset,
  updateChurchAsset,
  deleteChurchAsset,
  getChurchAssets,
} from "@/app/actions/assets";

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  AUDIO_VISUAL: { label: "Som & Vídeo", icon: Tv, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  INSTRUMENT: { label: "Instrumentos", icon: Music, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  FURNITURE: { label: "Mobiliário", icon: Armchair, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  CLIMATE: { label: "Climatização", icon: Wind, color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  VEHICLE: { label: "Veículos", icon: Car, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  REAL_ESTATE: { label: "Imóveis", icon: Building, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  IT: { label: "Informática & TI", icon: Laptop, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
};

const CONDITION_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "Novo", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  GOOD: { label: "Bom Estado", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  NEEDS_REPAIR: { label: "Em Manutenção", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  RETIRED: { label: "Baixado", color: "bg-zinc-800 text-zinc-400 border-zinc-700" },
};

interface AssetInventoryManagerProps {
  slug: string;
  initialData: {
    tenant: any;
    assets: any[];
    metrics: any;
    currentUserRole: string;
  };
}

export function AssetInventoryManager({ slug, initialData }: AssetInventoryManagerProps) {
  const [assets, setAssets] = useState(initialData.assets);
  const [metrics, setMetrics] = useState(initialData.metrics);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [conditionFilter, setConditionFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  // Modais
  const [isNewAssetOpen, setIsNewAssetOpen] = useState(false);
  const [assetForLabel, setAssetForLabel] = useState<any | null>(null);
  const [assetForEdit, setAssetForEdit] = useState<any | null>(null);

  // Form states - Novo Bem
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("AUDIO_VISUAL");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const isLeader = ["ADMIN", "PASTOR", "LEADER", "SUPERADMIN"].includes(
    initialData.currentUserRole
  );

  // Filtragem dinâmica
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      !search.trim() ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || a.category === categoryFilter;
    const matchesCondition = conditionFilter === "ALL" || a.condition === conditionFilter;

    return matchesSearch && matchesCategory && matchesCondition;
  });

  // Handler: Cadastrar Bem
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      toast.error("Preencha o nome do bem e a localização.");
      return;
    }

    startTransition(async () => {
      const res = await createChurchAsset(slug, {
        name,
        code: code.trim() || undefined,
        category,
        invoiceNumber,
        purchaseDate,
        purchaseValue: Number(purchaseValue) || 0,
        location,
        condition,
        serialNumber,
        notes,
      });

      if (res.success && res.asset) {
        toast.success(res.message);
        setAssets((prev) => [res.asset, ...prev]);
        setMetrics((prev: any) => ({
          ...prev,
          totalAssets: prev.totalAssets + 1,
          totalPurchaseValue: prev.totalPurchaseValue + (Number(purchaseValue) || 0),
        }));
        setIsNewAssetOpen(false);
        setName("");
        setCode("");
        setInvoiceNumber("");
        setPurchaseDate("");
        setPurchaseValue("");
        setLocation("");
        setSerialNumber("");
        setNotes("");
      } else {
        toast.error(res.error || "Erro ao cadastrar bem patrimonial.");
      }
    });
  };

  // Handler: Excluir Bem
  const handleDeleteAsset = (assetId: string) => {
    if (!confirm("Tem certeza que deseja remover este bem do patrimônio?")) return;

    startTransition(async () => {
      const res = await deleteChurchAsset(slug, assetId);
      if (res.success) {
        toast.success(res.message);
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      } else {
        toast.error(res.error || "Erro ao excluir bem.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Principal */}
      <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-white/[0.08] p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="text-center sm:text-left space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wide">
              <Package className="w-4 h-4 text-amber-400" />
              <span>Gestão de Bens & Tombamento</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Patrimônio & Inventário da Congregação
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Controle físico e contábil de equipamentos de som, instrumentos, mobiliário, veículos e imóveis da igreja com etiquetas de patrimônio e código QR.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {isLeader && (
              <Button
                onClick={() => setIsNewAssetOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 px-4 rounded-xl gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Bem Patrimonial</span>
              </Button>
            )}

            <Button
              onClick={() => window.print()}
              variant="outline"
              className="border-white/10 bg-white/[0.04] hover:bg-white/10 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório</span>
            </Button>
          </div>
        </div>

        {/* Faixa de Indicadores de Patrimônio */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.08]">
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Total de Itens</span>
            <p className="text-2xl font-black text-white mt-0.5">{metrics.totalAssets}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Valor Patrimonial Total</span>
            <p className="text-2xl font-black text-amber-400 mt-0.5">
              {metrics.totalPurchaseValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Em Bom Estado / Novo</span>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{metrics.goodConditionCount}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Em Reparo / Manutenção</span>
            <p className="text-2xl font-black text-rose-400 mt-0.5">{metrics.needsRepairCount}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-white/[0.08] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            type="text"
            placeholder="Buscar por nome, tombamento ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filtro Categoria */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white"
          >
            <option value="ALL">Todas Categorias</option>
            {Object.entries(CATEGORY_MAP).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>

          {/* Filtro Estado */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="h-9 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white"
          >
            <option value="ALL">Todos os Estados</option>
            {Object.entries(CONDITION_MAP).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de Bens Patrimoniais */}
      {filteredAssets.length === 0 ? (
        <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">Nenhum bem patrimonial localizado</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            Cadastre os equipamentos, instrumentos e móveis da igreja para manter o inventário em dia.
          </p>
          {isLeader && (
            <Button
              onClick={() => setIsNewAssetOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl"
            >
              Cadastrar Primeiro Bem
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const cat = CATEGORY_MAP[asset.category] || CATEGORY_MAP.AUDIO_VISUAL;
            const cond = CONDITION_MAP[asset.condition] || CONDITION_MAP.GOOD;
            const Icon = cat.icon;

            return (
              <Card
                key={asset.id}
                className="rounded-3xl bg-zinc-950 border-white/[0.08] hover:border-amber-500/30 transition-all shadow-xl flex flex-col justify-between overflow-hidden"
              >
                <CardHeader className="pb-3 border-b border-white/[0.06]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] font-bold text-amber-400 block tracking-wider">
                        {asset.code}
                      </span>
                      <h3 className="text-base font-black text-white truncate leading-snug">
                        {asset.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{asset.location}</span>
                      </div>
                    </div>

                    <span
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${cat.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="py-4 space-y-3 flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Categoria:</span>
                    <span className="font-semibold text-white">{cat.label}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Estado de Conservação:</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${cond.color}`}
                    >
                      {cond.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Valor de Aquisição:</span>
                    <span className="font-mono font-bold text-white">
                      {asset.purchaseValue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>

                  {asset.purchaseDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Data de Compra:</span>
                      <span className="text-zinc-300 font-mono">
                        {format(new Date(asset.purchaseDate), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}

                  {asset.invoiceNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Nota Fiscal:</span>
                      <span className="text-zinc-300 font-mono">{asset.invoiceNumber}</span>
                    </div>
                  )}
                </CardContent>

                <div className="p-4 pt-0 border-t border-white/[0.04] flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssetForLabel(asset)}
                    className="h-8 px-3 rounded-xl text-xs font-bold border-white/10 hover:bg-white/10 text-zinc-300 gap-1.5 cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Etiqueta QR</span>
                  </Button>

                  {isLeader && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Excluir do patrimônio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO BEM PATRIMONIAL                                               */}
      {/* ========================================================================= */}
      <Dialog open={isNewAssetOpen} onOpenChange={setIsNewAssetOpen}>
        <DialogContent className="max-w-lg p-6 bg-zinc-950/95 border-white/10 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-white/[0.08]">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <span>Cadastrar Bem Patrimonial</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Registre os dados, notas fiscais e tombamento do equipamento ou móvel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAsset} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Descrição do Bem</Label>
              <Input
                type="text"
                placeholder="Ex: Mesa de Som Digital Behringer X32"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Categoria</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Localização / Sala</Label>
                <Input
                  type="text"
                  placeholder="Ex: Cabine de Som, Nave Principal"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Código Tombamento (Opcional)</Label>
                <Input
                  type="text"
                  placeholder="Deixe em branco para auto"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Valor de Compra (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={purchaseValue}
                  onChange={(e) => setPurchaseValue(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Estado de Conservação</Label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="NEW">Novo</option>
                  <option value="GOOD">Bom Estado</option>
                  <option value="NEEDS_REPAIR">Necessita Reparo</option>
                  <option value="RETIRED">Baixado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Nota Fiscal (NF)</Label>
                <Input
                  type="text"
                  placeholder="Ex: NF-e 12480"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Data de Aquisição</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Observações / Número de Série</Label>
              <Textarea
                rows={2}
                placeholder="Serial, garantia, fornecedor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white resize-none"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/[0.08]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewAssetOpen(false)}
                className="text-xs font-bold text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-5 rounded-xl cursor-pointer"
              >
                {isPending ? "Cadastrando..." : "Tombar Bem"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ETIQUETA DE TOMBAMENTO COM QR CODE                                  */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(assetForLabel)} onOpenChange={(open) => !open && setAssetForLabel(null)}>
        <DialogContent className="max-w-sm p-6 bg-zinc-950 border-white/10 rounded-3xl text-center">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-black text-white">
              Etiqueta de Patrimônio
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Imprima para afixar no bem físico para inventário rápido.
            </DialogDescription>
          </DialogHeader>

          {assetForLabel && (
            <div className="space-y-4 my-2">
              <div className="p-4 bg-white text-zinc-950 rounded-2xl border-2 border-zinc-900 space-y-2 shadow-xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block">
                  {initialData.tenant.name}
                </span>

                <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-xl inline-block">
                  <QRCodeSVG
                    value={`https://horeb.lynxems.com.br/${slug}/admin/patrimonio?code=${assetForLabel.code}`}
                    size={110}
                    level="H"
                  />
                </div>

                <div className="font-mono text-base font-black tracking-widest text-zinc-900">
                  {assetForLabel.code}
                </div>

                <p className="text-xs font-bold text-zinc-800 line-clamp-1">
                  {assetForLabel.name}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Local: {assetForLabel.location}
                </p>
              </div>

              <Button
                onClick={() => window.print()}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Etiqueta</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
