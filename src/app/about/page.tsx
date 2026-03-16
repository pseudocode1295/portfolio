"use client";

import ScrollReveal from "@/components/ScrollReveal";
import {
  GraduationCap,
  Award,
  MapPin,
  Mail,
  Briefcase,
  Code2,
} from "lucide-react";

const bio = {
  name: "Ajay Kumar",
  title: "ML Engineer",
  location: "Noida, India",
  email: "ajaykumar129595@gmail.com",
  summary:
    "ML Engineer with 7+ years building AI platforms for Microsoft — from multi-agent orchestration and NL-to-SQL pipelines to causal inference and constrained optimization, serving enterprise legal and partner analytics teams. All 4 roles at MAQ Software, promoted SE1 → SE2 → SSE1 → SSE2.",
};

const timeline = [
  {
    year: "2024 – Present",
    title: "Senior Software Engineer 2",
    company: "MAQ Software (Microsoft)",
    description:
      "Architecting AERO — a multi-agent AI orchestration platform for Microsoft CELA with 7 MCP tools, NL-to-SQL, and multi-region deployment across 3 Azure regions.",
  },
  {
    year: "2022 – 2024",
    title: "Senior Software Engineer 1",
    company: "MAQ Software (Microsoft)",
    description:
      "Led AI4CELA — an enterprise copilot platform with 8+ AI copilots processing 131K+ legal documents. Built Partner Skilling causal ML pipeline for 1,600+ partners.",
  },
  {
    year: "2020 – 2022",
    title: "Software Engineer 2",
    company: "MAQ Software (Microsoft)",
    description:
      "Built Monocle — a multi-model recommendation engine using LightGBM, Knowledge Graphs, Collaborative Filtering, and FP-Growth for Microsoft Partners.",
  },
  {
    year: "2018 – 2020",
    title: "Software Engineer 1",
    company: "MAQ Software (Microsoft)",
    description:
      "Developed real-time recommendation engines with Neo4J, ticket classification with NLP, and sentiment analysis systems.",
  },
];

const certifications = [
  {
    name: "Azure Data Scientist Associate (DP-100)",
    issuer: "Microsoft",
  },
  {
    name: "Machine Learning Specialization",
    issuer: "Coursera (Stanford / deeplearning.ai)",
  },
  {
    name: "Neural Networks and Deep Learning",
    issuer: "Coursera (deeplearning.ai)",
  },
  {
    name: "Data Warehousing for BI Specialization",
    issuer: "Coursera",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-24 pb-16 bg-white dark:bg-navy-900">
      {/* Hero section */}
      <section className="section-container">
        <ScrollReveal>
          <h1 className="section-title gradient-text">About Me</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-3xl mb-12">
            {bio.summary}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {[
            { icon: MapPin, label: "Location", value: bio.location },
            { icon: Briefcase, label: "Experience", value: "7+ Years" },
            { icon: Mail, label: "Email", value: bio.email },
          ].map((item, i) => (
            <ScrollReveal key={item.label} delay={i * 0.1}>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <item.icon className="text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {item.value}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Career Timeline */}
      <section className="section-container pt-0">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-10 flex items-center gap-3">
            <Briefcase className="text-blue-400" size={24} />
            Career Timeline
          </h2>
        </ScrollReveal>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-blue-500/50 to-transparent" />

          <div className="space-y-8">
            {timeline.map((item, index) => (
              <ScrollReveal key={item.year} delay={index * 0.1}>
                <div className="relative pl-12 sm:pl-16">
                  {/* Dot */}
                  <div className="absolute left-2.5 sm:left-4.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-navy-900" />
                  <div className="card">
                    <span className="text-xs font-medium text-blue-400 tracking-wider uppercase">
                      {item.year}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-blue-500 dark:text-blue-400 mb-2">
                      {item.company}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Education */}
      <section className="section-container pt-0">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <GraduationCap className="text-blue-400" size={24} />
            Education
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bachelor of Technology in Information Technology
            </h3>
            <p className="text-sm text-blue-500 dark:text-blue-400">
              Krishna Institute of Engineering and Technology (KIET), Ghaziabad
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              2014 – 2018
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Certifications */}
      <section className="section-container pt-0">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <Award className="text-blue-400" size={24} />
            Certifications
          </h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certifications.map((cert, index) => (
            <ScrollReveal key={cert.name} delay={index * 0.1}>
              <div className="card">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {cert.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {cert.issuer}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Publications */}
      <section className="section-container pt-0">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <Code2 className="text-blue-400" size={24} />
            Publications
          </h2>
        </ScrollReveal>
        <div className="space-y-3">
          {[
            "From XGBoost to Double Machine Learning: Causal Inference for Partner ROI",
            "Building Multi-Agent AI with MCP Protocol on Azure AI Foundry",
            "NL-to-SQL with LLMs: 4 Layers of Defense Against Prompt Injection",
          ].map((pub, index) => (
            <ScrollReveal key={pub} delay={index * 0.1}>
              <div className="card flex items-start gap-3">
                <span className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {pub}
                  <span className="text-gray-500 dark:text-gray-500 ml-2">
                    — Medium
                  </span>
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}
