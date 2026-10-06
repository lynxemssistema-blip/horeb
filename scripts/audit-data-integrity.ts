import { prisma } from "../lib/prisma";

export interface DataIntegrityReport {
  timestamp: string;
  tableCounts: Record<string, number>;
  orphanChecks: {
    ticketsWithoutEvent: number;
    transactionsWithoutTenant: number;
    accessesWithoutUser: number;
    messagesWithoutConversation: number;
    pastoralMessagesWithoutAppointment: number;
    tasksWithoutMinistry: number;
  };
  securityAudit: {
    unhashedPasswords: number;
    usersWithoutChurchAccess: number;
    adminUsersCount: number;
  };
  ticketsByStatus: Record<string, number>;
  transactionsByTypeAndStatus: Record<string, number>;
  allPass: boolean;
}

export async function runDataIntegrityAudit(): Promise<DataIntegrityReport> {
  console.log("\n=======================================================");
  console.log("🔍 PROTOCOLO DE AUDITORIA DE INTEGRIDADE DE DADOS (HOREB)");
  console.log("=======================================================\n");

  // 1. Contagem Geral por Tabela
  const [
    tenantCount,
    userCount,
    userAccessCount,
    eventCount,
    ticketCount,
    transactionCount,
    prayerCount,
    moodCount,
    conversationCount,
    messageCount,
    appointmentCount,
    pastoralMsgCount,
    ministryCount,
    meetingCount,
    minuteCount,
    taskCount,
    videoCount,
    emailLogCount,
    rolePermissionCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.userChurchAccess.count(),
    prisma.event.count(),
    prisma.ticket.count(),
    prisma.transaction.count(),
    prisma.prayerRequest.count(),
    prisma.moodCheckIn.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.pastoralAppointment.count(),
    prisma.pastoralMessage.count(),
    prisma.ministry.count(),
    prisma.ministryMeeting.count(),
    prisma.meetingMinute.count(),
    prisma.ministryTask.count(),
    prisma.churchVideo.count(),
    prisma.emailLog.count(),
    prisma.rolePermission.count(),
  ]);

  const tableCounts = {
    Tenants: tenantCount,
    Users: userCount,
    UserChurchAccesses: userAccessCount,
    Events: eventCount,
    Tickets: ticketCount,
    Transactions: transactionCount,
    PrayerRequests: prayerCount,
    MoodCheckIns: moodCount,
    Conversations: conversationCount,
    Messages: messageCount,
    PastoralAppointments: appointmentCount,
    PastoralMessages: pastoralMsgCount,
    Ministries: ministryCount,
    MinistryMeetings: meetingCount,
    MeetingMinutes: minuteCount,
    MinistryTasks: taskCount,
    ChurchVideos: videoCount,
    EmailLogs: emailLogCount,
    RolePermissions: rolePermissionCount,
  };

  console.log("📊 Censo Quantitativo de Registros no Banco:");
  Object.entries(tableCounts).forEach(([table, count]) => {
    console.log(`   • ${table.padEnd(25)}: ${count} registros`);
  });

  // 2. Auditoria de Órfãos e Chaves Estrangeiras
  console.log("\n🛡️ Verificando Integridade Referencial e Detecção de Órfãos...");

  // Tickets sem Evento
  const orphanTickets = await prisma.$queryRaw<any[]>`
    SELECT id FROM "Ticket" WHERE "eventId" NOT IN (SELECT id FROM "Event")
  `;

  // Transactions sem Tenant
  const orphanTransactions = await prisma.$queryRaw<any[]>`
    SELECT id FROM "Transaction" WHERE "tenantId" NOT IN (SELECT id FROM "Tenant")
  `;

  // UserChurchAccess sem User
  const orphanAccesses = await prisma.$queryRaw<any[]>`
    SELECT id FROM "UserChurchAccess" WHERE "userId" NOT IN (SELECT id FROM "User")
  `;

  // Messages sem Conversation
  const orphanMessages = await prisma.$queryRaw<any[]>`
    SELECT id FROM "Message" WHERE "conversationId" NOT IN (SELECT id FROM "Conversation")
  `;

  // PastoralMessage sem Appointment
  const orphanPastoralMessages = await prisma.$queryRaw<any[]>`
    SELECT id FROM "PastoralMessage" WHERE "appointmentId" NOT IN (SELECT id FROM "PastoralAppointment")
  `;

  // MinistryTask sem Ministry
  const orphanTasks = await prisma.$queryRaw<any[]>`
    SELECT id FROM "MinistryTask" WHERE "ministryId" NOT IN (SELECT id FROM "Ministry")
  `;

  const orphanChecks = {
    ticketsWithoutEvent: orphanTickets.length,
    transactionsWithoutTenant: orphanTransactions.length,
    accessesWithoutUser: orphanAccesses.length,
    messagesWithoutConversation: orphanMessages.length,
    pastoralMessagesWithoutAppointment: orphanPastoralMessages.length,
    tasksWithoutMinistry: orphanTasks.length,
  };

  const hasOrphans = Object.values(orphanChecks).some((cnt) => cnt > 0);
  if (!hasOrphans) {
    console.log("   ✅ NENHUM registro órfão detectado! 100% de integridade referencial mantida.");
  } else {
    console.warn("   ⚠️ ATENÇÃO: Detectados registros órfãos:", orphanChecks);
  }

  // 3. Auditoria de Segurança de Senhas e Acessos
  console.log("\n🔐 Auditoria de Segurança Criptográfica:");

  const unhashedUsers = await prisma.$queryRaw<any[]>`
    SELECT id, email FROM "User" 
    WHERE "password" IS NULL OR "password" NOT LIKE '$2%'
  `;

  const usersWithoutAccess = await prisma.user.findMany({
    where: { churchAccesses: { none: {} } },
    select: { id: true, email: true },
  });

  const admins = await prisma.user.count({
    where: { role: { in: ["ADMIN", "SUPERADMIN", "PASTOR"] } },
  });

  const securityAudit = {
    unhashedPasswords: unhashedUsers.length,
    usersWithoutChurchAccess: usersWithoutAccess.length,
    adminUsersCount: admins,
  };

  if (unhashedUsers.length === 0) {
    console.log("   ✅ 100% das senhas ativas estão criptografadas com hash bcrypt ($2a/$2b).");
  } else {
    console.warn(`   ⚠️ Usuários com senhas inseguras: ${unhashedUsers.length}`);
  }

  // 4. Status de Ingressos e Transações
  console.log("\n🎟️ Distribuição de Status de Ingressos (Tickets):");
  const ticketGroups = await prisma.ticket.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const ticketsByStatus: Record<string, number> = {};
  ticketGroups.forEach((g) => {
    ticketsByStatus[g.status] = g._count._all;
    console.log(`   • ${g.status}: ${g._count._all}`);
  });

  console.log("\n💰 Distribuição de Transações Financeiras:");
  const transactionGroups = await prisma.transaction.groupBy({
    by: ["type", "status"],
    _count: { _all: true },
  });
  const transactionsByTypeAndStatus: Record<string, number> = {};
  transactionGroups.forEach((g) => {
    const key = `${g.type}_${g.status}`;
    transactionsByTypeAndStatus[key] = g._count._all;
    console.log(`   • ${key}: ${g._count._all}`);
  });

  const allPass = !hasOrphans && unhashedUsers.length === 0;

  console.log("\n=======================================================");
  console.log(allPass ? "✅ AUDITORIA DE DADOS CONCLUÍDA COM SUCESSO (PASS)" : "⚠️ AUDITORIA COM RESSALVAS");
  console.log("=======================================================\n");

  return {
    timestamp: new Date().toISOString(),
    tableCounts,
    orphanChecks,
    securityAudit,
    ticketsByStatus,
    transactionsByTypeAndStatus,
    allPass,
  };
}

if (require.main === module) {
  runDataIntegrityAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
