FROM node:22-alpine AS build
WORKDIR /src
COPY services/web-todo/package.json ./
COPY services/web-todo/tsconfig.json ./
COPY services/web-todo/tsconfig.node.json ./
COPY services/web-todo/vite.config.ts ./
COPY services/web-todo/index.html ./
COPY services/web-todo/src ./src
RUN corepack enable && pnpm install --no-frozen-lockfile && pnpm build

FROM nginx:1.27-alpine
COPY services/web-todo/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html/todo
EXPOSE 80
