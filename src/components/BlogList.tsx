"use client";

import { useState } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import { Calendar, Clock, Tag, Search } from "lucide-react";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readingTime: string;
}

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)));

  const filtered = posts.filter((post) => {
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div>
      {/* Search & Filter */}
      <ScrollReveal>
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                !selectedTag
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  selectedTag === tag
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Posts */}
      <div className="space-y-6">
        {filtered.map((post, index) => (
          <ScrollReveal key={post.slug} delay={index * 0.1}>
            <Link href={`/blog/${post.slug}`} className="block group">
              <article className="card hover:shadow-md dark:hover:shadow-none transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {post.readingTime}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {post.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            </Link>
          </ScrollReveal>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No posts found matching your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
