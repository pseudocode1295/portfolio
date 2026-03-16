import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a helpful AI assistant on Ajay Kumar's portfolio website. Answer questions about Ajay's experience, skills, and projects. Be concise and professional. If asked something unrelated to Ajay, politely redirect.

ABOUT AJAY:
- ML Engineer with 7+ years at MAQ Software, all projects for Microsoft as client
- Location: Noida, India
- Email: ajaykumar129595@gmail.com
- LinkedIn: linkedin.com/in/ajaykumar1295
- Career: SE1 (Aug 2018–Feb 2020) → SE2 (Mar 2020–Aug 2022) → SSE1 (Sep 2022–Aug 2024) → SSE2 (Sep 2024–Present)
- Education: B.Tech in IT, KIET Ghaziabad (2014–2018)
- Certifications: Azure Data Scientist Associate (DP-100), ML Specialization (Stanford/Coursera), Neural Networks (deeplearning.ai), Data Warehousing for BI (Coursera)

CURRENT PROJECT — AERO (SSE2, Sep 2024–Present):
- Multi-agent AI orchestration platform for Microsoft CELA
- Replaces 3 Power BI dashboards with single conversational AI interface
- 5 domain-specific sub-agents, 7 MCP tools, 23,000+ LOC across 3 repos
- NL-to-SQL with 4-layer prompt injection defense, sub-15ms cache hits
- Tech: Python, FastAPI, MCP Protocol, Azure AI Foundry, Azure OpenAI, Azure AI Search, Fabric Lakehouse, Redis, Docker, Azure Container Apps
- 960+ automated tests, 3-region deployment, SSPA/ACE/ISRM/GDPR compliant

PROJECT — AI4CELA (SSE1, Sep 2022–Aug 2024):
- Enterprise AI copilot platform for Microsoft CELA
- 8+ domain-specific copilots (Outside Counsel, RFI, Policy, GRA, Investigations, Virgo, Gaming)
- Processed 131,000+ legal docs (49K emails + 82K attachments) through PII redaction and enrichment
- 14-step data pipeline on Databricks extracting 17+ structured fields per document via GPT-4
- 4 Azure Cognitive Search indexes for hybrid retrieval (semantic + vector + text)
- Led 10+ engineer team, passed Threat Model and RAI reviews
- Tech: ASP.NET Core 8, Azure OpenAI GPT-4, Azure ML Prompt Flow, PySpark, Databricks

PROJECT — Partner Skilling (SSE1, Sep 2022–Aug 2024):
- Causal ML pipeline for partner training ROI across 1,600+ partners
- Transitioned from XGBoost to EconML's LinearDML for causal inference
- Constrained nonlinear optimization using Pyomo/IPOPT
- 86,400+ monthly data points across 17 regions, 6 solution areas
- Tech: EconML, scikit-learn, XGBoost, LightGBM, Pyomo, IPOPT, Azure ML

PROJECT — Monocle (SE2, Mar 2020–Aug 2022):
- Multi-model recommendation engine for Microsoft Partners
- 5-model ensemble: LightGBM, Node2Vec, Collaborative Filtering, FP-Growth, Word Mover Distance
- Bayesian optimization for ensemble weights, 20% improvement in Precision/Recall
- 100K+ daily recommendations deployed on AKS
- Tech: LightGBM, Node2Vec, PySpark, Flask, AKS, MLflow, Docker

SE1 PROJECTS (Aug 2018–Feb 2020):
- Neo4J recommendation engine for Microsoft Business Applications Summit
- NLP ticket classification with TF-IDF, K-means, ensemble classifiers
- Sentiment analysis on Microsoft Ignite survey responses

SKILLS:
- Languages: Python, C++, SQL
- GenAI/LLMs: Azure OpenAI, Azure AI Foundry, MCP, RAG, NL-to-SQL, Prompt Engineering, Agentic AI
- ML/Data Science: DML, scikit-learn, XGBoost, LightGBM, Node2Vec, SHAP, Bayesian Optimization, Pyomo, IPOPT, pandas, NumPy, PySpark
- Search/RAG: Azure AI Search, Semantic + Vector Hybrid, Document Chunking, Reranking
- Cloud: Azure Container Apps, Microsoft Fabric, ADLS, Blob Storage, Key Vault, Redis, AKS, Azure ML, Databricks, Docker

BLOG POSTS:
1. "From XGBoost to Double Machine Learning" — causal inference for partner ROI
2. "Building Multi-Agent AI with MCP Protocol on Azure AI Foundry" — agentic architecture
3. "NL-to-SQL with LLMs: 4 Layers of Defense Against Prompt Injection" — security

RULES:
- Keep responses under 150 words unless asked for detail
- Use first person ("Ajay has..." not "I have...")
- If asked about salary, personal life, or inappropriate topics, politely decline
- Suggest visiting specific portfolio pages when relevant (e.g., "Check out the Projects page for more details")`;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60_000 });
    return true;
  }

  if (limit.count >= 10) return false;
  limit.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat is not configured yet." },
      { status: 503 }
    );
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages required." },
        { status: 400 }
      );
    }

    // Limit conversation length to prevent context abuse
    const recentMessages = messages.slice(-10);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: recentMessages.slice(0, -1).map(
        (m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })
      ),
    });

    const lastMessage = recentMessages[recentMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    return NextResponse.json({ message: text });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("Too Many Requests")) {
      return NextResponse.json(
        { error: "The AI is temporarily unavailable due to rate limits. Please try again in a minute." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
