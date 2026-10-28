#!/bin/sh
set -e

echo "========================================="
echo "   Nexo Assist - Inicializando Container "
echo "========================================="

echo "[1/3] Sincronizando schema do banco SQLite (Prisma)..."
npx prisma db push --skip-generate

echo "[2/3] Populando dados iniciais e chamados do Anexo B..."
npm run seed || echo "Seed ignorado ou dados já existentes."

echo "[3/3] Servidor Nexo Assist pronto! Iniciando na porta 3000..."
exec npm run start
