import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConsultationEligibility } from "@/lib/consultation";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eligibility = await getConsultationEligibility(session.user.id);
    return NextResponse.json({ eligibility });
  } catch (error) {
    console.error("[ELIGIBILITY_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
