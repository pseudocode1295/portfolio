import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Profile context used by all agents
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

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}
