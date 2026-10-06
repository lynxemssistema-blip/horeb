"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getSundaySchoolDashboard(slug: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        logoUrl: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    // 1. Buscar ou Inicializar Trilha de Discipulado Padrão se nenhuma existir
    let tracks = await prisma.discipleshipTrack.findMany({
      where: { tenantId: tenant.id },
      include: {
        steps: { orderBy: { order: "asc" } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (tracks.length === 0) {
      const defaultTrack = await prisma.discipleshipTrack.create({
        data: {
          tenantId: tenant.id,
          title: "Trilha do Novo Convertido — Da Decisão ao Ministério",
          description: "Jornada bíblica de 4 etapas para acolhimento, batismo e integração eclesial.",
          steps: {
            create: [
              {
                order: 1,
                title: "1. Acolhimento & Boas-Vindas",
                description: "Visita pastoral/líder, entrega do kit do novo convertido e oração de recepção.",
              },
              {
                order: 2,
                title: "2. Preparação para o Batismo",
                description: "Estudo sobre fé, arrependimento, salvação e o significado do batismo bíblico.",
              },
              {
                order: 3,
                title: "3. Fundamentos da Vida Cristã",
                description: "Aprender a orar, leitura diária da Palavra, santidade, dízimos e serviço.",
              },
              {
                order: 4,
                title: "4. Integração em Ministério & Célula",
                description: "Descoberta de dons espirituais e encaminhamento para um departamento ativo.",
              },
            ],
          },
        },
        include: {
          steps: { orderBy: { order: "asc" } },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true, role: true },
              },
            },
          },
        },
      });
      tracks = [defaultTrack];
    }

    // 2. Buscar Turmas da EBD com últimas presenças
    const classes = await prisma.sundaySchoolClass.findMany({
      where: { tenantId: tenant.id },
      include: {
        attendances: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
      orderBy: { name: "asc" },
    });

    // 3. Buscar Membros para formulários de professores e discípulos
    const members = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    // 4. Calcular Métricas Consolidadas
    let totalAttendanceLastSession = 0;
    let totalVisitorsLastSession = 0;
    let totalBiblesLastSession = 0;
    let totalOfferingsLastSession = 0;

    classes.forEach((c) => {
      const latest = c.attendances[0];
      if (latest) {
        totalAttendanceLastSession += latest.totalMembers;
        totalVisitorsLastSession += latest.totalVisitors;
        totalBiblesLastSession += latest.biblesCount;
        totalOfferingsLastSession += latest.offeringAmount;
      }
    });

    return {
      success: true,
      tenant,
      classes,
      tracks,
      members,
      currentUserRole: session.role,
      metrics: {
        totalClasses: classes.length,
        totalAttendanceLastSession,
        totalVisitorsLastSession,
        totalBiblesLastSession,
        totalOfferingsLastSession,
        totalDisciples: tracks.reduce((acc, t) => acc + t.members.length, 0),
      },
    };
  } catch (error: any) {
    console.error("Erro ao carregar dados da EBD:", error);
    return { success: false, error: "Falha ao carregar dados da Escola Bíblica." };
  }
}

export async function createSundaySchoolClass(
  slug: string,
  data: {
    name: string;
    description?: string;
    room?: string;
    ageRange?: string;
    teacherName?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR", "LEADER"].includes(session.role)) {
      return { success: false, error: "Apenas administradores e líderes podem cadastrar turmas." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const newClass = await prisma.sundaySchoolClass.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        description: data.description || null,
        room: data.room || null,
        ageRange: data.ageRange || null,
        teacherName: data.teacherName || null,
      },
    });

    revalidatePath(`/${slug}/admin/ebd`);
    return {
      success: true,
      message: `Turma "${newClass.name}" criada com sucesso!`,
      class: newClass,
    };
  } catch (error: any) {
    console.error("Erro ao criar classe EBD:", error);
    return { success: false, error: "Erro ao criar turma de EBD." };
  }
}

export async function recordSundaySchoolAttendance(
  slug: string,
  data: {
    classId: string;
    date?: string;
    lessonTitle?: string;
    totalMembers: number;
    totalVisitors: number;
    biblesCount: number;
    magazinesCount: number;
    offeringAmount: number;
    notes?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const attendance = await prisma.sundaySchoolAttendance.create({
      data: {
        classId: data.classId,
        date: data.date ? new Date(data.date) : new Date(),
        lessonTitle: data.lessonTitle || null,
        totalMembers: Number(data.totalMembers) || 0,
        totalVisitors: Number(data.totalVisitors) || 0,
        biblesCount: Number(data.biblesCount) || 0,
        magazinesCount: Number(data.magazinesCount) || 0,
        offeringAmount: Number(data.offeringAmount) || 0,
        notes: data.notes || null,
        recordedBy: session.name || "Professor EBD",
      },
    });

    revalidatePath(`/${slug}/admin/ebd`);
    return {
      success: true,
      message: "Relatório de presença do domingo lançado com sucesso!",
      attendance,
    };
  } catch (error: any) {
    console.error("Erro ao registrar presença EBD:", error);
    return { success: false, error: "Falha ao registrar relatório de presença da EBD." };
  }
}

export async function enrollMemberInDiscipleship(
  slug: string,
  data: {
    trackId: string;
    userId: string;
    mentorName?: string;
    notes?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const progress = await prisma.memberDiscipleshipProgress.upsert({
      where: {
        trackId_userId: {
          trackId: data.trackId,
          userId: data.userId,
        },
      },
      update: {
        mentorName: data.mentorName || null,
        notes: data.notes || null,
      },
      create: {
        trackId: data.trackId,
        userId: data.userId,
        currentStep: 1,
        status: "IN_PROGRESS",
        mentorName: data.mentorName || null,
        notes: data.notes || null,
      },
    });

    revalidatePath(`/${slug}/admin/ebd`);
    return {
      success: true,
      message: "Membro matriculado na trilha de discipulado com sucesso!",
      progress,
    };
  } catch (error: any) {
    console.error("Erro ao matricular membro no discipulado:", error);
    return { success: false, error: "Falha ao matricular membro na trilha." };
  }
}

export async function updateDiscipleshipProgress(
  slug: string,
  progressId: string,
  data: {
    currentStep: number;
    status: string;
    mentorName?: string;
    notes?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const isCompleted = data.status === "COMPLETED";

    const updated = await prisma.memberDiscipleshipProgress.update({
      where: { id: progressId },
      data: {
        currentStep: Number(data.currentStep),
        status: data.status,
        mentorName: data.mentorName,
        notes: data.notes,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    revalidatePath(`/${slug}/admin/ebd`);
    return {
      success: true,
      message: isCompleted
        ? "Parabéns! O discípulo concluiu a trilha com êxito!"
        : "Progresso do discípulo atualizado com sucesso!",
      progress: updated,
    };
  } catch (error: any) {
    console.error("Erro ao atualizar progresso de discipulado:", error);
    return { success: false, error: "Falha ao atualizar progresso do discípulo." };
  }
}
