import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// No ambiente serverless da Vercel, o sistema de arquivos raiz é read-only.
// Copiamos o SQLite pré-populado durante o build para /tmp, onde há permissão de escrita.
if (process.env.VERCEL) {
  const tmpDbPath = "/tmp/dev.db";
  if (!fs.existsSync(tmpDbPath)) {
    const sourceDbPath = path.join(process.cwd(), "prisma", "dev.db");
    if (fs.existsSync(sourceDbPath)) {
      try {
        fs.copyFileSync(sourceDbPath, tmpDbPath);
      } catch (err) {
        console.error("Falha ao copiar SQLite para /tmp:", err);
      }
    }
  }
  process.env.DATABASE_URL = "file:/tmp/dev.db";
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
