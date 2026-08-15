const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

// ─── Config (uses env vars for secrets, falls back to defaults for local dev) ─
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || '';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || '';
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || '';
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD || '';
const SUBREDDIT = process.env.REDDIT_SUBREDDIT || 'API_Finder';
const AFFILIATE_ID = process.env.APIFY_AFFILIATE_ID || '97nrp4';
const APILAYER_AFFILIATE_ID = process.env.APILAYER_AFFILIATE_ID || 'nick77';
const GITHUB_REPO = 'https://github.com/p32nicky/apify-actors-directory';
const APILAYER_SIGNUP = `https://apilayer.com?fpr=${APILAYER_AFFILIATE_ID}`;
const BASE44_LINK = 'https://base44.pxf.io/c/2252709/2049275/25619?trafcat=base';
const HOSTINGER_LINK = 'https://tinyurl.com/25vpu3xd';

// ─── Hostinger product info (real data from hostinger.com/pricing) ───────────
const HOSTINGER_PLANS = [
  { name: 'Premium', price: '$2.99/mo', sites: '3 websites', storage: '20 GB SSD', backups: 'Weekly', extras: 'Free domain, 2 mailboxes, CDN, free SSL' },
  { name: 'Unlimited', price: '$3.79/mo', sites: 'Unlimited websites', storage: '50 GB NVMe', backups: 'Daily', extras: 'Free domain, unlimited mailboxes, CDN, AI email marketing' },
  { name: 'Cloud Startup', price: '$7.99/mo', sites: 'Unlimited websites', storage: '100 GB NVMe', backups: 'Daily + on-demand', extras: 'Dedicated IP, 4 CPU cores, 4 GB RAM' },
];

const HOSTINGER_USE_CASES = ['portfolio site', 'small business website', 'WordPress blog', 'ecommerce store', 'SaaS landing page', 'freelancer website'];
const HOSTINGER_COUPONS_PATHS = [
  path.join(__dirname, '..', 'hostingerbot', 'data', 'seen_codes.json'),
  path.join(__dirname, 'hostinger-coupons.json'),
];

function loadHostingerCoupons() {
  for (const fp of HOSTINGER_COUPONS_PATHS) {
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      const coupons = Object.entries(data)
        .map(([code, info]) => ({ code, ...info }))
        .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
      const recent = coupons.filter(c => {
        const age = Date.now() - new Date(c.last_seen).getTime();
        return age < 7 * 24 * 60 * 60 * 1000;
      });
      return recent.length > 0 ? recent : coupons.slice(0, 5);
    } catch { continue; }
  }
  return [];
}

function formatCouponSection(coupons, limit = 3) {
  if (coupons.length === 0) return '';
  const top = coupons.slice(0, limit);
  let section = '\n\n**Latest Hostinger coupon codes:**\n\n';
  section += '| Code | Deal |\n|------|------|\n';
  for (const c of top) {
    section += `| **${c.code}** | ${c.title} |\n`;
  }
  section += `\nApply at checkout: [Hostinger pricing](${HOSTINGER_LINK})`;
  return section;
}

// ─── Base44 product info (real data from base44.com) ─────────────────────────
const BASE44_FEATURES = [
  { name: 'App Builder', desc: 'Turn any idea into a fully functional app — with backend, auth, payments, and hosting built in. No code needed.' },
  { name: 'Website Builder', desc: 'AI-generated design, custom domain, built-in SEO tools — ready to go live from day one.' },
  { name: 'AI Agents (Superagents)', desc: 'Create a 24/7 agent that connects to your tools, takes real action, and works while you sleep.' },
  { name: 'Built-in Integrations', desc: 'Connects to Google Calendar, Gmail, Slack, Notion, HubSpot, Salesforce and more. API access for anything else.' },
  { name: 'SEO/GEO Dashboard', desc: 'Get found on Google, ChatGPT, Gemini. Run a scan, get a prioritized fix list, let AI apply the fixes.' },
  { name: 'App Analytics', desc: 'Track traffic, sales, customize your dashboard, and measure the actions that matter most.' },
  { name: 'Social Presence', desc: 'AI reads what you build, picks the right social platforms, and generates ready-to-post content in your voice.' },
  { name: 'Video Generation', desc: 'Describe a video, get one. Add it to any page — hero sections, onboarding screens, product previews.' },
];

