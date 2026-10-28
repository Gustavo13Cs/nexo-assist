import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function getSessionUser(req: NextRequest) {
  const userId = req.cookies.get("nexo_user_id")?.value;
  if (!userId) return null;
  return await prisma.user.findUnique({ where: { id: userId } });
}

export async function requireAnalyst(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return { error: "Sessão não autenticada. Faça login.", status: 401, user: null };
  }
  if (user.role !== "ANALYST") {
    return {
      error: "Acesso restrito: apenas analistas de suporte têm acesso ao console.",
      status: 403,
      user: null,
    };
  }
  return { error: null, status: 200, user };
}
