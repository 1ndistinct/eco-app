FROM node:22-alpine AS build
WORKDIR /workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/web-nicole ./services/web-nicole
RUN corepack enable \
  && corepack prepare pnpm@9.15.1 --activate \
  && pnpm --dir services/web-nicole install --frozen-lockfile \
  && pnpm --dir services/web-nicole build

FROM nginx:1.27-alpine
COPY services/web-nicole/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/services/web-nicole/dist /usr/share/nginx/html/nicole
EXPOSE 80
