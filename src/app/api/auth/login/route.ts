import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail corporativo obrigatório." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Busca usuário pelo e-mail
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Se não existe, cria como funcionário padrão para facilitar testes com qualquer e-mail da Nexo
      const nameFromEmail = cleanEmail
        .split("@")[0]
        .split(".")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");

      const initials = nameFromEmail
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: nameFromEmail || "Colaborador Nexo",
          role: cleanEmail.includes("analista") || cleanEmail.includes("rafael") || cleanEmail.includes("suporte") ? "ANALYST" : "EMPLOYEE",
          department: "Geral",
          initials: initials || "NX",
        },
      });
    }

    const response = NextResponse.json({ success: true, user });

    // Salva cookie de sessão simples
    response.cookies.set("nexo_user_id", user.id, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error: any) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: error.message || "Erro interno de autenticação." }, { status: 500 });
  }
}