// ─── APILayer product catalog ────────────────────────────────────────────────
const APILAYER_PRODUCTS = [
  { name: 'IPStack', slug: 'ipstack', category: 'Geolocation', url: 'https://ipstack.com', tagline: 'Locate and identify website visitors by IP address', desc: 'Real-time IP geolocation API with 100+ data fields including location, ISP, timezone, currency, and security threat detection.' },
  { name: 'Marketstack', slug: 'marketstack', category: 'Finance', url: 'https://marketstack.com', tagline: 'Real-time, intraday & historical stock market data', desc: 'Stock market data API covering 30,000+ tickers across 500,000+ stocks on global exchanges. Free tier: 100 requests/month.' },
  { name: 'Aviationstack', slug: 'aviationstack', category: 'Travel', url: 'https://aviationstack.com', tagline: 'Real-time flight status & global aviation data', desc: 'Track flights, airlines, airports, routes, schedules, and aviation activity worldwide.' },
  { name: 'Serpstack', slug: 'serpstack', category: 'SEO', url: 'https://serpstack.com', tagline: 'Real-time Google search results via API', desc: 'Scrape SERP data at scale. Get real-time Google search results including organic results, ads, and knowledge graph.' },
  { name: 'Mediastack', slug: 'mediastack', category: 'News', url: 'https://mediastack.com', tagline: 'Live news & blog articles REST API', desc: 'Free REST API for live news and blog articles from 7,500+ sources worldwide.' },
  { name: 'Positionstack', slug: 'positionstack', category: 'Geolocation', url: 'https://positionstack.com', tagline: 'Forward & reverse batch geocoding API', desc: 'Convert addresses to coordinates and coordinates to addresses. Batch processing support.' },
  { name: 'Scrapestack', slug: 'scrapestack', category: 'Scraping', url: 'https://scrapestack.com', tagline: 'Real-time proxy & web scraping API', desc: 'Scalable proxy and web scraping REST API. Handles proxies, browsers, and CAPTCHAs automatically.' },
  { name: 'Weatherstack', slug: 'weatherstack', category: 'Weather', url: 'https://weatherstack.com', tagline: 'Real-time & historical world weather data API', desc: 'Real-time, historical, and forecast weather data for any location worldwide.' },
  { name: 'Coinlayer', slug: 'coinlayer', category: 'Finance', url: 'https://coinlayer.com', tagline: 'Real-time cryptocurrency exchange rates', desc: 'Real-time and historical crypto exchange rates for 385+ coins.' },
  { name: 'Numverify', slug: 'numverify', category: 'Marketing', url: 'https://numverify.com', tagline: 'Global phone number validation & lookup', desc: 'Validate phone numbers in real-time for 232 countries. Returns carrier info, line type, and location.' },
  { name: 'Screenshotlayer', slug: 'screenshotlayer', category: 'DevTools', url: 'https://screenshotlayer.com', tagline: 'Capture website screenshots via API', desc: 'Automated website screenshot capture API. Render any URL as PNG or JPEG.' },
  { name: 'PDFlayer', slug: 'pdflayer', category: 'DevTools', url: 'https://pdflayer.com', tagline: 'HTML to PDF conversion API', desc: 'Convert any HTML or URL to a high-quality PDF document.' },
  { name: 'Userstack', slug: 'userstack', category: 'Marketing', url: 'https://userstack.com', tagline: 'User-Agent string lookup API', desc: 'Detect and parse user agents in real-time. Returns browser, OS, device type, and bot detection.' },
];

const POSTS_PER_RUN = 5;
const STATE_FILE = path.join(__dirname, '.reddit-poster-state.json');

// GitHub category file mapping
const CATEGORY_FILE = {
  AGENTS: 'agents', AI: 'ai', AUTOMATION: 'automation',
  DEVELOPER_TOOLS: 'developer-tools', ECOMMERCE: 'e-commerce',
  INTEGRATIONS: 'integrations', JOBS: 'jobs',
  LEAD_GENERATION: 'lead-generation', MCP_SERVERS: 'mcp-servers',
  NEWS: 'news', OPEN_SOURCE: 'open-source', REAL_ESTATE: 'real-estate',
  SEO_TOOLS: 'seo-tools', SOCIAL_MEDIA: 'social-media',
  TRAVEL: 'travel', VIDEOS: 'videos', OTHER: 'other'
};

// ─── Post templates (NO direct affiliate links in body) ───────────────────────

