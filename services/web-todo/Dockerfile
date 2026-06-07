FROM node:22-alpine AS build
WORKDIR /workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/web-todo ./services/web-todo
RUN corepack enable && pnpm --dir services/web-todo install --no-frozen-lockfile && pnpm --dir services/web-todo build

FROM nginx:1.27-alpine
COPY services/web-todo/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/services/web-todo/dist /usr/share/nginx/html/todo
EXPOSE 80
