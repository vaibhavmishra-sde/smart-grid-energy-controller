FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
CMD ["npm", "start"]


ENV NODE_ENV=production