const POST_TYPES = {
  spotlight: {
    generate: (actor) => {
      const rating = actor.actorReviewRating ? `${actor.actorReviewRating.toFixed(1)}/5` : 'New';
      const users = formatUsers(actor.stats?.totalUsers || 0);
      const pricing = getPricingLabel(actor.currentPricingInfo);
      const cats = (actor.categories || []).map(c => c.replace(/_/g, ' ').toLowerCase()).join(', ');
      const actorPath = `${actor.username}/${actor.name}`;

      return {
        title: `${actor.title} — ${pricing} | ${users} users | ${rating} rating`,
        text: `**${actor.title}**\n\n` +
          `${actor.description || 'No description available.'}\n\n` +
          `---\n\n` +
          `| Detail | Info |\n|---|---|\n` +
          `| **Developer** | ${actor.userFullName || actor.username} |\n` +
          `| **Rating** | ${rating} (${actor.actorReviewCount || 0} reviews) |\n` +
          `| **Users** | ${users} |\n` +
          `| **Pricing** | ${pricing} |\n` +
          `| **Categories** | ${cats || 'General'} |\n` +
          `| **Actor** | ${actorPath} |\n\n` +
          `**[Try ${actor.title} on Apify](https://apify.com/${actorPath}?fpr=${AFFILIATE_ID})**\n\n` +
          `---\n\n` +
          `*Browse 26,000+ more APIs and scrapers in our [full directory on GitHub](${GITHUB_REPO}).*`,
        commentLink: `https://apify.com/${actorPath}?fpr=${AFFILIATE_ID}`
      };
    }
  },

  topList: {
    generate: (actors, category) => {
      const displayCat = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const list = actors.slice(0, 10);
      const catFile = CATEGORY_FILE[category];

      let body = `Here are the top ${list.length} most popular **${displayCat}** tools on Apify right now:\n\n`;
      body += `| # | Tool | Developer | Rating | Users | Pricing |\n|---|------|-----------|--------|-------|--------|\n`;

      list.forEach((a, i) => {
        const rating = a.actorReviewRating ? `${a.actorReviewRating.toFixed(1)}` : 'New';
        const users = formatUsers(a.stats?.totalUsers || 0);
        const pricing = getPricingLabel(a.currentPricingInfo);
        const title = (a.title || a.name).replace(/\|/g, '-');
        const dev = (a.userFullName || a.username).replace(/\|/g, '-');
        body += `| ${i + 1} | **${title}** | ${dev} | ${rating} | ${users} | ${pricing} |\n`;
      });

      body += `\n---\n\n`;
      body += `**[Browse all ${displayCat} tools on Apify](https://apify.com/store?category=${category}&fpr=${AFFILIATE_ID})**\n\n`;
      body += `*Want more? See all 26,000+ tools in our [full directory on GitHub](${GITHUB_REPO}/blob/master/categories/${catFile}.md).*`;

      return {
        title: `Top 10 ${displayCat} APIs & Scrapers — Most Popular Tools Right Now`,
        text: body,
        commentLink: `https://www.apify.com/?fpr=${AFFILIATE_ID}`
      };
    }
  },

  freeTools: {
    generate: (actors) => {
      const free = actors
        .filter(a => {
          const m = a.currentPricingInfo?.pricingModel;
          return m === 'FREE' || !m;
        })
        .sort((a, b) => (b.stats?.totalUsers || 0) - (a.stats?.totalUsers || 0))
        .slice(0, 10);

      let body = `No credit card needed. These are the most popular **completely free** tools on Apify:\n\n`;
      body += `| # | Tool | Developer | Rating | Users |\n|---|------|-----------|--------|------|\n`;

      free.forEach((a, i) => {
        const rating = a.actorReviewRating ? `${a.actorReviewRating.toFixed(1)}` : 'New';
        const users = formatUsers(a.stats?.totalUsers || 0);
        const title = (a.title || a.name).replace(/\|/g, '-');
        const dev = (a.userFullName || a.username).replace(/\|/g, '-');
        body += `| ${i + 1} | **${title}** | ${dev} | ${rating} | ${users} |\n`;
      });

      body += `\n**[Sign up for Apify](https://www.apify.com/?fpr=${AFFILIATE_ID})** — every new account gets $5/month in free credits.\n\n`;
      body += `---\n\n`;
      body += `*Full directory: [26,000+ tools on GitHub](${GITHUB_REPO})*`;

      return {
        title: `10 Completely Free Scraping & Automation Tools — No Credit Card Required`,
        text: body,
        commentLink: `https://www.apify.com/?fpr=${AFFILIATE_ID}`
      };
    }
  },

  comparison: {
    generate: (actors, keyword) => {
      const matches = actors
        .filter(a => (a.title || '').toLowerCase().includes(keyword.toLowerCase()))
        .sort((a, b) => (b.stats?.totalUsers || 0) - (a.stats?.totalUsers || 0))
        .slice(0, 8);

      if (matches.length < 3) return null;

      const displayKw = keyword.charAt(0).toUpperCase() + keyword.slice(1);

      let body = `Compared the top ${matches.length} **${displayKw}** tools on Apify. Here's how they stack up:\n\n`;
      body += `| Tool | Developer | Rating | Users | Pricing |\n|------|-----------|--------|-------|--------|\n`;

      matches.forEach(a => {
        const rating = a.actorReviewRating ? `${a.actorReviewRating.toFixed(1)} (${a.actorReviewCount || 0})` : 'New';
        const users = formatUsers(a.stats?.totalUsers || 0);
        const pricing = getPricingLabel(a.currentPricingInfo);
        const title = (a.title || a.name).replace(/\|/g, '-');
        const dev = (a.userFullName || a.username).replace(/\|/g, '-');
        body += `| **${title}** | ${dev} | ${rating} | ${users} | ${pricing} |\n`;
      });

      body += `\n**[Try these tools on Apify](https://www.apify.com/?fpr=${AFFILIATE_ID})** — $5 free credits for new accounts.\n\n`;
      body += `---\n\n`;
      body += `*Browse all tools in our [full directory of 26,000+ actors on GitHub](${GITHUB_REPO}).*`;

      return {
        title: `${displayKw} Tools Compared — Which One Should You Use?`,
        text: body,
        commentLink: `https://www.apify.com/?fpr=${AFFILIATE_ID}`
      };
    }
  }
};

// ─── APILayer Reddit post types ──────────────────────────────────────────────

