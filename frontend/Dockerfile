FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined at build time and must be the browser-visible URLs.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
ARG NEXT_PUBLIC_OIDC_AUTHORITY=http://localhost:8081/realms/finix
ARG NEXT_PUBLIC_OIDC_CLIENT_ID=finix-web
ARG NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
# Logo.dev PUBLISHABLE key only (pk_...): it is shipped to every browser by design. A secret key (sk_...) fails the build.
ARG NEXT_PUBLIC_LOGO_DEV_TOKEN=
# Visa mark on cards: off unless explicitly approved (browser-public flag, not a secret).
ARG NEXT_PUBLIC_VISA_BRANDING_APPROVED=false
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL NEXT_PUBLIC_OIDC_AUTHORITY=$NEXT_PUBLIC_OIDC_AUTHORITY NEXT_PUBLIC_OIDC_CLIENT_ID=$NEXT_PUBLIC_OIDC_CLIENT_ID NEXT_PUBLIC_APP_ORIGIN=$NEXT_PUBLIC_APP_ORIGIN NEXT_PUBLIC_LOGO_DEV_TOKEN=$NEXT_PUBLIC_LOGO_DEV_TOKEN NEXT_PUBLIC_VISA_BRANDING_APPROVED=$NEXT_PUBLIC_VISA_BRANDING_APPROVED
RUN case "$NEXT_PUBLIC_LOGO_DEV_TOKEN" in sk_*) echo "Refusing to build: NEXT_PUBLIC_LOGO_DEV_TOKEN is a secret key" >&2; exit 1;; esac
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
USER node
CMD ["node", "server.js"]
