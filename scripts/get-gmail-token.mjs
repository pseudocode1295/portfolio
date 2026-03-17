import { createServer } from "http";
import { google } from "googleapis";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || "http://localhost:9999/callback";

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = auth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"],
});

console.log("\n✅ Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n⏳ Waiting for authorization...\n");

// Temporary server to catch the callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:9999");
  const code = url.searchParams.get("code");
  if (!code) { res.end("No code"); return; }

  const { tokens } = await auth.getToken(code);
  res.end("<h2>✅ Success! Close this tab and check your terminal.</h2>");
  server.close();

  console.log("\n🎉 REFRESH TOKEN:\n");
  console.log(tokens.refresh_token);
  console.log("\nAdd this to your .env.local as GMAIL_REFRESH_TOKEN=<token above>\n");
});

server.listen(9999);
