import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  MessageCircle,
  Sparkles,
} from "lucide-react";

interface CelulasPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CelulasPage({ params }: CelulasPageProps) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      cellGroups: {
        include: { leader: true },
      },
    },
  });

  if (!tenant) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Início</span>
        </Link>
        <span className="text-xs text-muted-foreground">
          {tenant.cellGroups.length} Célula(s) ativa(s)
        </span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="w-7 h-7 text-primary" />
          <span>Células & Pequenos Grupos</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A igreja nos lares: comunhão, edificação da fé e amizade cristã na {tenant.name}.
        </p>
      </div>

      {/* Grid de Células */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tenant.cellGroups.map((cell) => (
          <Card key={cell.id} className="border-border/80 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  Encontro Semanal
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Quartas-feiras
                </span>
              </div>
              <CardTitle className="text-lg font-bold text-foreground mt-1">
                {cell.name}
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Horário: 20:00</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5" />
                <span>Bairro Central</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="py-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center gap-3">
                <Avatar className="h-9 w-9 ring-1 ring-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {cell.leader ? cell.leader.name.charAt(0) : "L"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                    Líder de Célula
                  </span>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {cell.leader ? cell.leader.name : "Liderança Designada"}
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 flex items-center justify-between gap-2 border-t border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Vagas Abertas
              </span>
              <Button size="sm" className="text-xs gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                Falar com Líder
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
