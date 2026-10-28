import { NextRequest, NextResponse } from "next/server";
import { analystService } from "@/services/analyst-service";
import { requireAnalyst } from "@/lib/auth-helper";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAnalyst(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const details = await analystService.getConversationDetails(id);
    return NextResponse.json(details);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
