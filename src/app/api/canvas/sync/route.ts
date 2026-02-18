import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCanvas } from "@/lib/canvas/sync";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's Canvas credentials
    const { data: profile } = await supabase
      .from("profiles")
      .select("canvas_base_url, canvas_api_token")
      .eq("id", user.id)
      .single();

    if (!profile?.canvas_base_url || !profile?.canvas_api_token) {
      return NextResponse.json(
        { error: "Canvas not configured. Add your Canvas URL and API token in Settings." },
        { status: 400 }
      );
    }

    const result = await syncCanvas(
      user.id,
      profile.canvas_base_url,
      profile.canvas_api_token,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Canvas sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