const AL_POST_TYPES = {
  spotlight: {
    generate: (product) => {
      return {
        title: `${product.name} — ${product.tagline} (Free API)`,
        text: `**${product.name}**\n\n` +
          `${product.desc}\n\n` +
          `---\n\n` +
          `| Detail | Info |\n|---|---|\n` +
          `| **Category** | ${product.category} |\n` +
          `| **Type** | REST API |\n` +
          `| **Format** | JSON |\n` +
          `| **Free Tier** | Yes |\n` +
          `| **Platform** | APILayer (40+ APIs, one key) |\n\n` +
          `**[Try ${product.name} free](${product.url}?fpr=${APILAYER_AFFILIATE_ID})**\n\n` +
          `---\n\n` +
          `*Part of [APILayer](${APILAYER_SIGNUP}) — 40+ production-ready APIs under one account.*`,
        commentLink: `${product.url}?fpr=${APILAYER_AFFILIATE_ID}`
      };
    }
  },

  roundup: {
    generate: (products) => {
      let body = `Here are some of the best **free APIs** available on APILayer right now:\n\n`;
      body += `| # | API | Category | What It Does |\n|---|-----|----------|-------------|\n`;

      products.forEach((p, i) => {
        body += `| ${i + 1} | [**${p.name}**](${p.url}?fpr=${APILAYER_AFFILIATE_ID}) | ${p.category} | ${p.tagline} |\n`;
      });

      body += `\n**[Sign up for APILayer free](${APILAYER_SIGNUP})** — one account, one API key, 40+ APIs. No credit card needed.`;

      return {
        title: `${products.length} Free APIs Every Developer Should Know About`,
        text: body,
        commentLink: APILAYER_SIGNUP
      };
    }
  },

  useCase: {
    generate: (product) => {
      const useCases = {
        'IPStack': ['Geo-targeted content delivery', 'Fraud prevention by IP', 'Compliance & data localization', 'Analytics & user segmentation'],
        'Marketstack': ['Portfolio tracking apps', 'Trading bots & alerts', 'Financial dashboards', 'Market research tools'],
        'Aviationstack': ['Flight tracking apps', 'Travel booking platforms', 'Airport operations dashboards', 'Logistics & shipping tools'],
        'Serpstack': ['SEO rank tracking', 'Competitor monitoring', 'Keyword research tools', 'SERP feature analysis'],
        'Mediastack': ['News aggregator apps', 'Media monitoring dashboards', 'Content curation tools', 'Brand mention tracking'],
        'Weatherstack': ['Weather widgets', 'Agriculture & farming apps', 'Event planning tools', 'Travel & outdoor apps'],
        'Coinlayer': ['Crypto portfolio trackers', 'Exchange rate widgets', 'Trading signal bots', 'DeFi dashboards'],
        'Numverify': ['Phone verification flows', 'CRM data cleaning', 'Lead validation', 'Fraud detection'],
        'Scrapestack': ['Price monitoring', 'Content aggregation', 'Lead generation', 'Market research'],
      };

      const cases = useCases[product.name];
      if (!cases) return null;

      let body = `**${product.name}** — ${product.tagline}\n\n`;
      body += `${product.desc}\n\n`;
      body += `## What can you build with it?\n\n`;
      cases.forEach(c => { body += `- ${c}\n`; });
      body += `\nFree tier available — no credit card required to start.\n\n`;
      body += `---\n\n`;
      body += `**[Try ${product.name} free](${product.url}?fpr=${APILAYER_AFFILIATE_ID})**\n\n`;
      body += `*${product.name} is part of [APILayer](${APILAYER_SIGNUP}) — 40+ APIs, one account, one key.*`;

      return {
        title: `What You Can Build with ${product.name} API — ${product.category} Data Made Easy`,
        text: body,
        commentLink: `${product.url}?fpr=${APILAYER_AFFILIATE_ID}`
      };
    }
  }
};

// ─── Base44 Reddit post types ────────────────────────────────────────────────

const B44_POST_TYPES = {
  spotlight: {
    generate: () => {
      let body = `**Base44** is a vibe coding platform that lets you build apps, websites, and AI agents — just by describing what you want in plain language.\n\n`;
      body += `## What You Get\n\n`;
      body += `| Feature | Details |\n|---|---|\n`;
      body += `| **App Builder** | Full-stack apps with backend, auth, payments, hosting |\n`;
      body += `| **Website Builder** | AI-generated design, custom domain, SEO tools |\n`;
      body += `| **AI Agents** | 24/7 agents that connect to your tools and take action |\n`;
      body += `| **Integrations** | Slack, Gmail, Notion, HubSpot, Salesforce, API access |\n`;
      body += `| **Analytics** | Traffic, sales, custom dashboards |\n`;
      body += `| **Pricing** | Free to start, paid from $16/mo |\n\n`;
      body += `No coding experience needed. Describe your idea, Base44 generates the code, design, and logic.\n\n`;
      body += `**[Try Base44 free](${BASE44_LINK})**`;

      return {
        title: `Base44 — Build Apps, Websites & AI Agents with Vibe Coding (No Code Needed)`,
        text: body,
        commentLink: BASE44_LINK
      };
    }
  },

  useCase: {
    generate: (useCase) => {
      const useCases = {
        'internal tools': {
          title: 'Build Internal Tools in Minutes — No Developers Needed',
          intro: 'Need a dashboard, CRM, or admin panel for your team? Stop waiting on engineering.',
          details: 'Base44 lets you describe what you need in plain language and generates a working app — with database, auth, and hosting built in. Connect to Slack, Google Calendar, HubSpot, or any API.',
        },
        'landing pages': {
          title: 'Build a Landing Page with AI in Under 5 Minutes',
          intro: 'Need a landing page fast? Forget Figma, forget templates.',
          details: 'Describe your product or service, and Base44 generates a complete landing page — design, copy, SEO, and custom domain. One click to publish.',
        },
        'ai agents': {
          title: 'Create AI Agents That Actually Do Things — No Code Required',
          intro: 'AI agents that connect to your real tools and take real action.',
          details: 'Base44 Superagents connect to your inbox, calendar, CRM, and other tools. They automate workflows, manage data, and keep running 24/7 while you sleep.',
        },
        'client portals': {
          title: 'Build a Client Portal Without Writing Code',
          intro: 'Give your clients a dedicated space to track progress, access data, and communicate.',
          details: 'Base44 handles the backend, authentication, and hosting. Just describe what your clients need to see and do — the AI builds it.',
        },
        'ecommerce': {
          title: 'Launch an Online Store with AI — No Shopify Needed',
          intro: 'Sell products or services with a fully functional storefront built by AI.',
          details: 'Base44 generates product pages, checkout flow, and payment processing. Built-in analytics track sales and traffic. Custom domain included.',
        },
      };

      const config = useCases[useCase];
      if (!config) return null;

      let body = `${config.intro}\n\n`;
      body += `${config.details}\n\n`;
      body += `## Why Base44?\n\n`;
      body += `- **No code** — describe what you want in plain language\n`;
      body += `- **Full stack** — backend, database, auth, hosting included\n`;
      body += `- **Free to start** — no credit card needed\n`;
      body += `- **Ship fast** — go from idea to live app in minutes\n\n`;
      body += `**[Try Base44 free](${BASE44_LINK})**`;

      return {
        title: config.title,
        text: body,
        commentLink: BASE44_LINK
      };
    }
  },

  comparison: {
    generate: () => {
      let body = `How does Base44 compare to other no-code/AI app builders?\n\n`;
      body += `| Feature | Base44 | Traditional No-Code | Custom Dev |\n`;
      body += `|---------|--------|-------------------|------------|\n`;
      body += `| Setup time | Minutes | Hours | Weeks |\n`;
      body += `| Coding needed | No | Some | Yes |\n`;
      body += `| Backend included | Yes | Sometimes | Build it |\n`;
      body += `| Auth & payments | Built-in | Plugins | Build it |\n`;
      body += `| AI generation | Yes | No | No |\n`;
      body += `| Hosting | Built-in | Separate | Separate |\n`;
      body += `| Free tier | Yes | Varies | No |\n`;
      body += `| Starting price | $0 | $20-50/mo | $5K+ |\n\n`;
      body += `Base44 uses vibe coding — describe what you want, AI builds it. Full-stack apps with backend, database, auth, and hosting. No setup.\n\n`;
      body += `**[Try Base44 free](${BASE44_LINK})**`;

      return {
        title: `No-Code App Builders Compared — Where Does AI Vibe Coding Fit?`,
        text: body,
        commentLink: BASE44_LINK
      };
    }
  }
};

