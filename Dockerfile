FROM node:24-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# turbo 모노레포: 워크스페이스 전체를 설치하고 @bjk/web과 의존 패키지만 빌드
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# 브라우저 번들에 들어가는 값이라 빌드 시점에 고정. 같은 도메인의 /api로 Caddy가 서버에 연결
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm exec turbo run build --filter=@bjk/web

FROM node:24-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build /app ./
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
