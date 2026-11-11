# ==============================================================================
# 1. Base Image com Node.js LTS e compatibilidade com Alpine
# ==============================================================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ==============================================================================
# 2. Instalação de Dependências & Geração do Prisma Client
# ==============================================================================
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# ==============================================================================
# 3. Compilação do App (Next.js Standalone Build)
# ==============================================================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="file:./dev.db"

RUN npx prisma db push --skip-generate --accept-data-loss
RUN npm run build

# ==============================================================================
# 4. Imagem Final de Produção (Runner Ultraleve)
# ==============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Cria e configura permissões estritas para o diretório de dados SQLite
RUN mkdir -p /app/prisma && chown -R nextjs:nodejs /app/prisma && chmod 700 /app/prisma

# Copia arquivos estáticos públicos e standalone gerados pelo Next.js
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/Ebooks ./Ebooks
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

RUN chmod 700 /app/prisma && chmod 600 /app/prisma/*.db* 2>/dev/null || true

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["sh", "-c", "chmod 700 /app/prisma 2>/dev/null || true; chmod 600 /app/prisma/*.db* 2>/dev/null || true; umask 0077; exec node server.js"]
