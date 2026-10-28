import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail corporativo é obrigatório." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // PRD: "Login (Tela 1): e-mail corporativo e senha, aceitando os funcionários dos seus dados de exemplo com qualquer senha."
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Usuário não localizado no diretório corporativo da Nexo. Utilize um dos usuários cadastrados (ex: ana.souza@nexo.com.br, rafael.lima@nexo.com.br, carla.mendes@nexo.com.br).",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, user });

    // Cookie de sessão seguro
    response.cookies.set("nexo_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error: any) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: error.message || "Erro interno de autenticação." }, { status: 500 });
  }
}
