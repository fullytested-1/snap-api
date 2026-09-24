FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Koyeb injects PORT env var; default to 8000
ENV PORT=8000
EXPOSE 8000

# Non-root user (Koyeb recommends)
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

CMD ["npm", "start"]