const BASE44_USE_CASES = ['internal tools', 'landing pages', 'ai agents', 'client portals', 'ecommerce'];

const COMPARISON_KEYWORDS = [
  'instagram', 'tiktok', 'linkedin', 'youtube', 'twitter', 'facebook',
  'google maps', 'amazon', 'indeed', 'reddit', 'zillow', 'booking',
  'airbnb', 'yelp', 'tripadvisor', 'glassdoor', 'ebay', 'shopify',
  'telegram', 'threads', 'pinterest', 'walmart', 'craigslist'
];

const CATEGORIES_FOR_LISTS = [
  'LEAD_GENERATION', 'SOCIAL_MEDIA', 'ECOMMERCE', 'AI', 'SEO_TOOLS',
  'AUTOMATION', 'DEVELOPER_TOOLS', 'JOBS', 'REAL_ESTATE', 'MCP_SERVERS',
  'TRAVEL', 'VIDEOS', 'NEWS', 'AGENTS', 'INTEGRATIONS'
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsers(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return String(count);
}

function getPricingLabel(info) {
  if (!info) return 'Free';
  const m = info.pricingModel;
  if (m === 'FREE') return 'Free';
  if (m === 'PAY_PER_RESULT') return info.pricePerUnitUsd ? `$${info.pricePerUnitUsd}/result` : 'Pay per result';
  if (m === 'PAY_PER_EVENT') return info.pricePerUnitUsd ? `$${info.pricePerUnitUsd}/event` : 'Pay per event';
  if (m === 'FLAT_PRICE_PER_MONTH') return info.pricePerUnitUsd ? `$${info.pricePerUnitUsd}/mo` : 'Subscription';
  if (m === 'PRICE_PER_DATASET_ITEM') return info.pricePerUnitUsd ? `$${info.pricePerUnitUsd}/item` : 'Pay per item';
  return m ? m.replace(/_/g, ' ').toLowerCase() : 'Free';
}

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Reddit Auth ──────────────────────────────────────────────────────────────

async function getRedditToken() {
  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const postData = querystring.stringify({
    grant_type: 'password',
    username: REDDIT_USERNAME,
    password: REDDIT_PASSWORD,
  });

  const res = await httpRequest({
    hostname: 'www.reddit.com',
    path: '/api/v1/access_token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'APIFinderBot/1.0 by Basic-Strain-6922',
      'Content-Length': Buffer.byteLength(postData),
    }
  }, postData);

  if (res.data.access_token) {
    console.log('Reddit auth successful');
    return res.data.access_token;
  }
  throw new Error(`Reddit auth failed: ${JSON.stringify(res.data)}`);
}

// ─── Reddit Post & Comment ────────────────────────────────────────────────────

async function submitPost(token, title, text) {
  const postData = querystring.stringify({
    kind: 'self',
    sr: SUBREDDIT,
    title: title.substring(0, 300),
    text: text,
  });

  const res = await httpRequest({
    hostname: 'oauth.reddit.com',
    path: '/api/submit',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'APIFinderBot/1.0 by Basic-Strain-6922',
      'Content-Length': Buffer.byteLength(postData),
    }
  }, postData);

  // Extract post URL and thing ID
  const raw = JSON.stringify(res.data);
  const urlMatch = raw.match(/https:\/\/www\.reddit\.com\/r\/[^\s"]+/);
  const postUrl = urlMatch ? urlMatch[0] : null;

  // Extract thing name (t3_xxxx) for commenting
  let thingName = null;
  if (res.data?.jquery) {
    for (const entry of res.data.jquery) {
      if (Array.isArray(entry) && entry[3] && Array.isArray(entry[3])) {
        const val = entry[3][0];
        if (typeof val === 'string' && val.includes('/r/API_Finder/comments/')) {
          const idMatch = val.match(/comments\/([a-z0-9]+)\//);
          if (idMatch) thingName = `t3_${idMatch[1]}`;
        }
      }
    }
  }

  return { url: postUrl, thingName, success: !!postUrl };
}

async function addComment(token, thingName, commentText) {
  const postData = querystring.stringify({
    thing_id: thingName,
    text: commentText,
  });

  const res = await httpRequest({
    hostname: 'oauth.reddit.com',
    path: '/api/comment',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'APIFinderBot/1.0 by Basic-Strain-6922',
      'Content-Length': Buffer.byteLength(postData),
    }
  }, postData);

  return res.status === 200;
}

// ─── Fetch actors from API ────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'APIFinderBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchTopActors(category, limit = 20) {
  const url = `https://api.apify.com/v2/store?limit=${limit}&category=${category}`;
  const res = await fetchJSON(url);
  return res.data?.items || [];
}

