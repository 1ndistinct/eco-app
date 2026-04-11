FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY services ./services
RUN CGO_ENABLED=0 go build -o /out/app-api ./services/app/cmd/api

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/app-api /app/app-api
EXPOSE 8080
ENTRYPOINT ["/app/app-api"]
