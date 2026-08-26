FROM node:24-alpine AS build

WORKDIR /workspace

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/neumaticos-chubut-ecommerce-front/browser /usr/share/nginx/html

EXPOSE 80