async function fetchAllTopActors(limit = 200) {
  const url = `https://api.apify.com/v2/store?limit=${limit}`;
  const res = await fetchJSON(url);
  return res.data?.items || [];
}

// ─── State management ─────────────────────────────────────────────────────────

// Platform rotation: Apify, APILayer, Base44, APILayer, Base44 (1:2:2)
const PLATFORM_ROTATION = ['base44', 'hostinger', 'base44', 'hostinger', 'apify', 'base44', 'hostinger', 'base44', 'hostinger', 'base44'];

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {
      postedActors: [],
      postedCategories: [],
      postedKeywords: [],
      typeQueue: [],
      postCount: 0,
      lastRun: null,
      alPostedProducts: [],
      alTypeQueue: [],
      b44TypeQueue: [],
      b44PostedUseCases: [],
      hostTypeQueue: [],
      hostPostedUseCases: [],
    };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Post selection ───────────────────────────────────────────────────────────

function pickPostType(state) {
  const types = ['spotlight', 'topList', 'comparison', 'freeTools'];
  if (!state.typeQueue || state.typeQueue.length === 0) {
    state.typeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  return state.typeQueue.shift();
}

function pickALPostType(state) {
  const types = ['spotlight', 'roundup', 'useCase'];
  if (!state.alTypeQueue || state.alTypeQueue.length === 0) {
    state.alTypeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  return state.alTypeQueue.shift();
}

async function generateApifyPost(state) {
  const type = pickPostType(state);
  console.log(`Generating Apify ${type} post...`);

  if (type === 'spotlight') {
    const allActors = await fetchAllTopActors(200);
    const unposted = allActors.filter(a => !state.postedActors.includes(`${a.username}/${a.name}`));
    if (unposted.length === 0) { state.postedActors = []; return generateApifyPost(state); }
    const actor = unposted[Math.floor(Math.random() * Math.min(50, unposted.length))];
    const post = POST_TYPES.spotlight.generate(actor);
    state.postedActors.push(`${actor.username}/${actor.name}`);
    return { ...post, type: 'spotlight', platform: 'apify' };
  }

  if (type === 'topList') {
    const unpostedCats = CATEGORIES_FOR_LISTS.filter(c => !state.postedCategories.includes(c));
    if (unpostedCats.length === 0) { state.postedCategories = []; return generateApifyPost(state); }
    const cat = unpostedCats[Math.floor(Math.random() * unpostedCats.length)];
    const actors = await fetchTopActors(cat, 20);
    const post = POST_TYPES.topList.generate(actors, cat);
    state.postedCategories.push(cat);
    return { ...post, type: 'topList', platform: 'apify' };
  }

  if (type === 'comparison') {
    const unpostedKw = COMPARISON_KEYWORDS.filter(k => !state.postedKeywords.includes(k));
    if (unpostedKw.length === 0) { state.postedKeywords = []; return generateApifyPost(state); }
    const kw = unpostedKw[Math.floor(Math.random() * unpostedKw.length)];
    const allActors = await fetchAllTopActors(200);
    const post = POST_TYPES.comparison.generate(allActors, kw);
    if (!post) {
      state.postedKeywords.push(kw);
      return generateApifyPost(state);
    }
    state.postedKeywords.push(kw);
    return { ...post, type: 'comparison', platform: 'apify' };
  }

  if (type === 'freeTools') {
    const allActors = await fetchAllTopActors(200);
    const post = POST_TYPES.freeTools.generate(allActors);
    return { ...post, type: 'freeTools', platform: 'apify' };
  }
}

function generateAPILayerPost(state) {
  const type = pickALPostType(state);
  console.log(`Generating APILayer ${type} post...`);

  if (type === 'spotlight') {
    if (!state.alPostedProducts) state.alPostedProducts = [];
    const unposted = APILAYER_PRODUCTS.filter(p => !state.alPostedProducts.includes(p.slug));
    if (unposted.length === 0) { state.alPostedProducts = []; return generateAPILayerPost(state); }
    const product = unposted[Math.floor(Math.random() * unposted.length)];
    const post = AL_POST_TYPES.spotlight.generate(product);
    state.alPostedProducts.push(product.slug);
    return { ...post, type: 'spotlight', platform: 'apilayer' };
  }

  if (type === 'roundup') {
    const shuffled = APILAYER_PRODUCTS.slice().sort(() => Math.random() - 0.5).slice(0, 8);
    const post = AL_POST_TYPES.roundup.generate(shuffled);
    return { ...post, type: 'roundup', platform: 'apilayer' };
  }

  if (type === 'useCase') {
    if (!state.alPostedProducts) state.alPostedProducts = [];
    const candidates = APILAYER_PRODUCTS.filter(p => ['IPStack', 'Marketstack', 'Aviationstack', 'Serpstack', 'Mediastack', 'Weatherstack', 'Coinlayer', 'Numverify', 'Scrapestack'].includes(p.name));
    const unposted = candidates.filter(p => !state.alPostedProducts.includes('uc-' + p.slug));
    if (unposted.length === 0) {
      state.alPostedProducts = state.alPostedProducts.filter(s => !s.startsWith('uc-'));
      return generateAPILayerPost(state);
    }
    const product = unposted[Math.floor(Math.random() * unposted.length)];
    const post = AL_POST_TYPES.useCase.generate(product);
    if (!post) { state.alPostedProducts.push('uc-' + product.slug); return generateAPILayerPost(state); }
    state.alPostedProducts.push('uc-' + product.slug);
    return { ...post, type: 'useCase', platform: 'apilayer' };
  }
}

function pickB44PostType(state) {
  const types = ['spotlight', 'useCase', 'comparison'];
  if (!state.b44TypeQueue || state.b44TypeQueue.length === 0) {
    state.b44TypeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  return state.b44TypeQueue.shift();
}

function generateBase44Post(state) {
  const type = pickB44PostType(state);
  console.log(`Generating Base44 ${type} post...`);

  if (type === 'spotlight') {
    const feature = BASE44_FEATURES[Math.floor(Math.random() * BASE44_FEATURES.length)];
    return {
      title: `Build ${feature.name} Without Code — Base44 Makes It Ridiculously Easy`,
      text: `If you've ever wanted to build apps but don't want to deal with coding, Base44 is worth checking out.\n\n**${feature.name}**: ${feature.desc}\n\nIt's a no-code/vibe-coding platform that lets you build full apps, websites, and even AI agents just by describing what you want.\n\n**Key highlights:**\n- AI-powered app generation from natural language\n- Built-in database, auth, and hosting\n- Deploy instantly with one click\n- No technical skills required\n\n[Try Base44 free](${BASE44_LINK})`,
      commentLink: BASE44_LINK,
      flair: 'Tool',
      type: 'spotlight',
      platform: 'base44'
    };
  }

  if (type === 'useCase') {
    if (!state.b44PostedUseCases) state.b44PostedUseCases = [];
    const unposted = BASE44_USE_CASES.filter(u => !state.b44PostedUseCases.includes(u));
    const useCases = unposted.length > 0 ? unposted : BASE44_USE_CASES;
    if (unposted.length === 0) state.b44PostedUseCases = [];
    const uc = useCases[Math.floor(Math.random() * useCases.length)];
    state.b44PostedUseCases.push(uc);
    return {
      title: `How to Build ${uc.charAt(0).toUpperCase() + uc.slice(1)} Without Writing Code`,
      text: `Building ${uc} used to require a dev team or expensive contractors. Not anymore.\n\n**Base44** lets you describe what you want in plain English and generates a full working app — database, UI, auth, and deployment included.\n\nPerfect for:\n- Non-technical founders who need ${uc}\n- Freelancers building ${uc} for clients\n- Teams prototyping ${uc} fast\n\nNo coding experience needed. Describe your app, customize it, and deploy — all in minutes.\n\n[Build your ${uc} app free](${BASE44_LINK})`,
      commentLink: BASE44_LINK,
      flair: 'Resource',
      type: 'useCase',
      platform: 'base44'
    };
  }

  if (type === 'comparison') {
    return {
      title: 'No-Code App Builders in 2024: Why Base44 Stands Out for AI-Powered Development',
      text: `Most no-code tools still make you drag-and-drop components manually. Base44 takes a different approach — you describe your app in plain English and AI builds it for you.\n\n**What makes Base44 different:**\n\n| Feature | Traditional No-Code | Base44 |\n|---------|-------------------|--------|\n| App creation | Drag & drop | Describe in English |\n| Database | Manual setup | Auto-generated |\n| Auth | Plugin required | Built-in |\n| AI agents | Not available | Native support |\n| Deployment | Separate step | One-click |\n\nIt handles the full stack — frontend, backend, database, auth, and hosting — from a single text description.\n\n[Try Base44 free](${BASE44_LINK})`,
      commentLink: BASE44_LINK,
      flair: 'Resource',
      type: 'comparison',
      platform: 'base44'
    };
  }
}

function pickHostPostType(state) {
  const types = ['planCompare', 'useCase', 'whySwitch'];
  if (!state.hostTypeQueue || state.hostTypeQueue.length === 0) {
    state.hostTypeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  return state.hostTypeQueue.shift();
}

function generateHostingerPost(state) {
  const type = pickHostPostType(state);
  console.log(`Generating Hostinger ${type} post...`);
  const coupons = loadHostingerCoupons();
  const couponSection = formatCouponSection(coupons);
  console.log(`Loaded ${coupons.length} coupons`);

  if (type === 'planCompare') {
    return {
      title: 'Hostinger Plans Compared — Which One Do You Actually Need?',
      text: `Hostinger has 3 main plans and they're all cheap, but here's which one actually makes sense for different use cases.\n\n| Plan | Price | Websites | Storage | Best For |\n|------|-------|----------|---------|----------|\n| Premium | $2.99/mo | 3 | 20 GB SSD | Personal sites, blogs |\n| Unlimited | $3.79/mo | Unlimited | 50 GB NVMe | Freelancers, growing brands |\n| Cloud Startup | $7.99/mo | Unlimited | 100 GB NVMe | Agencies, high-traffic sites |\n\nAll plans include free domain (1 year), free SSL, CDN, WordPress one-click install, and 24/7 support.\n\nThe **Unlimited** plan at $3.79/mo is the sweet spot for most people — unlimited sites, daily backups, and unlimited mailboxes.${couponSection}\n\n[Check Hostinger pricing](${HOSTINGER_LINK})`,
      commentLink: HOSTINGER_LINK,
      flair: 'Resource',
      type: 'planCompare',
      platform: 'hostinger'
    };
  }

  if (type === 'useCase') {
    if (!state.hostPostedUseCases) state.hostPostedUseCases = [];
    const unposted = HOSTINGER_USE_CASES.filter(u => !state.hostPostedUseCases.includes(u));
    const useCases = unposted.length > 0 ? unposted : HOSTINGER_USE_CASES;
    if (unposted.length === 0) state.hostPostedUseCases = [];
    const uc = useCases[Math.floor(Math.random() * useCases.length)];
    state.hostPostedUseCases.push(uc);
    const ucTitle = uc.charAt(0).toUpperCase() + uc.slice(1);
    return {
      title: `How to Launch ${/^[aeiou]/i.test(ucTitle) ? 'an' : 'a'} ${ucTitle} for Under $3/Month with Hostinger`,
      text: `If you need a ${uc}, you don't need to spend $20+/month on hosting. Hostinger's Premium plan starts at $2.99/mo and includes everything you need.\n\n**What you get:**\n- Free domain for 1 year\n- Free SSL certificate\n- WordPress one-click install\n- Built-in CDN for speed\n- Drag-and-drop website builder\n- Vibe coding — describe what you want, AI builds it\n- 24/7 priority support\n\n**Why it works for a ${uc}:**\n- NVMe storage keeps your site fast\n- 99.9% uptime guarantee\n- Free email (hello@yourdomain.com)\n- Built-in ecommerce if you need it${couponSection}\n\n30-day money-back guarantee, so no risk to try it.\n\n[Get started with Hostinger](${HOSTINGER_LINK})`,
      commentLink: HOSTINGER_LINK,
      flair: 'Resource',
      type: 'useCase',
      platform: 'hostinger'
    };
  }

  if (type === 'whySwitch') {
    return {
      title: 'Why I Switched to Hostinger — Honest Take After Using It for Months',
      text: `I've used a few hosting providers and Hostinger has the best value for the price. Here's what stood out:\n\n**Pros:**\n- $2.99/mo for the Premium plan (3 sites, 20 GB, free domain)\n- NVMe storage on higher plans — noticeably faster than regular SSD\n- Free SSL on all plans, no extra config\n- WordPress install takes 60 seconds\n- Vibe coding feature — describe your site in plain English and AI builds it\n- 24/7 support actually responds fast\n\n**What's included free:**\n- Domain (1 year)\n- SSL certificate\n- CDN\n- Website builder\n- Email accounts\n- Weekly/daily backups depending on plan\n\n**Who it's best for:**\n- Beginners launching their first site\n- Freelancers managing multiple client sites\n- Small businesses that don't want to overpay${couponSection}\n\n30-day money-back guarantee on all plans.\n\n[Check Hostinger plans](${HOSTINGER_LINK})`,
      commentLink: HOSTINGER_LINK,
      flair: 'Resource',
      type: 'whySwitch',
      platform: 'hostinger'
    };
  }
}

async function generatePost(state, index) {
  const totalIndex = (state.postCount || 0) + (index || 0);
  const platform = PLATFORM_ROTATION[totalIndex % PLATFORM_ROTATION.length];
  console.log(`Platform: ${platform}`);
  if (platform === 'hostinger') return generateHostingerPost(state);
  if (platform === 'base44') return generateBase44Post(state);
  if (platform === 'apilayer') return generateAPILayerPost(state);
  return generateApifyPost(state);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || POSTS_PER_RUN;

  console.log(`\n=== API Finder Reddit Poster ===`);
  console.log(`Subreddit: r/${SUBREDDIT}`);
  console.log(`Posts to create: ${count}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const state = loadState();
  let token = null;

  if (!dryRun) {
    token = await getRedditToken();
  }

  for (let i = 0; i < count; i++) {
    console.log(`\n--- Post ${i + 1}/${count} ---`);

    const post = await generatePost(state, i);
    console.log(`Type: ${post.type} (${post.platform})`);
    console.log(`Title: ${post.title}`);

    if (dryRun) {
      console.log(`\n--- Preview ---\n${post.text.substring(0, 400)}...\n--- End Preview ---`);
      console.log(`Comment link: ${post.commentLink}`);
    } else {
      const result = await submitPost(token, post.title, post.text);
      console.log(`Post URL: ${result.url}`);

      // Add comment with affiliate link after a short delay
      if (result.thingName && post.commentLink) {
        await sleep(3000);
        let commentText;
        if (post.platform === 'apilayer') {
          commentText = `**Direct link:** ${post.commentLink}\n\n` +
            `*[APILayer](${APILAYER_SIGNUP}) — 40+ production-ready APIs, one account, one key. Free to start.*`;
        } else if (post.platform === 'hostinger') {
          commentText = `**Get started:** ${HOSTINGER_LINK}\n\n` +
            `*Hostinger — Fast hosting from $2.99/mo. Free domain, SSL, and 24/7 support.*`;
        } else if (post.platform === 'base44') {
          commentText = `**Try it free:** ${BASE44_LINK}\n\n` +
            `*Base44 — Build full apps by describing what you want. No coding needed.*`;
        } else {
          commentText = `**Direct link:** ${post.commentLink}\n\n` +
            `*New to Apify? Every account gets $5/month in free credits. ` +
            `[Full directory of 26,000+ tools](${GITHUB_REPO})*`;
        }
        const commented = await addComment(token, result.thingName, commentText);
        console.log(`Comment added: ${commented}`);
      }

      state.postCount++;
      state.lastRun = new Date().toISOString();
      saveState(state);

      if (i < count - 1) {
        console.log('Waiting 60s between posts...');
        await sleep(60000);
      }
    }
  }

  saveState(state);
  console.log(`\nDone! Total posts ever: ${state.postCount}`);
}

main().catch(console.error);
