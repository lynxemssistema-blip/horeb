import { redirect } from "next/navigation";
import { getSession, createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import {
  Church,
  ArrowRight,
  Layers,
  Crown,
  ShieldCheck,
  Building2,
  Users,
  Wallet,
  Settings,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SelectChurchPage() {
  const session = await getSession();

  if (!session) {
    redirect("/?auth=required");
  }

  const isSuperAdmin = session.role === "SUPERADMIN" || session.originalRole === "SUPERADMIN";

  // Lista normalizada de congregações disponíveis
  let churchList: Array<{
    tenant: {
      id: string;
      name: string;
      slug: string;
      primaryColor: string;
      logoUrl: string | null;
      plan: string;
      status: string;
      parentId: string | null;
      parent?: { id: string; name: string; slug: string } | null;
      _count?: { users: number };
    };
    role: string;
  }> = [];

  if (isSuperAdmin) {
    // Superadmin: Carrega TODAS as congregações cadastradas no sistema
    const allTenants = await prisma.tenant.findMany({
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });

    churchList = allTenants.map((t) => ({
      tenant: t,
      role: "SUPERADMIN",
    }));
  } else {
    // Usuário comum ou Pastor: busca os vínculos multi-igreja explícitos
    const userAccesses = await prisma.userChurchAccess.findMany({
      where: { userId: session.userId },
      include: {
        tenant: {
          include: {
            parent: { select: { id: true, name: true, slug: true } },
            _count: { select: { users: true } },
          },
        },
      },
    });

    const accessMap = new Map<string, typeof churchList[0]>();

    for (const a of userAccesses) {
      accessMap.set(a.tenantId, {
        tenant: a.tenant,
        role: a.role,
      });
    }

    // Se o usuário é ADMIN ou PASTOR da Matriz, adicionar filiais vinculadas
    if (session.role === "ADMIN" || session.role === "PASTOR") {
      const branches = await prisma.tenant.findMany({
        where: { parentId: session.tenantId },
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { users: true } },
        },
      });

      for (const b of branches) {
        if (!accessMap.has(b.id)) {
          accessMap.set(b.id, {
            tenant: b,
            role: session.role,
          });
        }
      }
    }

    // Incluir a congregação base da sessão se não estiver na lista
    if (!accessMap.has(session.tenantId)) {
      const baseTenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { users: true } },
        },
      });
      if (baseTenant) {
        accessMap.set(baseTenant.id, {
          tenant: baseTenant,
          role: session.role,
        });
      }
    }

    churchList = Array.from(accessMap.values());

    // Se tiver apenas 1 congregação, redireciona direto
    if (churchList.length === 1) {
      redirect(`/${churchList[0].tenant.slug}`);
    }

    // Se não tiver nenhuma, manda para a home pública
    if (churchList.length === 0) {
      redirect("/");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#070709] flex flex-col items-center justify-start p-4 sm:p-8 text-zinc-100">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-amber-500/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-6 sm:space-y-8 my-auto py-6">
        {/* Header do Seletor */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto relative mb-2">
            <Image
              src="/logo-horeb.png"
              alt="Horeb"
              fill
              className="object-contain drop-shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Olá, {session.name}!
            </h1>
            {isSuperAdmin && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                SUPER ADMIN
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            {isSuperAdmin
              ? `Você possui autorização master para visualizar e alternar entre todas as ${churchList.length} congregações do ecossistema Horeb.`
              : "Você possui acesso autorizado a múltiplas congregações. Selecione onde deseja atuar agora:"}
          </p>
        </div>

        {/* Banner Master para Superadmin */}
        {isSuperAdmin && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Controle Global de Assinaturas e Configurações
                </p>
                <p className="text-[11px] text-zinc-400">
                  Acesse métricas de faturamento, central de e-mails Hostinger e agentes de IA no painel central.
                </p>
              </div>
            </div>

            <Link href="/admin">
              <Button
                size="sm"
                className="h-8 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shrink-0 gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Painel Super Admin</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Grade de Congregações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {churchList.map(({ tenant: t, role }) => {
            const isMatriz = !t.parentId;

            return (
              <div
                key={t.id}
                className="bg-zinc-900/90 border border-white/10 hover:border-amber-500/50 hover:bg-zinc-800/90 rounded-2xl p-4 sm:p-5 transition-all group flex flex-col justify-between gap-4 relative overflow-hidden shadow-xl"
              >
                {/* Faixa com cor primária da igreja */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: t.primaryColor || "#f59e0b" }}
                />

                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden shadow-inner"
                      style={{ backgroundColor: `${t.primaryColor || "#f59e0b"}20` }}
                    >
                      {t.logoUrl ? (
                        <img
                          src={t.logoUrl}
                          alt={t.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Church
                          className="w-5 h-5"
                          style={{ color: t.primaryColor || "#f59e0b" }}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 flex items-center gap-1">
                        {isMatriz ? (
                          <>
                            <Church className="w-3 h-3 text-amber-500" /> Matriz
                          </>
                        ) : (
                          <>
                            <Layers className="w-3 h-3 text-emerald-500" /> Filial
                          </>
                        )}
                      </span>

                      {t.plan && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                          {t.plan}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {t.name}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">/{t.slug}</p>
                    {t.parent && (
                      <p className="text-[11px] text-zinc-400 mt-1 truncate">
                        Sede: {t.parent.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Users className="w-3 h-3 text-zinc-500" />
                      {t._count?.users ?? 0} membros
                    </span>
                    <span className="text-[10px] uppercase font-bold text-amber-400/90">
                      {isSuperAdmin ? "Acesso Master" : role}
                    </span>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await createSession({
                        userId: session.userId,
                        email: session.email,
                        name: session.name,
                        avatarUrl: session.avatarUrl || null,
                        role: isSuperAdmin ? "SUPERADMIN" : role,
                        tenantId: t.id,
                        tenantSlug: t.slug,
                      });
                      redirect(`/${t.slug}`);
                    }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-9 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-amber-500 hover:text-black text-white justify-between transition-all cursor-pointer group-hover:bg-amber-500 group-hover:text-black shadow-sm"
                    >
                      <span>Acessar Congregação</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
