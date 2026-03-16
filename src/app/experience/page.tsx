"use client";

import ScrollReveal from "@/components/ScrollReveal";
import { Briefcase } from "lucide-react";

const experiences = [
  {
    title: "Senior Software Engineer 2",
    company: "MAQ Software",
    client: "Microsoft CELA",
    period: "Sep 2024 – Present",
    project: "AERO",
    bullets: [
      "Architected a multi-agent AI orchestration platform for Microsoft CELA that replaces 3 separate Power BI dashboards with a single natural language chat interface, using Azure AI Foundry orchestrator agents to route queries to 5 domain-specific sub-agents (backed by 7 MCP tools) across 3 Azure regions",
      "Developed 7 production MCP tools enabling natural language queries for partner validation (semantic + vector search), compliance checks (NL-to-SQL), sales insights, adverse media screening with severity classification, and automated partner profile report generation with LLM-powered summaries",
      "Engineered NL-to-SQL pipeline via Azure OpenAI with schema metadata and few-shot examples, generating validated SQL against Fabric Lakehouse — with prompt injection defense, SQLValidator allowlist pre-validation, and Redis caching reducing repeated queries to sub-15ms",
      "Implemented automated report generator querying 15+ DataFrames in parallel from Fabric, generating LLM summaries per section, rendering DOCX with matplotlib charts, and triggering email delivery via Logic Apps",
      "Designed adverse media screening tool using AI Foundry Bing agent with year-by-year search strategy, severity classification (Critical/High/Medium/Low), consolidated DOCX generation, and background task queue with deduplication",
    ],
    technologies: [
      "Python",
      "FastAPI",
      "MCP Protocol",
      "Azure AI Foundry",
      "Azure OpenAI",
      "Azure AI Search",
      "Fabric Lakehouse",
      "Redis",
      "Docker",
      "Azure Container Apps",
    ],
  },
  {
    title: "Senior Software Engineer 1",
    company: "MAQ Software",
    client: "Microsoft GPS / CELA",
    period: "Sep 2022 – Aug 2024",
    project: "Partner Skilling & AI4CELA",
    bullets: [
      "Architected a cloud-based ML pipeline modeling the causal relationship between partner training investments and revenue across 1,600+ partners; transitioned from Linear Regression/XGBoost to EconML's LinearDML to isolate causal effects, and explored CausalForestDML and DynamicDML for heterogeneous treatment effects",
      "Designed a constrained nonlinear optimization engine using Pyomo/IPOPT that computes the minimum certification and training increases needed per partner to achieve FY25 revenue targets, subject to business constraints (max 20% cert increase, 100% training increase)",
      "Led a 10+ engineer team to build AI4CELA — an enterprise AI copilot platform for Microsoft CELA with 8+ domain-specific copilots powered by Azure OpenAI GPT-4 and Azure ML Prompt Flow, processing 131,000+ legal documents (49K emails, 82K attachments) through automated PII redaction, Q&A extraction, and topic classification",
      "Designed a 14-step data pipeline on Databricks (PySpark) extracting 17+ structured fields per document via GPT-4 (summaries, Q&A pairs, legal topics, jurisdiction metadata) and indexing across 4 search indexes for hybrid retrieval (semantic + vector + text)",
    ],
    technologies: [
      "Python",
      "EconML",
      "Pyomo",
      "XGBoost",
      "ASP.NET Core 8",
      "Azure OpenAI",
      "Azure ML Prompt Flow",
      "PySpark",
      "Databricks",
      "Azure Cognitive Search",
    ],
  },
  {
    title: "Software Engineer 2",
    company: "MAQ Software",
    client: "Microsoft Partners",
    period: "Mar 2020 – Aug 2022",
    project: "Monocle",
    bullets: [
      "Built a recommendation platform for Microsoft Partners with multiple ML models: LightGBM multi-class classifier using TF-IDF vectorization (sublinear scaling, bigrams) on case titles/descriptions for assessment prediction; Knowledge Graph model using Node2Vec (128-dim embeddings, 5-walk length) on a NetworkX multi-type graph with cosine similarity scoring",
      "Implemented User-User Collaborative Filtering using PySpark distributed similarity matrices (IndexedRowMatrix) with temporal decay weighting on 500K+ user interactions, and FP-Growth Association Rules mining frequent co-consumption patterns across course sequences",
      "Deployed models to Azure Kubernetes Service as real-time scoring endpoints with Docker containerization, AML pipeline orchestration for automated retraining, MLflow experiment tracking, and Databricks batch processing across 100K+ case records",
      "Developed domain-specific NLP pipeline with spaCy lemmatization, Microsoft abbreviation normalization, custom stopword filtering (200+ terms), and language detection — processing 100K+ documents efficiently",
    ],
    technologies: [
      "Python",
      "LightGBM",
      "Node2Vec",
      "PySpark",
      "Azure ML",
      "Azure Kubernetes Service",
      "MLflow",
      "Docker",
      "Databricks",
      "spaCy",
    ],
  },
  {
    title: "Software Engineer 1",
    company: "MAQ Software",
    client: "Microsoft",
    period: "Aug 2018 – Feb 2020",
    project: "Recommendation & NLP Systems",
    bullets: [
      "Developed a Real-Time Recommendation Engine using Neo4J GraphDB for Microsoft Business Applications Summit video recommendations, implementing content-based filtering via Cypher graph similarity queries with User-User and Item-Item similarity",
      "Built a ticket classification system using NLP (SpaCy lemmatization, NLTK tokenization), extracting keyphrases via TF-IDF vectorization and clustering with K-means and Affinity Propagation, with an ensemble voting classifier (Logistic Regression + Random Forest + Naive Bayes)",
      "Created a Sentiment Analysis POC on 500+ Microsoft Ignite event survey responses using VADER and TextBlob for sentiment scoring, and TF-IDF clustering to extract key positive/negative themes and improvement areas",
    ],
    technologies: [
      "Python",
      "Neo4J",
      "spaCy",
      "NLTK",
      "scikit-learn",
      "TF-IDF",
      "K-means",
      "VADER",
      "TextBlob",
    ],
  },
];

export default function ExperiencePage() {
  return (
    <div className="pt-24 pb-16 bg-white dark:bg-navy-900">
      <section className="section-container">
        <ScrollReveal>
          <h1 className="section-title gradient-text">Experience</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-3xl mb-12">
            4 progressive roles at MAQ Software, building AI platforms for
            Microsoft. Promoted SE1 → SE2 → SSE1 → SSE2.
          </p>
        </ScrollReveal>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-blue-500/50 to-transparent" />

          <div className="space-y-12">
            {experiences.map((exp, index) => (
              <ScrollReveal key={exp.period} delay={index * 0.1}>
                <div className="relative pl-12 sm:pl-16">
                  {/* Dot */}
                  <div className="absolute left-2.5 sm:left-4.5 top-2 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-navy-900" />

                  <div className="card">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {exp.title}
                        </h3>
                        <p className="text-blue-500 dark:text-blue-400 text-sm font-medium">
                          {exp.company} — {exp.client}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full whitespace-nowrap self-start">
                        {exp.period}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      {exp.project}
                    </p>

                    <ul className="space-y-3 mb-4">
                      {exp.bullets.map((bullet, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
                        >
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          {bullet}
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                      {exp.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
