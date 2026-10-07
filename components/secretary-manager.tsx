"use client";

import React, { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  Printer,
  Trash2,
  Eye,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  Send,
  Loader2,
  Award,
  Heart,
  Baby,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createOfficialDocument,
  deleteOfficialDocument,
} from "@/app/actions/secretary";
import { OfficialDocumentViewer } from "@/components/official-document-viewer";

const DOCUMENT_TYPES = [
  { value: "ALL", label: "Todos os Documentos", icon: FileText },
  { value: "TRANSFER_LETTER", label: "Carta de Transferência", icon: Send },
  { value: "RECOMMENDATION_LETTER", label: "Carta de Recomendação", icon: CheckCircle2 },
  { value: "BAPTISM_CERTIFICATE", label: "Certificado de Batismo", icon: Award },
  { value: "CHILD_PRESENTATION", label: "Apresentação de Criança", icon: Baby },
  { value: "MARRIAGE_CERTIFICATE", label: "Certificado de Casamento", icon: Heart },
  { value: "ORDINATION_CERTIFICATE", label: "Consagração de Obreiro", icon: Users },
];

export function SecretaryManager({
  slug,
  tenant,
  initialDocuments,
  currentUserRole,
}: {
  slug: string;
  tenant: any;
  initialDocuments: any[];
  currentUserRole: string;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  // Modal de Emissão
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [docType, setDocType] = useState("BAPTISM_CERTIFICATE");
  const [recipientName, setRecipientName] = useState("");
  const [recipientCpf, setRecipientCpf] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [detailsInput, setDetailsInput] = useState<Record<string, string>>({});

  // Modal de Visualização de Documento
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      (doc.recipientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.documentNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.title || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedType !== "ALL" && doc.type !== selectedType) return false;
    return true;
  });

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      toast.error("Informe o nome do destinatário/membro.");
      return;
    }

    const typeConfig = DOCUMENT_TYPES.find((t) => t.value === docType);
    const title = typeConfig ? typeConfig.label : "Documento Oficial";

    startTransition(async () => {
      const res = await createOfficialDocument({
        slug,
        type: docType as any,
        title,
        recipientName,
        recipientCpf,
        recipientPhone,
        details: detailsInput,
      });

      if (res.success && res.document) {
        toast.success(res.message);
        setDocuments([res.document, ...documents]);
        setIsNewDocOpen(false);
        setRecipientName("");
        setRecipientCpf("");
        setRecipientPhone("");
        setDetailsInput({});
        setViewingDoc(res.document);
      } else {
        toast.error(res.error || "Falha ao emitir documento.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento do arquivo permanente?")) return;

    startTransition(async () => {
      const res = await deleteOfficialDocument(id, slug);
      if (res.success) {
        toast.success(res.message);
        setDocuments(documents.filter((d) => d.id !== id));
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-[1760px] 2xl:max-w-[1920px] w-full mx-auto pb-12">
      {/* Top Banner da Secretaria */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Secretaria Eclesiástica & Registros
          </span>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Emissão de Documentos & Certificados
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gere cartas de recomendação, transferências e certificados oficiais timbrados com validade eclesiástica.
          </p>
        </div>

        <Button
          onClick={() => setIsNewDocOpen(true)}
          className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 rounded-xl shadow-md cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Emitir Novo Documento</span>
        </Button>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou número..."
            className="pl-9 h-10 text-xs rounded-xl bg-card border-border"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {DOCUMENT_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type.value)}
              className="text-xs font-semibold rounded-xl shrink-0 cursor-pointer h-8"
            >
              <type.icon className="w-3.5 h-3.5 mr-1" />
              <span>{type.label.split(" ")[0]}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de Documentos Emitidos */}
      {filteredDocs.length === 0 ? (
        <Card className="rounded-3xl border-dashed p-10 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-sm font-semibold">Nenhum documento encontrado.</p>
          <p className="text-xs mt-1">Clique em "Emitir Novo Documento" para gerar certificados ou cartas.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const formattedDate = format(new Date(doc.issuedAt), "dd/MM/yyyy", { locale: ptBR });

            return (
              <Card
                key={doc.id}
                className="rounded-2xl bg-card border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-mono font-bold text-primary">{doc.documentNumber}</span>
                    <span>{formattedDate}</span>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground leading-snug">
                    {doc.recipientName}
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-muted-foreground">
                    {doc.title}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 border-t border-border/60 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {doc.recipientCpf ? `CPF: ${doc.recipientCpf}` : "Registro Eclesiástico"}
                  </div>

                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingDoc(doc)}
                      className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                      title="Visualizar e Imprimir"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: EMITIR NOVO DOCUMENTO */}
      <Dialog open={isNewDocOpen} onOpenChange={setIsNewDocOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-card border-border shadow-2xl p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Emitir Documento Oficial</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione o tipo de documento e informe os dados para emissão timbrada imediata.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDocument} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Tipo de Documento *</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-semibold focus:outline-primary"
              >
                {DOCUMENT_TYPES.filter((t) => t.value !== "ALL").map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Nome Completo do Destinatário *</label>
              <Input
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Ex: Carlos Eduardo Ferreira"
                className="h-10 text-xs rounded-xl bg-background border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">CPF (Opcional)</label>
                <Input
                  value={recipientCpf}
                  onChange={(e) => setRecipientCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-10 text-xs rounded-xl bg-background border-border font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Telefone / WhatsApp</label>
                <Input
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-10 text-xs rounded-xl bg-background border-border"
                />
              </div>
            </div>

            {/* Campos adicionais por tipo */}
            {docType === "TRANSFER_LETTER" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Igreja de Destino</label>
                <Input
                  value={detailsInput.targetChurch || ""}
                  onChange={(e) => setDetailsInput({ ...detailsInput, targetChurch: e.target.value })}
                  placeholder="Ex: Igreja Batista Memorial de Curitiba"
                  className="h-10 text-xs rounded-xl bg-background border-border"
                />
              </div>
            )}

            {docType === "BAPTISM_CERTIFICATE" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Data do Batismo</label>
                  <Input
                    type="date"
                    value={detailsInput.baptismDate || ""}
                    onChange={(e) => setDetailsInput({ ...detailsInput, baptismDate: e.target.value })}
                    className="h-10 text-xs rounded-xl bg-background border-border"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Pastor Oficiante</label>
                  <Input
                    value={detailsInput.officiantPastor || ""}
                    onChange={(e) => setDetailsInput({ ...detailsInput, officiantPastor: e.target.value })}
                    placeholder="Pastor Responsável"
                    className="h-10 text-xs rounded-xl bg-background border-border"
                  />
                </div>
              </div>
            )}

            {docType === "CHILD_PRESENTATION" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Nome do Pai</label>
                  <Input
                    value={detailsInput.fatherName || ""}
                    onChange={(e) => setDetailsInput({ ...detailsInput, fatherName: e.target.value })}
                    placeholder="Nome do Pai"
                    className="h-10 text-xs rounded-xl bg-background border-border"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Nome da Mãe</label>
                  <Input
                    value={detailsInput.motherName || ""}
                    onChange={(e) => setDetailsInput({ ...detailsInput, motherName: e.target.value })}
                    placeholder="Nome da Mãe"
                    className="h-10 text-xs rounded-xl bg-background border-border"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewDocOpen(false)}
                className="w-1/2 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="w-1/2 bg-primary text-primary-foreground font-bold text-xs rounded-xl cursor-pointer"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar Documento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: VISUALIZADOR DE DOCUMENTO */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-background border-border p-4 sm:p-6 shadow-2xl">
          {viewingDoc && (
            <OfficialDocumentViewer document={viewingDoc} church={tenant} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
