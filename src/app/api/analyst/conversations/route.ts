import { NextRequest, NextResponse } from "next/server";
import { analystService } from "@/services/analyst-service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get("filter") || "all") as "all" | "for_you" | "with_agent" | "my";
    const search = searchParams.get("search") || undefined;

    // Identificar o analista ativo (padrão Rafael Lima)
    let analyst = await prisma.user.findFirst({
      where: { role: "ANALYST" },
    });

    if (!analyst) {
      analyst = await prisma.user.findFirst();
    }

    const data = await analystService.listConversations({
      filter,
      analystId: analyst?.id || "",
      search,
    });

    return NextResponse.json({ ...data, currentAnalyst: analyst });
  } catch (error: any) {
    console.error("Erro ao listar conversas do analista:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
