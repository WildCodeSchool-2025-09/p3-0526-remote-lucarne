FROM node:24-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /usr/src/app

COPY . .

RUN npm ci
RUN npm run prisma:generate
