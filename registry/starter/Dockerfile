# Standard image for a Next.js App Router app on this platform: multi-stage, standalone output, a
# non-root user, an EXPOSEd port and a HEALTHCHECK the container runtime can actually read.
#
# Requires `output: 'standalone'` in next.config.ts (the starter ships that file too) — without it
# .next/standalone does not exist and the runtime stage copies nothing.

# ---------- deps ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The build stage has no .env, so a fail-fast env module (@thiengthb/lib-env) would abort `next build`
# on variables that only exist at run time. This is scoped to THIS stage — the runtime stage below is a
# separate FROM and never inherits it, which is what keeps the escape hatch out of production.
ENV SKIP_ENV_VALIDATION=1
# The runtime stage copies ./public unconditionally, and a COPY of a missing path fails the whole
# build. Templates that scaffold a public/ make this a no-op; an app that has none would otherwise
# break here for a reason the error message does not explain.
RUN mkdir -p public && npm run build

# ---------- runtime ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# tzdata so TZ actually applies — an app that computes "today" in local time needs it.
RUN apk add --no-cache tzdata

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# App data lives in a named VOLUME mounted here, never in the image and never a bind mount
# (platform invariant: it must survive a rebuild and be movable between targets).
RUN mkdir -p /data && chown node:node /data
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

# ---------- when you add Prisma ----------
# This base is deliberately Prisma-free so a fresh app builds and runs before it has a schema. Once
# `prisma/schema.prisma` exists, three edits make migrations apply on container start:
#
#   1. deps stage:     COPY prisma ./prisma      (before `npm ci`, so the postinstall sees it)
#   2. build stage:    RUN npx prisma generate && npm run build
#   3. a prisma-cli stage + a CMD that runs `prisma migrate deploy` before `exec node server.js`,
#      and `RUN apk add --no-cache openssl` in the runtime stage (the engine needs it on alpine).
#
# The worked version is `todo/Dockerfile` — copy from there rather than re-deriving it.
