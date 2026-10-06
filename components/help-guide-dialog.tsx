"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  BookOpen,
  Sparkles,
  Church,
  GitBranch,
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Baby,
  QrCode,
  HeartHandshake,
  Layers,
  ArrowRight,
  UserCheck,
  Smartphone,
  Tv,
  Crown,
  KeyRound,
  Mail,
  Zap,
} from "lucide-react";

interface HelpGuideDialogProps {
  triggerButton?: React.ReactNode;
}

export function HelpGuideDialog({ triggerButton }: HelpGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("passo-a-passo");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl border-amber-500/30 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer shadow-sm"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Como Funciona o App • Guia Completo</span>
            </Button>
          )
        }
      />

      <DialogContent className="w-[94vw] max-w-3xl max-h-[88dvh] flex flex-col p-0 overflow-hidden bg-card border border-border rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-card-foreground">
        {/* Glow de Iluminação */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 bg-amber-500/15 blur-3xl rounded-full" />

        {/* Header Fixo */}
        <div className="p-5 sm:p-6 pb-2 shrink-0 border-b border-border relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] font-bold tracking-wider uppercase w-fit">
            <BookOpen className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Central de Ajuda & Guia Operacional • Horeb</span>
          </div>
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span>Manual do Horeb: Como Funciona o Ecossistema</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Entenda tudo sobre Matriz, Filiais, níveis de liderança, passo a passo do primeiro acesso e os recursos por plano.
            </DialogDescription>
          </div>
        </div>

        {/* Abas e Conteúdo com Scroll Interno */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0 relative z-10"
        >
          {/* Seletor Segmentado de Abas Fixo */}
          <div className="px-5 sm:px-6 pt-3 shrink-0">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto bg-zinc-900/90 border border-white/[0.08] p-1 rounded-xl gap-1">
              <TabsTrigger
                value="passo-a-passo"
                className="text-xs font-bold text-zinc-300 hover:text-white data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black rounded-lg py-1.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                <span>1. Primeiro Acesso</span>
              </TabsTrigger>
              <TabsTrigger
                value="matriz-filial"
                className="text-xs font-bold text-zinc-300 hover:text-white data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black rounded-lg py-1.5 transition-all"
              >
                <GitBranch className="w-3.5 h-3.5 mr-1" />
                <span>2. Matriz & Filiais</span>
              </TabsTrigger>
              <TabsTrigger
                value="pessoas-acesso"
                className="text-xs font-bold text-zinc-300 hover:text-white data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black rounded-lg py-1.5 transition-all"
              >
                <Users className="w-3.5 h-3.5 mr-1" />
                <span>3. Pessoas & Perfis</span>
              </TabsTrigger>
              <TabsTrigger
                value="planos-recursos"
                className="text-xs font-bold text-zinc-300 hover:text-white data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black rounded-lg py-1.5 transition-all"
              >
                <Crown className="w-3.5 h-3.5 mr-1" />
                <span>4. Planos & Recursos</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: PASSO A PASSO PRIMEIRO ACESSO */}
          <TabsContent
            value="passo-a-passo"
            className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 touch-pan-y overscroll-contain"
          >
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Bem-vindo ao Horeb! Preparamos um roteiro passo a passo para o pastor ou líder implantar o sistema na igreja em menos de 5 minutos.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  step: "Passo 1",
                  title: "Cadastro da Igreja Sede (Matriz) e Criação do Usuário Master",
                  desc: "Na página inicial, clique em 'Cadastrar Minha Igreja'. Informe o nome do Pastor Presidente, e-mail oficial de login, senha segura, o nome da congregação e escolha a cor primária da sua marca (White-Label).",
                  icon: Church,
                },
                {
                  step: "Passo 2",
                  title: "Ativação com Código de 6 Dígitos por E-mail",
                  desc: "Por segurança contra acessos indevidos, nosso servidor Hostinger SMTP dispara um código numérico de 6 dígitos para o e-mail do pastor. Digite o código no modal para ativar sua conta instantaneamente.",
                  icon: KeyRound,
                },
                {
                  step: "Passo 3",
                  title: "Upload do Logo e Dados da Igreja no Banco de Dados",
                  desc: "Acesse 'Configurações da Igreja' no menu lateral. Faça o upload da imagem do logo da sua igreja. O arquivo é convertido em Base64 e gravado diretamente no banco de dados com máxima velocidade, sem depender de links externos. Configure também endereço, telefone e pastor presidente.",
                  icon: ShieldCheck,
                },
                {
                  step: "Passo 4",
                  title: "Configurar a Chave PIX e Valores Sugeridos",
                  desc: "Informe a chave PIX oficial da igreja (CNPJ, celular, e-mail) e defina os valores rápidos de oferta sugeridos (ex: 30, 50, 100, 200, 500). Os membros poderão contribuir com QR Code ou Copia e Cola em 10 segundos no celular.",
                  icon: QrCode,
                },
                {
                  step: "Passo 5",
                  title: "Convidar Líderes de Ministérios e Células",
                  desc: "No menu 'Membros & Convites', cadastre os pastores auxiliares, líderes de louvor, diaconia e células, ou gere um link de convite direto para que eles completem o cadastro com seus próprios acessos.",
                  icon: Users,
                },
                {
                  step: "Passo 6",
                  title: "Como os Membros Acessam (PWA no Celular)",
                  desc: "Os membros acessam a URL da sua igreja (ex: horeb.lynxems.com.br/sua-igreja). Clicam no botão 'Quero me Cadastrar' no topo, recebem a confirmação por e-mail e passam a ter acesso às células, devocionais, cultos online e dízimos.",
                  icon: Smartphone,
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-amber-500/30 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                        {item.step}
                      </span>
                      <Icon className="w-4 h-4 text-zinc-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: MATRIZ VS FILIAIS */}
          <TabsContent
            value="matriz-filial"
            className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 touch-pan-y overscroll-contain"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-amber-500/10 border border-white/10 space-y-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-400" />
                <span>Hierarquia Multi-Tenant: Matriz e Filiais Integradas</span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                O Horeb foi arquitetado para permitir que uma igreja sede (Matriz) expanda o ministério com quantas filiais, congregações de bairro ou campus regionais desejar, tudo integrado em uma mesma rede de liderança.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Matriz */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Church className="w-4 h-4" />
                  <span>Igreja Sede (Matriz)</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Possui autoridade para cadastrar novas filiais vinculadas.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Visão unificada de membros e finanças de toda a rede.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Gerencia a assinatura e upgrades da denominação.</span>
                  </li>
                </ul>
              </div>

              {/* Card Filial */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400">
                  <GitBranch className="w-4 h-4" />
                  <span>Congregação Filial (Campus)</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Possui URL e slug próprio (ex: /videira-sul).</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Células nos bairros e horários de cultos locais.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Chave PIX independente para dízimos daquela congregação.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Regra Importante de Segurança & Acesso às Igrejas:
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Por política rigorosa de isolamento multi-tenant, <strong>usuários não logados não acessam nenhuma página interna</strong>, a não ser a página principal do app para se registrar ou autenticar. Usuários logados <strong>só têm acesso às congregações às quais pertencem</strong> ou para as quais o Pastor Master concedeu autorização formal no painel de membros.
              </p>
            </div>
          </TabsContent>

          {/* TAB 3: PESSOAS & PERFIS */}
          <TabsContent
            value="pessoas-acesso"
            className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 touch-pan-y overscroll-contain"
          >
            <div className="space-y-3">
              {[
                {
                  role: "Super Admin (SaaS Manager)",
                  user: "Edson Manoel (edsonmanoel2012@gmail.com) • Lynx EMS Sistemas",
                  desc: "Acesso irrestrito ao painel geral do Horeb (/admin). Gerencia todos os planos comerciais, assinaturas das igrejas, métricas financeiras MRR, central de e-mails Hostinger SMTP/IMAP e cupons de promoção.",
                  color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
                  badge: "Acesso Total",
                },
                {
                  role: "Pastor Presidente / Master da Igreja",
                  user: "O titular que realizou o cadastro inicial da congregação",
                  desc: "Administra todos os dados da Matriz e de suas filiais. Define a cor da marca, chave PIX, cadastra e remove usuários, cria ministérios ilimitados e altera níveis de acesso para qualquer pessoa da igreja.",
                  color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
                  badge: "Gestor Master",
                },
                {
                  role: "Pastores Auxiliares & Líderes de Ministérios",
                  user: "Líderes de Louvor, Diaconia, Família, Jovens, Missões",
                  desc: "Acessam os painéis de seus ministérios, organizam escalas de serviço nos cultos, gerenciam voluntários e comunicados oficiais aos membros do grupo.",
                  color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
                  badge: "Liderança",
                },
                {
                  role: "Líderes de Célula (Pequenos Grupos)",
                  user: "Líderes e anfitriões das reuniões nos lares",
                  desc: "Acessam a lista de membros da sua célula, registram novos participantes, controlam presença e se comunicam diretamente com os membros via WhatsApp.",
                  color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                  badge: "Células",
                },
                {
                  role: "Equipe do Ministério Kids",
                  user: "Professores e voluntários do espaço infantil",
                  desc: "Operam o Check-in Kids com geração de código de 4 dígitos e etiqueta de identificação, garantindo segurança na entrega das crianças aos pais após o culto.",
                  color: "text-pink-400 border-pink-500/30 bg-pink-500/10",
                  badge: "Kids",
                },
                {
                  role: "Membros & Visitantes",
                  user: "Qualquer pessoa que frequenta a igreja",
                  desc: "Utilizam o app no celular como PWA. Ofertam via PIX em segundos, enviam pedidos de oração sigilosos, encontram células próximas e assistem aos cultos online no YouTube.",
                  color: "text-zinc-300 border-white/10 bg-white/5",
                  badge: "Membro",
                },
              ].map((p, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{p.role}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.color}`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">{p.user}</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 4: PLANOS & RECURSOS */}
          <TabsContent
            value="planos-recursos"
            className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 touch-pan-y overscroll-contain"
          >
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              Cada igreja tem acesso às funcionalidades de acordo com o plano contratado. Upgrades podem ser solicitados a qualquer momento com ativação imediata.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Essencial */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">Essencial</span>
                    <span className="text-xs font-bold text-amber-400">R$ 149/mês</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Implantação: R$ 490</p>
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-zinc-300">
                    <p className="font-bold text-zinc-200">Recursos Inclusos:</p>
                    <p>✓ Cadastro de membros e visitantes</p>
                    <p>✓ Área do membro PWA no celular</p>
                    <p>✓ Mural e comunicados oficiais</p>
                    <p>✓ Agenda de cultos semanais</p>
                    <p>✓ Pedidos de oração interativos</p>
                    <p>✓ Devocionais diários</p>
                    <p>✓ Dízimos & Ofertas via PIX Instantâneo</p>
                    <p>✓ Notificações para membros</p>
                    <p>✓ Painel administrativo de liderança</p>
                    <p>✓ Suporte via WhatsApp</p>
                  </div>
                </div>
              </div>

              {/* Gestão */}
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/40 shadow-lg space-y-3 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">Gestão</span>
                    <span className="text-xs font-black text-amber-400">R$ 249/mês</span>
                  </div>
                  <p className="text-[10px] font-black uppercase text-amber-400">Mais Escolhido</p>
                  <p className="text-[11px] text-zinc-400">Implantação: R$ 790</p>
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-zinc-300">
                    <p className="font-bold text-amber-400">Tudo do Essencial, mais:</p>
                    <p>★ Gestão completa de Ministérios e Líderes</p>
                    <p>★ Células e Pequenos Grupos nos lares</p>
                    <p>★ Escalas de louvor, equipes e diaconia</p>
                    <p>★ Controle de presença nos cultos</p>
                    <p>★ Gestão de eventos e inscrições</p>
                    <p>★ Gestão Financeira com relatórios</p>
                    <p>★ Segmentação inteligente de membros</p>
                    <p>★ Notificações segmentadas por grupos</p>
                    <p>★ Suporte prioritário ágil</p>
                  </div>
                </div>
              </div>

              {/* Premium */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-purple-500/40 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">Premium</span>
                    <span className="text-xs font-bold text-purple-400">R$ 399/mês</span>
                  </div>
                  <p className="text-[10px] font-black uppercase text-purple-400">Multissede VIP</p>
                  <p className="text-[11px] text-zinc-400">Implantação: R$ 1290</p>
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-zinc-300">
                    <p className="font-bold text-purple-400">Tudo do Gestão, mais:</p>
                    <p>👑 Múltiplas congregações (Matriz e Filiais)</p>
                    <p>👑 Gestão avançada de pastores e rede</p>
                    <p>👑 EBD (Escola Bíblica Dominical) e cursos</p>
                    <p>👑 Check-in Kids seguro com etiquetas</p>
                    <p>👑 Relatórios analíticos e auditoria</p>
                    <p>👑 Permissões granulares</p>
                    <p>👑 Personalizações exclusivas de cores</p>
                    <p>👑 Integrações via API e automações</p>
                    <p>👑 Suporte VIP com gerente dedicado</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
