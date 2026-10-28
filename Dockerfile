FROM node:20-alpine

# Instala bibliotecas necessárias para o Prisma e o Next.js no Alpine Linux
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copia definições de pacotes e o schema do banco
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instala todas as dependências (incluindo TypeScript e ferramentas de build)
RUN npm install --include=dev

# Copia o restante do código fonte do projeto
COPY . .

# Gera o client tipado do Prisma
RUN npx prisma generate

# Executa o build de produção do Next.js 15
RUN npm run build

# Expõe a porta 3000
EXPOSE 3000

# Define NODE_ENV para o runtime de produção
ENV NODE_ENV=production

# Copia o script de inicialização e garante quebras de linha Unix (LF)
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN tr -d '\r' < /app/docker-entrypoint.sh > /app/docker-entrypoint-clean.sh && \
    mv /app/docker-entrypoint-clean.sh /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
