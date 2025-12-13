FROM node:18-alpine

# 👉 Cài timezone data
RUN apk add --no-cache tzdata

# 👉 Set múi giờ cho container
ENV TZ=Asia/Ho_Chi_Minh

WORKDIR /usr/src/app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy source
COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "index.js"]
