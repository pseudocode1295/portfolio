"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowDown, Mail, Linkedin, BookOpen } from "lucide-react";

const titles = [
  "ML Engineer",
  "GenAI Developer",
  "AI Platform Architect",
  "Causal Inference Practitioner",
];

export default function HomePage() {
  const [titleIndex, setTitleIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentTitle = titles[titleIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setDisplayText(currentTitle.slice(0, displayText.length + 1));
          if (displayText.length === currentTitle.length) {
            setTimeout(() => setIsDeleting(true), 1800);
          }
        } else {
          setDisplayText(currentTitle.slice(0, displayText.length - 1));
          if (displayText.length === 0) {
            setIsDeleting(false);
            setTitleIndex((prev) => (prev + 1) % titles.length);
          }
        }
      },
      isDeleting ? 40 : 80
    );
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, titleIndex]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-charcoal-900 to-navy-800 dark:from-navy-900 dark:via-charcoal-900 dark:to-navy-800" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-accent)_0%,_transparent_50%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_#06b6d4_0%,_transparent_50%)] opacity-5" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-blue-400 text-sm sm:text-base font-medium tracking-wider uppercase mb-4">
            Hello, I&apos;m
          </p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Ajay Kumar
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-12 sm:h-14 flex items-center justify-center mb-8"
        >
          <span className="text-xl sm:text-2xl lg:text-3xl text-gray-300 font-light">
            {displayText}
            <span className="animate-pulse text-blue-400 ml-0.5">|</span>
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          7+ years building AI platforms for Microsoft — from multi-agent
          orchestration and NL-to-SQL pipelines to causal inference and
          constrained optimization.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Link
            href="/projects"
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/25"
          >
            View Projects
          </Link>
          <Link
            href="/about"
            className="px-8 py-3 border border-white/20 text-white hover:bg-white/10 font-medium rounded-lg transition-colors"
          >
            About Me
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center gap-6"
        >
          <a
            href="https://linkedin.com/in/ajaykumar1295"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-blue-400 transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin size={20} />
          </a>
          <a
            href="https://medium.com/@ajaykumar129595"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-blue-400 transition-colors"
            aria-label="Medium"
          >
            <BookOpen size={20} />
          </a>
          <a
            href="mailto:ajaykumar129595@gmail.com"
            className="text-gray-500 hover:text-blue-400 transition-colors"
            aria-label="Email"
          >
            <Mail size={20} />
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ArrowDown className="text-gray-500" size={20} />
        </motion.div>
      </motion.div>
    </div>
  );
}
