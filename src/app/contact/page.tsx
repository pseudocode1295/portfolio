"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { motion } from "framer-motion";
import { Mail, Linkedin, BookOpen, Send, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("https://formspree.io/f/xwpkbjdz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="pt-24 pb-16 bg-white dark:bg-navy-900">
      <section className="section-container max-w-2xl">
        <ScrollReveal>
          <h1 className="section-title gradient-text">Get in Touch</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-12">
            Have a question or want to work together? Drop me a message.
          </p>
        </ScrollReveal>

        {/* Direct links */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <a
              href="mailto:ajaykumar129595@gmail.com"
              className="card flex items-center gap-3 hover:border-blue-500/50 transition-colors"
            >
              <Mail className="text-blue-400 shrink-0" size={20} />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  ajaykumar129595@gmail.com
                </p>
              </div>
            </a>
            <a
              href="https://linkedin.com/in/ajaykumar1295"
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-center gap-3 hover:border-blue-500/50 transition-colors"
            >
              <Linkedin className="text-blue-400 shrink-0" size={20} />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  LinkedIn
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  ajaykumar1295
                </p>
              </div>
            </a>
            <a
              href="https://medium.com/@ajaykumar129595"
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-center gap-3 hover:border-blue-500/50 transition-colors"
            >
              <BookOpen className="text-blue-400 shrink-0" size={20} />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Medium
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  @ajaykumar129595
                </p>
              </div>
            </a>
          </div>
        </ScrollReveal>

        {/* Contact form */}
        <ScrollReveal delay={0.2}>
          {status === "success" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card text-center py-12"
            >
              <CheckCircle
                className="mx-auto text-green-500 mb-4"
                size={48}
              />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Message Sent!
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Thanks for reaching out. I&apos;ll get back to you soon.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-6 text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="card space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none"
                  placeholder="Your message..."
                />
              </div>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  "Sending..."
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
              {status === "error" && (
                <p className="text-red-500 text-sm text-center">
                  Failed to send. Please try again or email me directly.
                </p>
              )}
            </form>
          )}
        </ScrollReveal>
      </section>
    </div>
  );
}
