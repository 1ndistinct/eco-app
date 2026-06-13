FROM node:22-alpine AS build
WORKDIR /workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/web ./services/web
RUN corepack enable \
  && corepack prepare pnpm@9.15.1 --activate \
  && pnpm --dir services/web install --frozen-lockfile \
  && pnpm --dir services/web build

FROM nginx:1.27-alpine
COPY services/web/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/services/web/dist /usr/share/nginx/html
EXPOSE 80
