import { redirect } from "next/navigation";
import { getSession, createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { Church, ArrowRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SelectChurchPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/");
  }

  // Se for SUPERADMIN, não precisa escolher aqui, vai pro admin
  if (session.role === "SUPERADMIN") {
    redirect("/admin");
  }

  // Buscar todos os acessos do usuário
  const accesses = await prisma.userChurchAccess.findMany({
    where: { userId: session.userId },
    include: { tenant: { include: { parent: true } } },
  });

  // Se tiver só 1, já redireciona (failsafe)
  if (accesses.length === 1) {
    redirect(`/${accesses[0].tenant.slug}`);
  }

  // Se não tiver nenhum (erro), manda pra index
  if (accesses.length === 0) {
    redirect("/");
  }

  return (
    <div className="min-h-[100dvh] bg-[#070709] flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-3xl space-y-8">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto relative mb-4">
            <Image
              src="/logo-horeb.png"
              alt="Horeb"
              fill
              className="object-contain drop-shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            />
          </div>
          <h1 className="text-3xl font-black text-white">Bem-vindo de volta, {session.name}!</h1>
          <p className="text-zinc-400">
            Você possui acesso a múltiplas congregações. Escolha em qual deseja entrar agora:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accesses.map((access) => {
            const t = access.tenant;
            const isMatriz = !t.parentId;
            
            return (
              <form key={t.id} action={async () => {
                "use server";
                // Atualizar a sessão para a igreja selecionada
                await createSession({
                  userId: session.userId,
                  email: session.email,
                  name: session.name,
                  role: access.role,
                  tenantId: t.id,
                  tenantSlug: t.slug,
                });
                redirect(`/${t.slug}`);
              }}>
                <button
                  type="submit"
                  className="w-full text-left bg-zinc-900/80 border border-white/10 hover:border-amber-500/50 hover:bg-zinc-800/80 rounded-2xl p-5 transition-all group flex flex-col gap-3 relative overflow-hidden h-full shadow-xl"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: t.primaryColor }}
                  />
                  
                  <div className="flex justify-between items-start">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                      style={{ backgroundColor: `${t.primaryColor}20` }}
                    >
                      {t.logoUrl ? (
                        <img src={t.logoUrl} alt={t.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Church className="w-5 h-5" style={{ color: t.primaryColor }} />
                      )}
                    </div>
                    
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 flex items-center gap-1">
                      {isMatriz ? (
                        <><Church className="w-3 h-3 text-amber-500" /> Matriz</>
                      ) : (
                        <><Layers className="w-3 h-3 text-emerald-500" /> Filial</>
                      )}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-1">/{t.slug}</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-auto pt-2 text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
                    <span>Acessar</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </form>
            );
          })}
        </div>
      </div>
    </div>
  );
}
