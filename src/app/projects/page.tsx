"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Scale,
  GraduationCap,
  Eye,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

const projects = [
  {
    id: "aero",
    title: "AERO",
    subtitle: "Analytical Enterprise Reporting & Orchestration",
    period: "Sep 2024 – Present",
    icon: Bot,
    color: "from-blue-500 to-cyan-500",
    tagline:
      "Multi-agent AI orchestration platform for Microsoft CELA — replaces 3 Power BI dashboards with a single conversational AI interface.",
    highlights: [
      "7 production MCP tools across 5 domains (sales, compliance, partner search, web search, report generation)",
      "Multi-region deployment across 3 Azure regions with circuit breaker failover",
      "NL-to-SQL pipeline with 4-layer prompt injection defense and sub-15ms cache hits",
      "Automated DOCX report generation querying 15+ DataFrames in parallel with LLM summaries",
      "Adverse media screening with severity classification and background task deduplication",
      "960+ automated tests across 23,000+ LOC spanning 3 repositories",
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
      "React",
      "TypeScript",
    ],
    impact: [
      "Consolidated 3 disconnected Power BI reports into a single AI-powered interface",
      "Integrated 10+ Azure services into a cohesive multi-region platform",
      "Sub-15ms P50 latency on cache hits, 2-5s on cache miss",
      "Passed SSPA/ACE/ISRM/GDPR compliance and security scans",
    ],
  },
  {
    id: "ai4cela",
    title: "AI4CELA",
    subtitle: "Integrated Copilot Platform for CELA",
    period: "Sep 2022 – Aug 2024",
    icon: Scale,
    color: "from-violet-500 to-purple-500",
    tagline:
      "Enterprise AI copilot platform with 8+ specialized legal-domain copilots processing 131K+ legal documents.",
    highlights: [
      "8+ domain-specific copilots: Outside Counsel, RFI, Policy, GRA, Investigations, Virgo, Gaming",
      "14-step data pipeline on Databricks extracting 17+ structured fields per document via GPT-4",
      "131,000+ legal documents processed (49K emails + 82K attachments) through PII redaction and enrichment",
      "4 Azure Cognitive Search indexes for hybrid retrieval (semantic + vector + text)",
      "React + Fluent UI chat interface with streaming responses and document viewer",
      "Multi-region GPT-4 deployment via APIM across 9 Azure regions",
    ],
    technologies: [
      "ASP.NET Core 8",
      "Azure OpenAI GPT-4",
      "Azure ML Prompt Flow",
      "PySpark",
      "Databricks",
      "Azure Cognitive Search",
      "React",
      "Fluent UI",
      "MSAL",
      "Azure APIM",
    ],
    impact: [
      "Led 10+ engineer team through full lifecycle to production launch",
      "Processed 131K+ legal documents with automated PII redaction",
      "Scaled from 20-30 to 50-100 concurrent users",
      "Passed Threat Model and Responsible AI reviews",
    ],
  },
  {
    id: "partner-skilling",
    title: "Partner Skilling",
    subtitle: "Investment Optimization System",
    period: "Sep 2022 – Aug 2024",
    icon: GraduationCap,
    color: "from-emerald-500 to-teal-500",
    tagline:
      "Causal ML pipeline modeling training ROI across 1,600+ Microsoft partners with constrained optimization for budget allocation.",
    highlights: [
      "Transitioned from XGBoost to EconML's LinearDML to isolate causal effects of training on revenue",
      "Constrained nonlinear optimization using Pyomo/IPOPT for minimum capacity increases per partner",
      "Multi-method outlier detection: Isolation Forest, Z-score, IQR, DBSCAN, Box Plot consensus",
      "86,400+ monthly data points across 17 regions and 6 solution areas (FY23-FY25)",
      "8+ regression models evaluated per solution area with automated transformation selection",
      "Scaled from Top-50 prototype to 1,600+ partners across all segments",
    ],
    technologies: [
      "Python",
      "EconML",
      "Pyomo",
      "IPOPT",
      "XGBoost",
      "LightGBM",
      "scikit-learn",
      "SHAP",
      "PySpark",
      "Azure ML",
      "pandas",
      "statsmodels",
    ],
    impact: [
      "Enabled data-driven skilling investment decisions across 1,600+ partners",
      "Provided causal evidence (not just correlation) of training ROI via EconML",
      "Generated actionable capacity plans for FY25 revenue targets",
      "Automated preprocessing from multiple disparate data sources into unified dataset",
    ],
  },
  {
    id: "monocle",
    title: "Monocle",
    subtitle: "Multi-Model Recommendation Engine",
    period: "Mar 2020 – Aug 2022",
    icon: Eye,
    color: "from-amber-500 to-orange-500",
    tagline:
      "Production-grade recommendation engine combining 5 ML models for personalized content recommendations to Microsoft Partners.",
    highlights: [
      "LightGBM multi-class classifier with TF-IDF vectorization (sublinear scaling, bigrams)",
      "Knowledge Graph using Node2Vec (128-dim embeddings) on NetworkX multi-type graph",
      "User-User Collaborative Filtering with PySpark distributed similarity matrices and temporal decay",
      "FP-Growth Association Rules mining co-consumption patterns across course sequences",
      "Bayesian optimization (hyperopt) for ensemble weight tuning across all 5 models",
      "Domain-specific NLP pipeline with spaCy, custom stopwords (200+ terms), abbreviation normalization",
    ],
    technologies: [
      "Python",
      "LightGBM",
      "Node2Vec",
      "PySpark",
      "NetworkX",
      "MLflow",
      "Azure ML",
      "Azure Kubernetes Service",
      "Docker",
      "spaCy",
      "hyperopt",
    ],
    impact: [
      "20% improvement in Precision and Recall over baseline",
      "Processed 100K+ case records with 500K+ user interactions",
      "Deployed as real-time scoring endpoints on AKS",
      "Automated retraining via AML pipeline orchestration",
    ],
  },
];

export default function ProjectsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="pt-24 pb-16 bg-white dark:bg-navy-900">
      <section className="section-container">
        <ScrollReveal>
          <h1 className="section-title gradient-text">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-3xl mb-12">
            Enterprise AI platforms built for Microsoft — each serving
            hundreds of users across legal, partner, and analytics domains.
          </p>
        </ScrollReveal>

        <div className="space-y-6">
          {projects.map((project, index) => (
            <ScrollReveal key={project.id} delay={index * 0.1}>
              <div className="card overflow-hidden">
                {/* Header - always visible */}
                <button
                  onClick={() => toggleExpand(project.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${project.color} shrink-0`}
                    >
                      <project.icon className="text-white" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {project.title}
                          </h3>
                          <p className="text-sm text-blue-500 dark:text-blue-400 font-medium">
                            {project.subtitle}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="hidden sm:inline text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                            {project.period}
                          </span>
                          <motion.div
                            animate={{
                              rotate: expandedId === project.id ? 180 : 0,
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown
                              size={20}
                              className="text-gray-400"
                            />
                          </motion.div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                        {project.tagline}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Expandable content */}
                <AnimatePresence>
                  {expandedId === project.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 space-y-6">
                        {/* Key Highlights */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                            Key Highlights
                          </h4>
                          <ul className="space-y-2">
                            {project.highlights.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400"
                              >
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Impact */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                            Impact
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {project.impact.map((item, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg p-3"
                              >
                                <span className="text-green-500 mt-0.5">
                                  ✓
                                </span>
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Technologies */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                            Technologies
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech) => (
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}
