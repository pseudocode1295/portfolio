// ─── Types & company list ─────────────────────────────────────────────────────
// This file has NO Node.js / Playwright imports — safe to import from client components.

export type CompanyCategory = "FAANG" | "Big Tech" | "Product" | "Indian Unicorn" | "MNC" | "AI/ML" | "Data & Infra" | "Analytics & Consulting" | "Finance & Banking" | "Other";

export interface CompanyConfig {
  name: string;
  slug: string;
  category: CompanyCategory;
  scrapeType: "greenhouse" | "lever" | "ashby" | "web" | "google" | "amazon" | "apple" | "microsoft" | "workday" | "llm";
  boardId?: string;    // greenhouse/ashby boardId OR workday "tenant/board"
  companyId?: string;  // lever company slug
  careersUrl?: string; // web scraper URL
}

export const COMPANIES: CompanyConfig[] = [
  // ── FAANG ──────────────────────────────────────────────────────────────────
  { name: "Google",    slug: "google",    category: "FAANG", scrapeType: "google" },
  { name: "Amazon",    slug: "amazon",    category: "FAANG", scrapeType: "amazon" },
  { name: "Apple",     slug: "apple",     category: "FAANG", scrapeType: "apple" },
  { name: "Microsoft", slug: "microsoft", category: "FAANG", scrapeType: "microsoft" },
  { name: "Uber",      slug: "uber",      category: "FAANG", scrapeType: "greenhouse", boardId: "uberfreight" },

  // ── Big Tech ───────────────────────────────────────────────────────────────
  { name: "Airbnb",      slug: "airbnb",      category: "Big Tech", scrapeType: "greenhouse", boardId: "airbnb" },
  { name: "LinkedIn",    slug: "linkedin",    category: "Big Tech", scrapeType: "greenhouse", boardId: "linkedin" },
  { name: "Pinterest",   slug: "pinterest",   category: "Big Tech", scrapeType: "greenhouse", boardId: "pinterest" },
  { name: "Lyft",        slug: "lyft",        category: "Big Tech", scrapeType: "greenhouse", boardId: "lyft" },
  { name: "DoorDash",    slug: "doordash",    category: "Big Tech", scrapeType: "greenhouse", boardId: "doordashusa" },
  { name: "Palantir",    slug: "palantir",    category: "Big Tech", scrapeType: "lever",      companyId: "palantir" },
  { name: "Instacart",   slug: "instacart",   category: "Big Tech", scrapeType: "greenhouse", boardId: "instacart" },
  { name: "Reddit",      slug: "reddit",      category: "Big Tech", scrapeType: "greenhouse", boardId: "reddit" },
  { name: "Discord",     slug: "discord",     category: "Big Tech", scrapeType: "greenhouse", boardId: "discord" },
  { name: "Duolingo",    slug: "duolingo",    category: "Big Tech", scrapeType: "greenhouse", boardId: "duolingo" },

  // ── Product Companies ──────────────────────────────────────────────────────
  { name: "Stripe",      slug: "stripe",      category: "Product", scrapeType: "greenhouse", boardId: "stripe" },
  { name: "Figma",       slug: "figma",       category: "Product", scrapeType: "greenhouse", boardId: "figma" },
  { name: "Notion",      slug: "notion",      category: "Product", scrapeType: "ashby",      boardId: "notion" },
  { name: "Dropbox",     slug: "dropbox",     category: "Product", scrapeType: "greenhouse", boardId: "dropbox" },
  { name: "Grammarly",   slug: "grammarly",   category: "Product", scrapeType: "greenhouse", boardId: "grammarly" },
  { name: "Twilio",      slug: "twilio",      category: "Product", scrapeType: "greenhouse", boardId: "twilio" },
  { name: "Postman",     slug: "postman",     category: "Product", scrapeType: "greenhouse", boardId: "postman" },
  { name: "Gong",        slug: "gong",        category: "Product", scrapeType: "greenhouse", boardId: "gongio" },
  { name: "Twitch",      slug: "twitch",      category: "Product", scrapeType: "greenhouse", boardId: "twitch" },
  { name: "HubSpot",     slug: "hubspot",     category: "Product", scrapeType: "greenhouse", boardId: "hubspot" },
  { name: "Datadog",     slug: "datadog",     category: "Product", scrapeType: "greenhouse", boardId: "datadog" },
  { name: "Cloudflare",  slug: "cloudflare",  category: "Product", scrapeType: "greenhouse", boardId: "cloudflare" },
  { name: "Coinbase",    slug: "coinbase",    category: "Product", scrapeType: "greenhouse", boardId: "coinbase" },
  { name: "Airtable",    slug: "airtable",    category: "Product", scrapeType: "greenhouse", boardId: "airtable" },
  { name: "Asana",       slug: "asana",       category: "Product", scrapeType: "greenhouse", boardId: "asana" },
  { name: "Miro",        slug: "miro",        category: "Product", scrapeType: "greenhouse", boardId: "realtimeboardglobal" },
  { name: "Robinhood",   slug: "robinhood",   category: "Product", scrapeType: "greenhouse", boardId: "robinhood" },
  { name: "Plaid",       slug: "plaid",       category: "Product", scrapeType: "lever",      companyId: "plaid" },
  { name: "Brex",        slug: "brex",        category: "Product", scrapeType: "greenhouse", boardId: "brex" },
  { name: "Linear",      slug: "linear",      category: "Product", scrapeType: "ashby",      boardId: "linear" },
  { name: "Ramp",        slug: "ramp",        category: "Product", scrapeType: "ashby",      boardId: "ramp" },
  { name: "Deel",        slug: "deel",        category: "Product", scrapeType: "lever",      companyId: "deel" },
  { name: "Box",         slug: "box",         category: "Product", scrapeType: "greenhouse", boardId: "box" },
  { name: "Intercom",    slug: "intercom",    category: "Product", scrapeType: "greenhouse", boardId: "intercom" },

  // ── Indian Unicorns & Startups ─────────────────────────────────────────────
  { name: "Razorpay",      slug: "razorpay",      category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "razorpay" },
  { name: "Freshworks",    slug: "freshworks",    category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "freshworks" },
  { name: "CRED",          slug: "cred",          category: "Indian Unicorn", scrapeType: "lever",      companyId: "cred" },
  { name: "Meesho",        slug: "meesho",        category: "Indian Unicorn", scrapeType: "lever",      companyId: "meesho" },
  { name: "Urban Company", slug: "urbancompany",  category: "Indian Unicorn", scrapeType: "lever",      companyId: "urbancompany" },
  { name: "Groww",         slug: "groww",         category: "Indian Unicorn", scrapeType: "lever",      companyId: "groww" },
  { name: "Zepto",         slug: "zepto",         category: "Indian Unicorn", scrapeType: "lever",      companyId: "zepto" },
  { name: "PhonePe",       slug: "phonepe",       category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "phonepe" },
  { name: "Swiggy",        slug: "swiggy",        category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "swiggy" },
  { name: "Zomato",        slug: "zomato",        category: "Indian Unicorn", scrapeType: "lever",      companyId: "zomato" },
  { name: "Nykaa",         slug: "nykaa",         category: "Indian Unicorn", scrapeType: "lever",      companyId: "nykaa" },
  { name: "Chargebee",     slug: "chargebee",     category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "chargebee" },
  { name: "CleverTap",     slug: "clevertap",     category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "clevertap" },
  { name: "Dream11",       slug: "dream11",       category: "Indian Unicorn", scrapeType: "lever",      companyId: "dream11" },
  { name: "Dunzo",         slug: "dunzo",         category: "Indian Unicorn", scrapeType: "lever",      companyId: "dunzo" },
  { name: "Ola",           slug: "ola",           category: "Indian Unicorn", scrapeType: "lever",      companyId: "ola-cabs" },
  { name: "Delhivery",     slug: "delhivery",     category: "Indian Unicorn", scrapeType: "lever",      companyId: "delhivery" },
  { name: "MoEngage",      slug: "moengage",      category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "moengage" },
  { name: "Darwinbox",     slug: "darwinbox",     category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "darwinbox" },
  { name: "InMobi",        slug: "inmobi",        category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "inmobi" },
  { name: "Leadsquared",   slug: "leadsquared",   category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "leadsquared" },
  { name: "Exotel",        slug: "exotel",        category: "Indian Unicorn", scrapeType: "lever",      companyId: "exotel" },

  // ── MNCs in India ─────────────────────────────────────────────────────────
  { name: "PayPal",              slug: "paypal",       category: "MNC", scrapeType: "greenhouse", boardId: "paypal" },
  { name: "Walmart Global Tech", slug: "walmart",      category: "MNC", scrapeType: "greenhouse", boardId: "walmartglobaltech" },
  { name: "Cisco",               slug: "cisco",        category: "MNC", scrapeType: "greenhouse", boardId: "cisco" },
  { name: "Workday",             slug: "workday",      category: "MNC", scrapeType: "greenhouse", boardId: "workday" },
  { name: "Wayfair",             slug: "wayfair",      category: "MNC", scrapeType: "greenhouse", boardId: "wayfair" },
  { name: "ThoughtWorks",        slug: "thoughtworks", category: "MNC", scrapeType: "greenhouse", boardId: "thoughtworks" },
  { name: "EPAM Systems",        slug: "epam",         category: "MNC", scrapeType: "greenhouse", boardId: "epamsystems" },
  { name: "GlobalLogic",         slug: "globallogic",  category: "MNC", scrapeType: "greenhouse", boardId: "globallogic" },
  { name: "Publicis Sapient",    slug: "sapient",      category: "MNC", scrapeType: "lever",      companyId: "publicis-sapient" },
  { name: "Elastic",             slug: "elastic",      category: "MNC", scrapeType: "greenhouse", boardId: "elastic" },
  { name: "Splunk",              slug: "splunk",       category: "MNC", scrapeType: "greenhouse", boardId: "splunk" },
  { name: "Okta",                slug: "okta",         category: "MNC", scrapeType: "greenhouse", boardId: "okta" },

  // ── AI / ML Companies ─────────────────────────────────────────────────────
  { name: "OpenAI",           slug: "openai",      category: "AI/ML", scrapeType: "greenhouse", boardId: "openai" },
  { name: "Anthropic",        slug: "anthropic",   category: "AI/ML", scrapeType: "lever",      companyId: "anthropic" },
  { name: "Cohere",           slug: "cohere",      category: "AI/ML", scrapeType: "greenhouse", boardId: "cohere" },
  { name: "Scale AI",         slug: "scaleai",     category: "AI/ML", scrapeType: "greenhouse", boardId: "scaleai" },
  { name: "Hugging Face",     slug: "huggingface", category: "AI/ML", scrapeType: "lever",      companyId: "huggingface" },
  { name: "Weights & Biases", slug: "wandb",       category: "AI/ML", scrapeType: "greenhouse", boardId: "wandb" },
  { name: "Stability AI",     slug: "stabilityai", category: "AI/ML", scrapeType: "lever",      companyId: "stability-ai" },
  { name: "Mistral AI",       slug: "mistral",     category: "AI/ML", scrapeType: "lever",      companyId: "mistral" },
  { name: "Runway",           slug: "runway",      category: "AI/ML", scrapeType: "lever",      companyId: "runwayml" },
  { name: "Together AI",      slug: "togetherai",  category: "AI/ML", scrapeType: "greenhouse", boardId: "togetherai" },

  // ── Data & Infrastructure ─────────────────────────────────────────────────
  { name: "MongoDB",    slug: "mongodb",    category: "Data & Infra", scrapeType: "greenhouse", boardId: "mongodb" },
  { name: "Snowflake",  slug: "snowflake",  category: "Data & Infra", scrapeType: "greenhouse", boardId: "snowflake" },
  { name: "Databricks", slug: "databricks", category: "Data & Infra", scrapeType: "greenhouse", boardId: "databricks" },
  { name: "Confluent",  slug: "confluent",  category: "Data & Infra", scrapeType: "greenhouse", boardId: "confluent" },
  { name: "HashiCorp",  slug: "hashicorp",  category: "Data & Infra", scrapeType: "greenhouse", boardId: "hashicorp" },
  { name: "GitLab",     slug: "gitlab",     category: "Data & Infra", scrapeType: "greenhouse", boardId: "gitlab" },
  { name: "PagerDuty",  slug: "pagerduty",  category: "Data & Infra", scrapeType: "greenhouse", boardId: "pagerduty" },
  { name: "Vercel",     slug: "vercel",     category: "Data & Infra", scrapeType: "lever",      companyId: "vercel" },
  { name: "Retool",     slug: "retool",     category: "Data & Infra", scrapeType: "greenhouse", boardId: "retool" },
  { name: "Airbyte",    slug: "airbyte",    category: "Data & Infra", scrapeType: "greenhouse", boardId: "airbyte" },

  // ── Finance & Banking ─────────────────────────────────────────────────────
  // Workday companies: boardId = "tenant/board" → POST https://{tenant}.wd5.myworkdayjobs.com/wday/cxs/{tenant}/{board}/jobs
  // Verified working (200): citi/2, ms/External, target/targetcareers
  { name: "Citi",              slug: "citi",          category: "Finance & Banking", scrapeType: "workday", boardId: "citi/2" },
  { name: "Morgan Stanley",    slug: "morganstanley", category: "Finance & Banking", scrapeType: "workday", boardId: "ms/External" },
  { name: "Target",            slug: "target",        category: "Finance & Banking", scrapeType: "workday", boardId: "target/targetcareers" },
  // AmEx — LLM-powered scraper on their main careers site
  { name: "American Express",  slug: "amex",          category: "Finance & Banking", scrapeType: "llm", careersUrl: "https://www.americanexpress.com/en-us/careers/search-jobs/" },
  // JPMorgan — LLM-powered scraper on their main careers site
  { name: "JPMorgan Chase",    slug: "jpmorgan",      category: "Finance & Banking", scrapeType: "llm", careersUrl: "https://careers.jpmorgan.com/us/en/jobs/technology?search=machine+learning" },
  // Goldman Sachs — Workday with bot protection; board unverified
  { name: "Goldman Sachs",     slug: "goldmansachs",  category: "Finance & Banking", scrapeType: "workday", boardId: "gs/External_Career_Site" },
  // Mastercard — Workday with bot protection; board unverified
  { name: "Mastercard",        slug: "mastercard",    category: "Finance & Banking", scrapeType: "workday", boardId: "mastercard/MasterCard" },
  // Deutsche Bank, HSBC, BlackRock — board names unverified, will fail gracefully if wrong
  { name: "Deutsche Bank",     slug: "deutschebank",  category: "Finance & Banking", scrapeType: "workday", boardId: "db/dbcareers" },
  { name: "HSBC",              slug: "hsbc",          category: "Finance & Banking", scrapeType: "workday", boardId: "hsbc/external" },
  { name: "BlackRock",         slug: "blackrock",     category: "Finance & Banking", scrapeType: "workday", boardId: "blackrock/blackrock-careers" },

  // ── Analytics & Consulting ────────────────────────────────────────────────
  { name: "Sigmoid",           slug: "sigmoid",       category: "Analytics & Consulting", scrapeType: "greenhouse", boardId: "sigmoid" },
  { name: "DataRobot",         slug: "datarobot",     category: "Analytics & Consulting", scrapeType: "greenhouse", boardId: "datarobot" },
  { name: "H2O.ai",            slug: "h2oai",         category: "Analytics & Consulting", scrapeType: "greenhouse", boardId: "h2oai" },
  { name: "Alteryx",           slug: "alteryx",       category: "Analytics & Consulting", scrapeType: "greenhouse", boardId: "alteryx" },
  { name: "Quantiphi",         slug: "quantiphi",     category: "Analytics & Consulting", scrapeType: "lever",      companyId: "quantiphi" },
  { name: "Fractal Analytics", slug: "fractal",       category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://fractal.ai/careers/?s=machine+learning" },
  { name: "Nagarro",           slug: "nagarro",       category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://www.nagarro.com/en/careers/open-positions" },
  { name: "Tiger Analytics",   slug: "tigeranalytics",category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://www.tigeranalytics.com/careers/" },
  { name: "PwC India",         slug: "pwc",           category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://jobs.pwc.com/India/search?q=machine+learning&sortColumn=referencedate&sortDirection=desc" },
  { name: "Deloitte India",    slug: "deloitte",      category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://jobs.deloitte.com/india/search-jobs/machine-learning/222/1" },
  { name: "Accenture India",   slug: "accenture",     category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://www.accenture.com/in-en/careers/jobsearch?jk=machine+learning&sb=1&vw=0&is_rj=0&pg=1" },
  { name: "Capgemini India",   slug: "capgemini",     category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://www.capgemini.com/in-en/careers/job-search/?search_term=machine+learning" },
  { name: "EXL Service",       slug: "exl",           category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://jobs.exlservice.com/job-search-results/?keyword=machine+learning&location=India" },
  { name: "ZS Associates",     slug: "zs",            category: "Analytics & Consulting", scrapeType: "web", careersUrl: "https://www.zs.com/careers/find-a-job?jobfunction=Advanced%20Analytics%20%26%20Insights&location=India" },
];
