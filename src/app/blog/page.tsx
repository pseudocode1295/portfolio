import { getAllPosts } from "@/lib/blog";
import BlogList from "@/components/BlogList";
import ScrollReveal from "@/components/ScrollReveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Ajay Kumar",
  description:
    "Technical blog posts on ML engineering, causal inference, multi-agent AI, and production security.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="pt-24 pb-16 bg-white dark:bg-navy-900">
      <section className="section-container">
        <ScrollReveal>
          <h1 className="section-title gradient-text">Blog</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-3xl mb-12">
            Deep dives into ML engineering, causal inference, agentic AI
            architecture, and production security patterns.
          </p>
        </ScrollReveal>

        <BlogList posts={posts} />
      </section>
    </div>
  );
}
