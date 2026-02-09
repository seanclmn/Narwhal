# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Add build-time argument
ARG NEXT_PUBLIC_SIGNALING_SERVER
# Set it as an environment variable so Next.js can see it during 'build'
ENV NEXT_PUBLIC_SIGNALING_SERVER=$NEXT_PUBLIC_SIGNALING_SERVER

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Ensure the build-time variable is available if Next.js needs to reference it
ARG NEXT_PUBLIC_SIGNALING_SERVER
ENV NEXT_PUBLIC_SIGNALING_SERVER=$NEXT_PUBLIC_SIGNALING_SERVER

EXPOSE 3000
CMD ["yarn", "start"]
