import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";

type AtsType = "greenhouse" | "lever" | "ashby" | "none";

interface DetectResult {
  ats: AtsType;
  boardId: string | null;
  note: string;
  careersUrl?: string; // fallback web URL from search
}

// ─── Search DuckDuckGo for the company's ATS page ────────────────────────────

async function searchAts(companyName: string): Promise<DetectResult | null> {
  const query = `${companyName} jobs (site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com)`;
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; job-hunt-bot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Extract all hrefs from the result links
    const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]);

    for (const href of hrefs) {
      // Greenhouse: boards.greenhouse.io/{boardId}
      const gh = href.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/);
      if (gh) return { ats: "greenhouse", boardId: gh[1], note: `Found via search: boards.greenhouse.io/${gh[1]}` };

      // Lever: jobs.lever.co/{companyId}
      const lev = href.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/);
      if (lev) return { ats: "lever", boardId: lev[1], note: `Found via search: jobs.lever.co/${lev[1]}` };

      // Ashby: jobs.ashbyhq.com/{boardId}
      const ash = href.match(/jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/);
      if (ash) return { ats: "ashby", boardId: ash[1], note: `Found via search: jobs.ashbyhq.com/${ash[1]}` };
    }

    // Search also for careers/jobs page URL as fallback
    const careersMatch = hrefs.find(h => /careers|jobs/.test(h) && !h.includes("duckduckgo") && !h.includes("linkedin") && !h.includes("indeed"));
    if (careersMatch) return { ats: "none", boardId: null, note: "Not on a known ATS", careersUrl: careersMatch };

    return null;
  } catch {
    return null;
  }
}

// ─── Fallback: probe ATS endpoints directly with slug variants ───────────────

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}

async function probeSlug(slug: string): Promise<DetectResult | null> {
  const [ghOk, levOk, ashOk] = await Promise.all([
    probe(`https://boards.greenhouse.io/embed/job_board?for=${slug}`),
    probe(`https://api.lever.co/v0/postings/${slug}`),
    probe(`https://api.ashbyhq.com/posting-api/job-board/${slug}`),
  ]);
  if (ghOk)  return { ats: "greenhouse", boardId: slug, note: `boards.greenhouse.io/${slug}` };
  if (levOk) return { ats: "lever",      boardId: slug, note: `jobs.lever.co/${slug}` };
  if (ashOk) return { ats: "ashby",      boardId: slug, note: `jobs.ashbyhq.com/${slug}` };
  return null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name param required" }, { status: 400 });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");

  // 1. Search the web first — most reliable, handles non-obvious board IDs
  const searchResult = await searchAts(name);
  if (searchResult && searchResult.ats !== "none") return NextResponse.json(searchResult);

  // 2. Direct probe with common slug variants
  const variants = [slug, slug + "-inc", slug + "hq"];
  for (const v of variants) {
    const probeResult = await probeSlug(v);
    if (probeResult) return NextResponse.json(probeResult);
  }

  // 3. Nothing found — return best careers URL guess (search result or constructed)
  const guessedUrl = searchResult?.careersUrl ?? `https://www.${slug}.com/careers`;
  return NextResponse.json<DetectResult>({ ats: "none", boardId: null, note: "Not found on Greenhouse / Lever / Ashby", careersUrl: guessedUrl });
}
