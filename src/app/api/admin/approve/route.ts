import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { approvalId, decision, editedContent } = await req.json().catch(() => ({}));
  if (!approvalId || !decision) return NextResponse.json({ error: "approvalId and decision required" }, { status: 400 });
  if (!["approved", "rejected", "edited"].includes(decision)) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });

  // Get approval
  const { data: approval, error } = await supabase.from("approvals").select("*").eq("id", approvalId).single();
  if (error || !approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

  // Update approval status
  await supabase.from("approvals").update({
    status: decision,
    decision_at: new Date().toISOString(),
    edited_content: editedContent || null,
  }).eq("id", approvalId);

  const finalContent = editedContent || approval.content;

  // Act on the approval based on type
  if (decision === "approved" || decision === "edited") {
    switch (approval.type) {
      case "connection_request":
        await supabase.from("linkedin_connections").update({
          status: "pending_approval",
          connection_note: finalContent,
        }).eq("id", approval.reference_id);
        break;

      case "referral_message":
        await supabase.from("referral_messages").update({
          message_draft: finalContent,
          status: "pending_approval",
        }).eq("id", approval.reference_id);
        break;

      case "application":
        await supabase.from("applications").update({
          cover_letter: finalContent,
          status: "pending_approval",
        }).eq("id", approval.reference_id);
        break;

      case "email_reply":
        await supabase.from("emails").update({
          reply_draft: finalContent,
          reply_status: "pending_approval",
        }).eq("id", approval.reference_id);
        break;
    }
  }

  if (decision === "rejected") {
    // Mark as rejected in the reference table
    const tableMap: Record<string, string> = {
      connection_request: "linkedin_connections",
      referral_message: "referral_messages",
      application: "applications",
      email_reply: "emails",
    };
    const table = tableMap[approval.type];
    if (table) {
      await supabase.from(table).update({ status: "rejected" }).eq("id", approval.reference_id);
    }
  }

  return NextResponse.json({ success: true, decision });
}
