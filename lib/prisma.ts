import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqliteOptimized: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;

async function optimizeSqliteConcurrencyAndIndexes(client: PrismaClient) {
  if (globalForPrisma.sqliteOptimized) return;
  globalForPrisma.sqliteOptimized = true;

  try {
    // PRAGMAs em SQLite que retornam linhas exigem $queryRawUnsafe no Prisma
    await client.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await client.$queryRawUnsafe("PRAGMA busy_timeout = 10000;");
    await client.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    await client.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
    await client.$queryRawUnsafe("PRAGMA cache_size = -64000;");
    await client.$queryRawUnsafe("PRAGMA temp_store = MEMORY;");
    await client.$queryRawUnsafe("PRAGMA mmap_size = 268435456;");
    await client.$queryRawUnsafe("PRAGMA wal_autocheckpoint = 1000;");

    // Garante índices compostos multi-tenant em volumes persistentes na VPS sem perda de dados
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS "Tenant_parentId_idx" ON "Tenant"("parentId");',
      'CREATE INDEX IF NOT EXISTS "Tenant_status_idx" ON "Tenant"("status");',
      'CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");',
      'CREATE INDEX IF NOT EXISTS "User_tenantId_role_idx" ON "User"("tenantId", "role");',
      'CREATE INDEX IF NOT EXISTS "UserChurchAccess_tenantId_idx" ON "UserChurchAccess"("tenantId");',
      'CREATE INDEX IF NOT EXISTS "UserChurchAccess_tenantId_role_idx" ON "UserChurchAccess"("tenantId", "role");',
      'CREATE INDEX IF NOT EXISTS "MoodCheckIn_tenantId_date_idx" ON "MoodCheckIn"("tenantId", "date");',
      'CREATE INDEX IF NOT EXISTS "PrayerRequest_tenantId_createdAt_idx" ON "PrayerRequest"("tenantId", "createdAt");',
      'CREATE INDEX IF NOT EXISTS "PrayerRequest_tenantId_status_idx" ON "PrayerRequest"("tenantId", "status");',
      'CREATE INDEX IF NOT EXISTS "AgentProfile_tenantId_isActive_idx" ON "AgentProfile"("tenantId", "isActive");',
      'CREATE INDEX IF NOT EXISTS "Conversation_tenantId_userId_idx" ON "Conversation"("tenantId", "userId");',
      'CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");',
      'CREATE INDEX IF NOT EXISTS "MinistryMeeting_ministryId_date_idx" ON "MinistryMeeting"("ministryId", "date");',
      'CREATE INDEX IF NOT EXISTS "MinistryTask_ministryId_status_idx" ON "MinistryTask"("ministryId", "status");',
      'CREATE INDEX IF NOT EXISTS "PastoralAppointment_tenantId_userId_idx" ON "PastoralAppointment"("tenantId", "userId");',
    ];

    for (const stmt of indexStatements) {
      await client.$executeRawUnsafe(stmt).catch(() => {});
    }
  } catch (err) {
    console.warn("[Prisma SQLite Init] Aviso ao configurar PRAGMAs/índices:", err);
  }
}

void optimizeSqliteConcurrencyAndIndexes(prisma);

export default prisma;
