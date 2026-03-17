import { NextResponse } from "next/server";
import { callGemini } from "@/lib/claude";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test Gemini
  try {
    const r = await callGemini("You are a test assistant.", "Say hi", 50);
    results.gemini = "OK: " + r;
  } catch (e) {
    results.gemini = "ERROR: " + String(e);
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
