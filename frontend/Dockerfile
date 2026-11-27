FROM node:26-alpine AS build

WORKDIR /app

COPY package*.json ./

# RUN npm ci
RUN npm install

COPY . .

# Build the frontend application
ARG VITE_API_URL
ARG VITE_ENTRA_CLIENT_ID
ARG VITE_ENTRA_API_CLIENT_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENTRA_CLIENT_ID=$VITE_ENTRA_CLIENT_ID
ENV VITE_ENTRA_API_CLIENT_ID=$VITE_ENTRA_API_CLIENT_ID

RUN npm run build

FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
