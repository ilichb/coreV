# ─────────────────────────────────────────────────────────────
# Etapa 1: dependencias
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS deps

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/

RUN npm install --legacy-peer-deps

# ─────────────────────────────────────────────────────────────
# Etapa 2: build
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --prefix shared
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Etapa 3: desarrollo
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS development

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["sh", "-c", "npm run build --prefix shared && npm run dev"]

# ─────────────────────────────────────────────────────────────
# Etapa 4: producción
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000

RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4000

CMD ["node", "server.js"]