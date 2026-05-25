import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Gemini ────────────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function _callGemini(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: maxTokens },
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}

// ─── Groq (fallback — OpenAI-compatible, free tier) ────────────────────────────

async function _callGroq(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── callGemini — tries Gemini first, falls back to Groq on rate-limit/error ──

export async function callGemini(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096,
): Promise<string> {
  try {
    return await _callGemini(systemPrompt, userMessage, maxTokens);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isRateLimit = msg.includes("429") || msg.includes("quota") || msg.includes("rate") || msg.includes("Resource has been exhausted");
    console.warn(`[llm] Gemini ${isRateLimit ? "rate-limited" : "failed"} — falling back to Groq. Error: ${msg}`);
    return await _callGroq(systemPrompt, userMessage, maxTokens);
  }
}

// Alias so existing agent imports don't break
export const callClaude = callGemini;

// ─── Profile context used by all agents ───────────────────────────────────────

export const AJAY_PROFILE = `
Name: Ajay Kumar
Current Role: Senior Software Engineer 2 (ML/AI) at Microsoft
Location: India
Target CTC: 45+ LPA
Experience: 6+ years in ML Engineering, GenAI, AI Platform development

Key Skills:
- Languages: Python, SQL, Scala, TypeScript, Java
- GenAI/LLMs: LangChain, LlamaIndex, Azure OpenAI, Gemini, Anthropic Claude, RAG, Agents, MCP
- ML/Data Science: XGBoost, scikit-learn, Causal Inference, A/B Testing, MLflow
- Search/RAG: Azure AI Search, Elasticsearch, Vector DBs, Semantic Ranking
- Cloud: Azure (primary), GCP, Docker, Kubernetes
- Frameworks: FastAPI, Next.js, Spark, Databricks

Notable Projects:
1. AERO (current): Multi-agent AI orchestration platform replacing Power BI dashboards with conversational AI
2. AI4CELA: Enterprise AI copilot for legal document processing with domain-specific copilots
3. Partner Skilling: Causal ML pipeline to determine ROI of partner training programs
4. Monocle: Intelligent search/recommendation platform

Certifications: Azure AI Engineer, Azure Data Scientist, Azure Developer Associate, TensorFlow Developer

Target Roles: ML Engineer, Senior ML Engineer, GenAI Engineer, AI Platform Engineer, AI/ML Lead
`;
