# Paper Trader full server — the whole game PLUS the shared file cabinet,
# press-badge accounts, the wire and the live leaderboard.
# Free hosting: create a web service on render.com from this repo (it reads
# render.yaml), or run anywhere Docker runs:  docker build -t papertrader . && docker run -p 3000:3000 papertrader
# Then paste the URL into the APK's menu → "server address". Done — everyone's
# phones share one desk again.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./ 
EXPOSE 3000
CMD ["npm", "run", "start"]
