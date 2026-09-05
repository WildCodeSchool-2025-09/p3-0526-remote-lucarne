FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /usr/src/app

COPY . .

RUN npm install
