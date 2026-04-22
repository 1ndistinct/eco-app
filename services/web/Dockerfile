FROM node:22-alpine AS build
WORKDIR /src
COPY services/web/package.json ./
COPY services/web/tsconfig.json ./
COPY services/web/tsconfig.node.json ./
COPY services/web/vite.config.ts ./
COPY services/web/index.html ./
COPY services/web/public ./public
COPY services/web/src ./src
RUN corepack enable && pnpm install --no-frozen-lockfile && pnpm build

FROM nginx:1.27-alpine
COPY services/web/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
