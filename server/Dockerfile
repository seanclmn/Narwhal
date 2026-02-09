FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Cloud Run uses the PORT environment variable
ENV PORT=8080
EXPOSE 8080

CMD ["yarn", "start"]
