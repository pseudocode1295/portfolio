import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`; // e.g. whatsapp:+14155238886
const TO = `whatsapp:${process.env.WHATSAPP_TO_NUMBER}`;     // e.g. whatsapp:+919XXXXXXXXX

export async function sendWhatsApp(message: string): Promise<void> {
  try {
    await client.messages.create({ from: FROM, to: TO, body: message });
  } catch (err) {
    console.error("WhatsApp send failed:", err);
  }
}

// Pre-built notification templates
export const notify = {
  newJobs: (count: number, companies: string[]) =>
    sendWhatsApp(
      `🔍 *Job Hunt Agent* — ${count} new jobs found\n\n` +
      companies.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n\n👉 Review at /admin`
    ),

  approvalNeeded: (type: string, count: number) =>
    sendWhatsApp(
      `✅ *Action Required* — ${count} ${type}(s) need your approval\n\n` +
      `👉 Review at /admin`
    ),

  interviewInvite: (company: string, role: string) =>
    sendWhatsApp(
      `🎉 *Interview Invite!*\n\n` +
      `Company: ${company}\nRole: ${role}\n\n` +
      `Study material prepared — check /admin`
    ),

  applicationSubmitted: (company: string, role: string) =>
    sendWhatsApp(
      `📤 *Application Submitted*\n\nCompany: ${company}\nRole: ${role}`
    ),

  agentError: (agentName: string, error: string) =>
    sendWhatsApp(
      `⚠️ *Agent Error* — ${agentName}\n\n${error.slice(0, 200)}`
    ),
};
