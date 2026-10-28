import { NextRequest, NextResponse } from "next/server";
import { analystService } from "@/services/analyst-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const details = await analystService.getConversationDetails(id);
    return NextResponse.json(details);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
