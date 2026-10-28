import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("nexo_user_id")?.value;

    if (!userId) {
      // Padrão: Ana Souza (para entrar direto na tela de demonstração se não logado)
      const defaultUser = await prisma.user.findFirst({
        where: { email: "ana.souza@nexo.com.br" },
      });
      return NextResponse.json({ user: defaultUser });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
