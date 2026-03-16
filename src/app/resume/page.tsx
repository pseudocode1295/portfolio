import ScrollReveal from "@/components/ScrollReveal";
import { Download, FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume | Ajay Kumar",
  description:
    "ML Engineer with 7+ years building AI platforms for Microsoft.",
};

const skills = [
  {
    category: "Languages",
    items: ["Python", "C++", "SQL"],
  },
  {
    category: "GenAI / LLMs",
    items: [
      "Azure OpenAI",
      "Azure AI Foundry",
      "Model Context Protocol (MCP)",
      "RAG",
      "NL-to-SQL",
      "Prompt Engineering",
      "Agentic AI",
      "Multi-Agent Orchestration",
    ],
  },
  {
    category: "ML / Data Science",
    items: [
      "Double Machine Learning (DML)",
      "scikit-learn",
      "XGBoost",
      "LightGBM",
      "Node2Vec",
      "SHAP",
      "Bayesian Optimization",
      "A/B Testing",
      "Pyomo",
      "IPOPT",
      "pandas",
      "NumPy",
      "PySpark",
    ],
  },
  {
    category: "Search / RAG",
    items: [
      "Azure AI Search",
      "Semantic + Vector Hybrid",
      "Index Design",
      "Document Chunking",
      "Vector Embeddings",
      "Reranking",
    ],
  },
  {
    category: "Cloud / Infrastructure",
    items: [
      "Azure Container Apps",
      "Microsoft Fabric",
      "ADLS",
      "Blob Storage",
      "Key Vault",
      "Redis",
      "AKS",
      "Azure ML",
      "Databricks",
      "MLOps",
      "Docker",
    ],
  },
];

const experience = [
  {
    title: "Senior Software Engineer 2",
    company: "MAQ Software (Microsoft)",
    period: "Sep 2024 – Present",
    highlights: [
      "Architected AERO — multi-agent AI platform with 7 MCP tools, NL-to-SQL, across 3 Azure regions",
      "23,000+ LOC, 960+ tests, 5 domain-specific sub-agents",
    ],
  },
  {
    title: "Senior Software Engineer 1",
    company: "MAQ Software (Microsoft)",
    period: "Sep 2022 – Aug 2024",
    highlights: [
      "Led AI4CELA — 8+ copilots processing 131K+ legal docs, team of 10+",
      "Built Partner Skilling — EconML/DML causal ML pipeline for 1,600+ partners",
    ],
  },
  {
    title: "Software Engineer 2",
    company: "MAQ Software (Microsoft)",
    period: "Mar 2020 – Aug 2022",
    highlights: [
      "Built Monocle — 5-model recommendation engine with 100K+ daily recommendations on AKS",
    ],
  },
  {
    title: "Software Engineer 1",
    company: "MAQ Software (Microsoft)",
    period: "Aug 2018 – Feb 2020",
    highlights: [
      "Neo4J recommendation engine, NLP ticket classification, sentiment analysis",
    ],
  },
];

export default function ResumePage() {
  return (
    <div className="pt-24 pb-16 bg-white dark:bg-navy-900">
      <section className="section-container">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
            <div>
              <h1 className="section-title gradient-text">Resume</h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                ML Engineer with 7+ years building AI platforms for Microsoft.
              </p>
            </div>
            <a
              href="/Ajay_Kumar_Resume.pdf"
              download
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/25 shrink-0"
            >
              <Download size={18} />
              Download PDF
            </a>
          </div>
        </ScrollReveal>

        {/* Summary */}
        <ScrollReveal>
          <div className="card mb-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="text-blue-400" size={20} />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Professional Summary
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              ML Engineer with 7+ years building AI platforms for Microsoft —
              from multi-agent orchestration and NL-to-SQL pipelines to causal
              inference and constrained optimization, serving enterprise legal
              and partner analytics teams.
            </p>
          </div>
        </ScrollReveal>

        {/* Experience */}
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Experience
          </h2>
        </ScrollReveal>
        <div className="space-y-4 mb-10">
          {experience.map((exp, i) => (
            <ScrollReveal key={exp.period} delay={i * 0.1}>
              <div className="card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {exp.title}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full whitespace-nowrap self-start">
                    {exp.period}
                  </span>
                </div>
                <p className="text-sm text-blue-500 dark:text-blue-400 mb-2">
                  {exp.company}
                </p>
                <ul className="space-y-1.5">
                  {exp.highlights.map((h, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span className="mt-2 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Skills */}
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Technical Skills
          </h2>
        </ScrollReveal>
        <div className="space-y-4 mb-10">
          {skills.map((group, i) => (
            <ScrollReveal key={group.category} delay={i * 0.05}>
              <div className="card">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
                  {group.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Education & Certs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScrollReveal>
            <div className="card h-full">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Education
              </h2>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                B.Tech in Information Technology
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                KIET, Ghaziabad • 2014 – 2018
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="card h-full">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Certifications
              </h2>
              <ul className="space-y-2 text-sm">
                <li className="text-gray-700 dark:text-gray-300">
                  Azure Data Scientist Associate (DP-100)
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Microsoft
                  </span>
                </li>
                <li className="text-gray-700 dark:text-gray-300">
                  Machine Learning Specialization
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Stanford / deeplearning.ai
                  </span>
                </li>
                <li className="text-gray-700 dark:text-gray-300">
                  Neural Networks and Deep Learning
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    deeplearning.ai
                  </span>
                </li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
