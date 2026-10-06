"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, Download, Church, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfficialDocumentViewerProps {
  document: {
    id: string;
    documentNumber: string;
    type: string;
    title: string;
    recipientName: string;
    recipientCpf?: string | null;
    recipientPhone?: string | null;
    details?: string | null;
    issuedAt: Date | string;
  };
  church: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    primaryColor?: string;
    pastorName?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pixKey?: string | null;
  };
}

export function OfficialDocumentViewer({ document: doc, church }: OfficialDocumentViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const issuedDate = format(new Date(doc.issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const cityState = [church.city, church.state].filter(Boolean).join(" - ") || "Brasil";

  let parsedDetails: Record<string, any> = {};
  try {
    if (doc.details) {
      parsedDetails = JSON.parse(doc.details);
    }
  } catch {}

  const handlePrint = () => {
    window.print();
  };

  // Gerar o corpo do texto de acordo com o tipo do documento
  const renderDocumentBody = () => {
    switch (doc.type) {
      case "BAPTISM_CERTIFICATE":
        return (
          <div className="space-y-6 text-center">
            <p className="text-base text-zinc-700 leading-relaxed">
              Certificamos que o(a) amado(a) irmão(ã)
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-zinc-950 uppercase tracking-wide py-2 border-b-2 border-zinc-200 inline-block px-8">
              {doc.recipientName}
            </h2>
            {doc.recipientCpf && (
              <p className="text-xs text-zinc-500 font-mono">CPF: {doc.recipientCpf}</p>
            )}
            <p className="text-base text-zinc-700 leading-relaxed max-w-xl mx-auto">
              Tendo confessado publicamente a sua fé no Senhor Jesus Cristo, desceu às águas batismais
              em obediência à Palavra de Deus, no dia{" "}
              <strong>{parsedDetails.baptismDate || issuedDate}</strong>, sendo ministrado pelo{" "}
              <strong>{parsedDetails.officiantPastor || church.pastorName || "Pastor da Igreja"}</strong>.
            </p>
            <p className="text-sm italic text-zinc-500 max-w-md mx-auto pt-4">
              &ldquo;Portanto ide, fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo.&rdquo; — Mateus 28:19
            </p>
          </div>
        );

      case "TRANSFER_LETTER":
        return (
          <div className="space-y-5 text-justify leading-relaxed text-zinc-800 text-sm sm:text-base">
            <p>
              <strong>À estimada liderança eclesiástica da:</strong>{" "}
              {parsedDetails.targetChurch || "Igreja Cristã Co-Irmã"}
            </p>
            <p><strong>A Paz do Senhor Jesus Cristo!</strong></p>
            <p>
              Vimos por meio desta solicitar o acolhimento do(a) irmão(ã){" "}
              <strong>{doc.recipientName}</strong>
              {doc.recipientCpf ? `, portador(a) do CPF nº ${doc.recipientCpf}` : ""}, que até a presente data foi membro em plena comunhão e com testemunho digno do evangelho na congregação{" "}
              <strong>{church.name}</strong>.
            </p>
            <p>
              Transferindo sua residência e membresia por motivos pessoais, rogamos que o(a) recebam com o mesmo afeto e cuidado pastoral no corpo de Cristo.
            </p>
            <p className="pt-2">Fraternalmente em Cristo Jesus,</p>
          </div>
        );

      case "RECOMMENDATION_LETTER":
        return (
          <div className="space-y-5 text-justify leading-relaxed text-zinc-800 text-sm sm:text-base">
            <p><strong>A quem possa interessar,</strong></p>
            <p>
              Recomendamos calorosamente o(a) estimado(a) irmão(ã){" "}
              <strong>{doc.recipientName}</strong>
              {doc.recipientCpf ? `, CPF nº ${doc.recipientCpf}` : ""}, membro idôneo desta congregação, onde sempre cooperou com dedicação, respeito às autoridades eclesiais e zelo pela obra de Deus.
            </p>
            <p>
              {parsedDetails.reason ||
                "Pedimos aos amados irmãos que lhe dispensem acolhimento e auxílio naquilo que lhe for necessário durante o período de sua permanência."}
            </p>
            <p className="pt-2">Em fraterna comunhão cristã,</p>
          </div>
        );

      case "CHILD_PRESENTATION":
        return (
          <div className="space-y-6 text-center">
            <p className="text-base text-zinc-700">Certificamos que a criança</p>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-zinc-950 uppercase tracking-wide py-2 border-b-2 border-zinc-200 inline-block px-8">
              {doc.recipientName}
            </h2>
            <p className="text-sm text-zinc-600">
              Nascida em <strong>{parsedDetails.birthDate || "data oportuna"}</strong>, filha de{" "}
              <strong>{parsedDetails.fatherName || "Pai"}</strong> e{" "}
              <strong>{parsedDetails.motherName || "Mãe"}</strong>
            </p>
            <p className="text-base text-zinc-700 leading-relaxed max-w-xl mx-auto">
              Foi solenemente apresentada ao Senhor Jesus Cristo no altar da igreja, sob a bênção e oração pastoral, no dia{" "}
              <strong>{issuedDate}</strong>.
            </p>
            <p className="text-sm italic text-zinc-500 max-w-md mx-auto pt-4">
              &ldquo;Deixai vir a mim os pequeninos e não os impeçais, porque dos tais é o Reino de Deus.&rdquo; — Marcos 10:14
            </p>
          </div>
        );

      default:
        return (
          <div className="space-y-5 text-justify leading-relaxed text-zinc-800 text-sm sm:text-base">
            <h3 className="text-xl font-bold text-center text-zinc-900 pb-2">{doc.title}</h3>
            <p>
              Certificamos para os devidos fins que <strong>{doc.recipientName}</strong>
              {doc.recipientCpf ? `, CPF nº ${doc.recipientCpf}` : ""}, está registrado nos anais da congregação{" "}
              <strong>{church.name}</strong> para os fins a que este se destina.
            </p>
            {parsedDetails.customText && <p>{parsedDetails.customText}</p>}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Botões de Ação */}
      <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border shadow-sm print:hidden">
        <span className="text-xs font-bold text-muted-foreground">
          Registro: <strong className="text-foreground font-mono">{doc.documentNumber}</strong>
        </span>

        <Button
          onClick={handlePrint}
          className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 rounded-xl cursor-pointer shadow-md"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / Salvar em PDF</span>
        </Button>
      </div>

      {/* DOCUMENTO TIMBRADO OFICIAL (Imprimível) */}
      <div
        ref={printRef}
        className="bg-white text-zinc-950 p-8 sm:p-14 rounded-3xl border-2 border-zinc-200 shadow-2xl relative overflow-hidden font-sans print:border-none print:shadow-none print:p-6"
        style={{ minHeight: "800px" }}
      >
        {/* Moldura Interna Clássica Eclesial */}
        <div className="border border-zinc-300 rounded-2xl p-6 sm:p-10 h-full flex flex-col justify-between relative">
          {/* Cabeçalho Oficial da Congregação */}
          <div className="text-center pb-8 border-b-2 border-zinc-200 space-y-2">
            {church.logoUrl && (
              <img
                src={church.logoUrl}
                alt={church.name}
                className="w-16 h-16 object-contain mx-auto mb-2 rounded-xl"
              />
            )}
            <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-wider text-zinc-900">
              {church.name}
            </h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
              {church.address ? `${church.address} • ${cityState}` : cityState}
              {church.pixKey && ` • CNPJ: ${church.pixKey}`}
            </p>
            <div className="pt-2">
              <span className="inline-block px-4 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-mono font-bold tracking-widest border border-zinc-200">
                REGISTRO: {doc.documentNumber}
              </span>
            </div>
          </div>

          {/* Título do Documento */}
          <div className="text-center py-6">
            <h2 className="text-xl sm:text-2xl font-serif font-black uppercase text-zinc-800 tracking-wide">
              {doc.title}
            </h2>
          </div>

          {/* Corpo do Documento */}
          <div className="my-auto py-4">
            {renderDocumentBody()}
          </div>

          {/* Data e Assinaturas Formais */}
          <div className="pt-12 text-center space-y-8">
            <p className="text-xs text-zinc-600 font-serif">
              {cityState}, {issuedDate}.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 max-w-lg mx-auto">
              <div className="border-t border-zinc-400 pt-2 text-center">
                <p className="font-bold text-sm text-zinc-900 leading-tight">
                  {church.pastorName || "Pastor Presidente"}
                </p>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Pastor da Igreja</p>
              </div>

              <div className="border-t border-zinc-400 pt-2 text-center">
                <p className="font-bold text-sm text-zinc-900 leading-tight">Secretaria Eclesiástica</p>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Oficial de Registro</p>
              </div>
            </div>

            {/* Rodapé Tecnológico */}
            <div className="pt-6 border-t border-zinc-100 text-[9px] text-zinc-400 font-mono flex items-center justify-between">
              <span>Autenticidade: {doc.documentNumber}</span>
              <span>Emitido digitalmente via Sistema Horeb</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
