FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
COPY services ./services
RUN go mod download
RUN CGO_ENABLED=0 go build -o /out/service ./services/app-todo

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/service /app/service
EXPOSE 8080
ENTRYPOINT ["/app/service"]
