import { NextResponse } from "next/server";
import { anthropic } from "@/lib/claude";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test Claude
  try {
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 50,
      messages: [{ role: "user", content: "Say hi" }],
    });
    results.claude = "OK: " + (r.content[0] as { text: string }).text;
  } catch (e) {
    results.claude = "ERROR: " + String(e);
  }

  // Test Supabase
  try {
    const { data, error } = await supabase.from("jobs").select("id").limit(1);
    results.supabase = error ? "ERROR: " + error.message : "OK, rows: " + (data?.length ?? 0);
  } catch (e) {
    results.supabase = "ERROR: " + String(e);
  }

  return NextResponse.json(results);
}
