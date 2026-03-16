"use client";

import ScrollReveal from "@/components/ScrollReveal";
import {
  Brain,
  Cloud,
  Database,
  Code2,
  Search,
  Settings,
} from "lucide-react";

const skillCategories = [
  {
    title: "Languages",
    icon: Code2,
    skills: ["Python", "C++", "SQL", "TypeScript"],
  },
  {
    title: "GenAI / LLMs",
    icon: Brain,
    skills: [
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
    title: "ML / Data Science",
    icon: Database,
    skills: [
      "Double Machine Learning (DML)",
      "scikit-learn",
      "XGBoost",
      "LightGBM",
      "Node2Vec",
      "SHAP",
      "Bayesian Optimization",
      "A/B Testing",
      "Feature Engineering",
      "Pyomo",
      "IPOPT",
      "PySpark",
      "pandas",
      "NumPy",
    ],
  },
  {
    title: "Search / RAG",
    icon: Search,
    skills: [
      "Azure AI Search",
      "Semantic + Vector Hybrid",
      "Search Index Design",
      "Document Chunking",
      "Vector Embeddings",
      "Few-Shot Retrieval",
      "Reranking",
    ],
  },
  {
    title: "Cloud / Infrastructure",
    icon: Cloud,
    skills: [
      "Azure Container Apps",
      "Microsoft Fabric Lakehouse",
      "Azure Data Lake Storage",
      "Azure Blob Storage",
      "Azure Key Vault",
      "Azure Cache for Redis",
      "Azure Kubernetes Service",
      "Azure ML",
      "Azure Databricks",
      "MLOps",
      "Docker",
    ],
  },
  {
    title: "Frameworks & Tools",
    icon: Settings,
    skills: [
      "FastAPI",
      "ASP.NET Core",
      "React",
      "Next.js",
      "Prompt Flow",
      "MLflow",
      "spaCy",
      "NLTK",
      "Neo4J",
      "NetworkX",
      "OpenTelemetry",
    ],
  },
];

export default function SkillsPage() {
  return (
    <div className="pt-24 pb-16 bg-white dark:bg-navy-900">
      <section className="section-container">
        <ScrollReveal>
          <h1 className="section-title gradient-text">Skills</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-3xl mb-12">
            Technologies and tools I work with across the ML/AI stack — from
            causal inference and LLM orchestration to cloud deployment and
            search systems.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {skillCategories.map((category, index) => (
            <ScrollReveal key={category.title} delay={index * 0.1}>
              <div className="card h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-blue-500/10">
                    <category.icon className="text-blue-400" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {category.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-blue-500/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}
