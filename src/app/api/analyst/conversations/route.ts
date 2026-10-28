import { NextRequest, NextResponse } from "next/server";
import { analystService } from "@/services/analyst-service";
import { requireAnalyst } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAnalyst(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get("filter") || "all") as "all" | "for_you" | "with_agent" | "my";
    const search = searchParams.get("search") || undefined;

    const data = await analystService.listConversations({
      filter,
      analystId: auth.user!.id,
      search,
    });

    return NextResponse.json({ ...data, currentAnalyst: auth.user });
  } catch (error: any) {
    console.error("Erro ao listar conversas do analista:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
