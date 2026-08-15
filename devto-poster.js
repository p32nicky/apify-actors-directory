const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const DEVTO_API_KEY = process.env.DEVTO_API_KEY || '';
const AFFILIATE_ID = process.env.APIFY_AFFILIATE_ID || '97nrp4';
const APILAYER_AFFILIATE_ID = process.env.APILAYER_AFFILIATE_ID || 'nick77';
const GITHUB_REPO = 'https://github.com/p32nicky/apify-actors-directory';
const APIFY_SIGNUP = `https://www.apify.com/?fpr=${AFFILIATE_ID}`;
const APILAYER_SIGNUP = `https://apilayer.com?fpr=${APILAYER_AFFILIATE_ID}`;
const BASE44_LINK = 'https://base44.pxf.io/c/2252709/2049275/25619?trafcat=base';
const HOSTINGER_LINK = 'https://tinyurl.com/25vpu3xd';

const PLATFORM_ROTATION = ['base44', 'hostinger', 'base44', 'hostinger', 'apify', 'base44', 'hostinger', 'base44', 'hostinger', 'base44'];

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
  let section = '\n\n## Latest Hostinger Coupon Codes\n\n';
  section += '| Code | Deal |\n|------|------|\n';
  for (const c of top) {
    section += `| **${c.code}** | ${c.title} |\n`;
  }
  section += `\nApply at checkout: **[Hostinger pricing](${HOSTINGER_LINK})**`;
  return section;
}

const BASE44_FEATURES = [
  { name: 'AI App Generation', desc: 'Describe your app in plain English and Base44 builds it — frontend, backend, database, and deployment.' },
  { name: 'Built-in Database', desc: 'Every app gets a database automatically. No setup, no schemas to write — just describe your data.' },
  { name: 'Authentication', desc: 'User login and signup built in from the start. Google, email/password, and magic links out of the box.' },
  { name: 'One-Click Deploy', desc: 'Your app goes live instantly. No servers to configure, no CI/CD pipelines to set up.' },
  { name: 'AI Agents', desc: 'Build AI-powered agents that can automate workflows, answer questions, and interact with your app data.' },
  { name: 'Custom Domains', desc: 'Connect your own domain to any Base44 app. SSL certificates handled automatically.' },
  { name: 'API Integration', desc: 'Connect to external APIs and services. Base44 handles the plumbing so you can focus on logic.' },
  { name: 'Real-time Collaboration', desc: 'Multiple team members can work on the same app simultaneously with live updates.' },
];

const BASE44_USE_CASES = ['internal tools', 'landing pages', 'ai agents', 'client portals', 'ecommerce'];

// ─── APILayer product catalog ────────────────────────────────────────────────
const APILAYER_PRODUCTS = [
  { name: 'IPStack', slug: 'ipstack', category: 'Geolocation', url: 'https://ipstack.com', tagline: 'Locate and identify website visitors by IP address', desc: 'Real-time IP geolocation API with 100+ data fields including location, ISP, timezone, currency, and security threat detection. Serves 2M+ distinct locations worldwide. Used for geo-targeted marketing, fraud prevention, and compliance.' },
  { name: 'Marketstack', slug: 'marketstack', category: 'Finance', url: 'https://marketstack.com', tagline: 'Real-time, intraday & historical stock market data', desc: 'Stock market data API covering 30,000+ tickers across 500,000+ stocks on global exchanges. 15+ years of historical data, 750+ market indices, SEC filings. Free tier: 100 requests/month.' },
  { name: 'Aviationstack', slug: 'aviationstack', category: 'Travel', url: 'https://aviationstack.com', tagline: 'Real-time flight status & global aviation data', desc: 'Track flights, airlines, airports, routes, schedules, and aviation activity worldwide. Built for travel platforms, flight tracking apps, and logistics operations.' },
  { name: 'Serpstack', slug: 'serpstack', category: 'SEO', url: 'https://serpstack.com', tagline: 'Real-time Google search results via API', desc: 'Scrape SERP data at scale. Get real-time Google search results including organic results, ads, knowledge graph, featured snippets, and more via a simple REST API.' },
  { name: 'Mediastack', slug: 'mediastack', category: 'News', url: 'https://mediastack.com', tagline: 'Live news & blog articles REST API', desc: 'Free REST API for live news and blog articles from 7,500+ sources worldwide. Filter by keyword, category, language, country, and date.' },
  { name: 'Positionstack', slug: 'positionstack', category: 'Geolocation', url: 'https://positionstack.com', tagline: 'Forward & reverse batch geocoding API', desc: 'Accurate forward and reverse geocoding. Convert addresses to coordinates and coordinates to addresses. Batch processing support for high-volume lookups.' },
  { name: 'Scrapestack', slug: 'scrapestack', category: 'Scraping', url: 'https://scrapestack.com', tagline: 'Real-time proxy & web scraping API', desc: 'Scalable proxy and web scraping REST API. Handles proxies, browsers, and CAPTCHAs automatically. Just send a URL, get back the HTML.' },
  { name: 'Weatherstack', slug: 'weatherstack', category: 'Weather', url: 'https://weatherstack.com', tagline: 'Real-time & historical world weather data API', desc: 'Real-time, historical, and forecast weather data for any location. Covers temperature, wind, humidity, pressure, UV index, and more.' },
  { name: 'Coinlayer', slug: 'coinlayer', category: 'Finance', url: 'https://coinlayer.com', tagline: 'Real-time cryptocurrency exchange rates', desc: 'Real-time and historical crypto exchange rates for 385+ coins. Bitcoin, Ethereum, and altcoin data with minute-level granularity.' },
  { name: 'Numverify', slug: 'numverify', category: 'Marketing', url: 'https://numverify.com', tagline: 'Global phone number validation & lookup', desc: 'Validate phone numbers in real-time for 232 countries. Returns carrier info, line type (mobile/landline), and location data.' },
  { name: 'Screenshotlayer', slug: 'screenshotlayer', category: 'DevTools', url: 'https://screenshotlayer.com', tagline: 'Capture website screenshots via API', desc: 'Automated website screenshot capture API. Render any URL as PNG or JPEG. Supports custom viewports, full-page capture, and thumbnail generation.' },
  { name: 'PDFlayer', slug: 'pdflayer', category: 'DevTools', url: 'https://pdflayer.com', tagline: 'HTML to PDF conversion API', desc: 'Convert any HTML or URL to a high-quality PDF document. Supports custom headers, footers, page sizes, watermarks, and encryption.' },
  { name: 'Userstack', slug: 'userstack', category: 'Marketing', url: 'https://userstack.com', tagline: 'User-Agent string lookup API', desc: 'Detect and parse user agents in real-time. Returns browser, OS, device type, and bot detection data for any User-Agent string.' },
];

const POSTS_PER_RUN = 2;
const DELAY_BETWEEN_POSTS = 310000; // 5+ min to respect rate limit
const STATE_FILE = path.join(__dirname, '.devto-poster-state.json');
const POSTS_DIR = path.join(__dirname, '_posts');

// ─── Article templates ────────────────────────────────────────────────────────

const ARTICLE_TYPES = {
  spotlight: {
    generate: (actor) => {
      const url = `https://apify.com/${actor.username}/${actor.name}?fpr=${AFFILIATE_ID}`;
      const rating = actor.actorReviewRating ? `${actor.actorReviewRating.toFixed(1)}/5` : 'New';
      const users = formatUsers(actor.stats?.totalUsers || 0);
      const pricing = getPricingLabel(actor.currentPricingInfo);
      const cats = (actor.categories || []).map(c => c.replace(/_/g, ' ').toLowerCase()).join(', ');

      const body = `
Are you spending hours writing custom scrapers? There's probably an actor for that already.

## What is ${actor.title}?

${actor.description || 'A powerful automation tool on the Apify platform.'}

## Quick Stats

| Detail | Info |
|---|---|
| **Developer** | ${actor.userFullName || actor.username} |
| **Rating** | ${rating} (${actor.actorReviewCount || 0} reviews) |
| **Active Users** | ${users} |
| **Pricing** | ${pricing} |
| **Categories** | ${cats || 'General'} |

## Why Use It?

- **No code required** — configure inputs, click run, get structured data
- **Cloud-hosted** — no servers to manage, no proxies to configure
- **API access** — integrate results directly into your apps and pipelines
- **Scheduled runs** — automate daily, hourly, or weekly data collection

## Get Started

[Try ${actor.title} on Apify](${url}) — every new account gets $5/month in free credits.

---

*This is part of a series highlighting the best tools from our [directory of 26,000+ Apify actors](${GITHUB_REPO}). If you're building data pipelines, AI applications, or automation workflows, check it out.*
`.trim();

      return {
        title: `${actor.title} — ${users} Users Can't Be Wrong`,
        body,
        tags: ['webdev', 'automation', 'api', 'tools'],
      };
    }
  },

  topList: {
    generate: (actors, category) => {
      const displayCat = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const list = actors.slice(0, 10);

      let body = `Looking for the best ${displayCat.toLowerCase()} tools? I put together a list of the top 10 most popular ones on Apify, ranked by active users.\n\n`;

      list.forEach((a, i) => {
        const url = `https://apify.com/${a.username}/${a.name}?fpr=${AFFILIATE_ID}`;
        const rating = a.actorReviewRating ? `${a.actorReviewRating.toFixed(1)}/5` : 'New';
        const users = formatUsers(a.stats?.totalUsers || 0);
        const pricing = getPricingLabel(a.currentPricingInfo);
        const desc = (a.description || '').substring(0, 150).replace(/\n/g, ' ');

        body += `## ${i + 1}. ${a.title}\n\n`;
        body += `**${users} users** | **${rating} rating** | **${pricing}**\n\n`;
        body += `${desc}\n\n`;
        body += `[Try it on Apify](${url})\n\n`;
        body += `---\n\n`;
      });

      body += `## Why Apify?\n\n`;
      body += `All of these tools run in the cloud with zero setup. No servers, no proxies, no code. Just configure your inputs and get structured data back as JSON, CSV, or Excel.\n\n`;
      body += `Every new account gets **$5/month in free credits** — [sign up here](${APIFY_SIGNUP}).\n\n`;
      body += `Want to see all 26,000+ tools? Check out the [full directory on GitHub](${GITHUB_REPO}).\n`;

      const tagMap = {
        LEAD_GENERATION: ['sales', 'marketing', 'automation', 'tools'],
        SOCIAL_MEDIA: ['socialmedia', 'api', 'automation', 'webdev'],
        ECOMMERCE: ['ecommerce', 'webdev', 'automation', 'tools'],
        AI: ['ai', 'machinelearning', 'automation', 'webdev'],
        SEO_TOOLS: ['seo', 'webdev', 'marketing', 'tools'],
        AUTOMATION: ['automation', 'webdev', 'productivity', 'tools'],
        DEVELOPER_TOOLS: ['webdev', 'devtools', 'api', 'tools'],
        JOBS: ['career', 'webdev', 'automation', 'tools'],
        REAL_ESTATE: ['webdev', 'automation', 'api', 'tools'],
        MCP_SERVERS: ['ai', 'webdev', 'api', 'tools'],
        TRAVEL: ['webdev', 'api', 'automation', 'tools'],
        VIDEOS: ['webdev', 'api', 'automation', 'tools'],
        NEWS: ['webdev', 'api', 'automation', 'tools'],
        AGENTS: ['ai', 'automation', 'webdev', 'tools'],
        INTEGRATIONS: ['webdev', 'api', 'automation', 'tools'],
      };

      return {
        title: `Top 10 ${displayCat} APIs & Scrapers in 2026 — Ranked by Active Users`,
        body,
        tags: tagMap[category] || ['webdev', 'automation', 'api', 'tools'],
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

      let body = `If you need to scrape ${displayKw} data, there are multiple tools available. But which one should you pick? I compared the top ${matches.length} options.\n\n`;

      body += `| Tool | Developer | Rating | Users | Pricing |\n|------|-----------|--------|-------|--------|\n`;
      matches.forEach(a => {
        const rating = a.actorReviewRating ? `${a.actorReviewRating.toFixed(1)}` : 'New';
        const users = formatUsers(a.stats?.totalUsers || 0);
        const pricing = getPricingLabel(a.currentPricingInfo);
        const title = (a.title || a.name).replace(/\|/g, '-');
        const dev = (a.userFullName || a.username).replace(/\|/g, '-');
        body += `| ${title} | ${dev} | ${rating} | ${users} | ${pricing} |\n`;
      });

      body += `\n## Detailed Breakdown\n\n`;

      matches.forEach((a, i) => {
        const url = `https://apify.com/${a.username}/${a.name}?fpr=${AFFILIATE_ID}`;
        const rating = a.actorReviewRating ? `${a.actorReviewRating.toFixed(1)}/5` : 'New';
        const users = formatUsers(a.stats?.totalUsers || 0);
        const pricing = getPricingLabel(a.currentPricingInfo);
        const desc = (a.description || '').substring(0, 200).replace(/\n/g, ' ');

        body += `### ${i + 1}. ${a.title}\n\n`;
        body += `${desc}\n\n`;
        body += `- **Users:** ${users}\n- **Rating:** ${rating}\n- **Pricing:** ${pricing}\n\n`;
        body += `[Try it on Apify](${url})\n\n`;
      });

      body += `---\n\n`;
      body += `All tools are available on [Apify](${APIFY_SIGNUP}) with $5/month in free credits for new accounts.\n\n`;
      body += `Full directory: [26,000+ tools on GitHub](${GITHUB_REPO})\n`;

      return {
        title: `${displayKw} Scraping Tools Compared — Which One Should You Use in 2026?`,
        body,
        tags: ['webdev', 'api', 'automation', 'tools'],
      };
    }
  },

  guide: {
    generate: (actors, topic) => {
      const topicMap = {
        'web scraping': {
          title: 'The Complete Guide to Web Scraping in 2026 — No Code Required',
          intro: 'Web scraping used to require Python, proxies, and hours of debugging. Not anymore.',
          tags: ['webdev', 'automation', 'beginners', 'tools']
        },
        'lead generation': {
          title: 'How to Generate 10,000+ Leads Per Month Using Automation Tools',
          intro: 'Manual lead research is dead. Here\'s how to automate the entire pipeline.',
          tags: ['sales', 'marketing', 'automation', 'tools']
        },
        'social media scraping': {
          title: 'How to Scrape Any Social Media Platform in 2026 — Complete Guide',
          intro: 'Need social media data for research, marketing, or AI training? Here are the best tools.',
          tags: ['socialmedia', 'api', 'automation', 'webdev']
        },
        'ai data pipelines': {
          title: 'Building AI Data Pipelines — How to Feed Your LLM Fresh Web Data',
          intro: 'Your AI is only as good as its data. Here\'s how to build automated data pipelines.',
          tags: ['ai', 'machinelearning', 'automation', 'webdev']
        },
        'price monitoring': {
          title: 'Automated Price Monitoring — Track Competitor Prices 24/7',
          intro: 'Stop manually checking competitor prices. Set up automated monitoring in minutes.',
          tags: ['ecommerce', 'automation', 'webdev', 'tools']
        }
      };

      const config = topicMap[topic];
      if (!config) return null;

      const relevant = actors.slice(0, 5);

      let body = `${config.intro}\n\n`;
      body += `## The Problem\n\n`;
      body += `Most developers still write custom scripts for data collection. This means:\n\n`;
      body += `- Hours of development time\n`;
      body += `- Maintaining proxy infrastructure\n`;
      body += `- Dealing with CAPTCHAs and rate limits\n`;
      body += `- Scripts breaking every time a website changes\n\n`;
      body += `## The Solution\n\n`;
      body += `Platforms like [Apify](${APIFY_SIGNUP}) offer pre-built tools (called "actors") that handle all of this for you. There are over 26,000 of them covering every major website and use case.\n\n`;
      body += `## Best Tools for ${topic.replace(/\b\w/g, c => c.toUpperCase())}\n\n`;

      relevant.forEach((a, i) => {
        const url = `https://apify.com/${a.username}/${a.name}?fpr=${AFFILIATE_ID}`;
        const users = formatUsers(a.stats?.totalUsers || 0);
        body += `### ${i + 1}. ${a.title} (${users} users)\n\n`;
        body += `${(a.description || '').substring(0, 200).replace(/\n/g, ' ')}\n\n`;
        body += `[Try it free](${url})\n\n`;
      });

      body += `## Getting Started\n\n`;
      body += `1. [Create a free Apify account](${APIFY_SIGNUP}) — comes with $5/month in credits\n`;
      body += `2. Browse the [full directory of 26,000+ tools](${GITHUB_REPO})\n`;
      body += `3. Pick a tool, configure your inputs, and hit Run\n`;
      body += `4. Download results as JSON, CSV, or push to Google Sheets\n\n`;
      body += `No servers. No code. No proxies. Just data.\n`;

      return {
        title: config.title,
        body,
        tags: config.tags,
      };
    }
  }
};

// ─── APILayer article templates ──────────────────────────────────────────────

const APILAYER_ARTICLE_TYPES = {
  spotlight: {
    generate: (product) => {
      const url = `${product.url}?fpr=${APILAYER_AFFILIATE_ID}`;
      const body = `
Looking for a reliable ${product.category.toLowerCase()} API? ${product.name} might be exactly what you need.

## What is ${product.name}?

${product.desc}

## Quick Facts

| Detail | Info |
|---|---|
| **Category** | ${product.category} |
| **Type** | REST API |
| **Format** | JSON |
| **Auth** | API Key |
| **Free Tier** | Yes |

## Why ${product.name}?

- **Production-ready** — used by 2.2M+ developers on APILayer
- **One API key** — works across all 40+ APILayer APIs
- **Free to start** — no credit card required
- **Great docs** — clear documentation with code examples
- **Scalable** — from hobby projects to enterprise

## Get Started

[Try ${product.name} free](${url}) — sign up takes 30 seconds, no credit card needed.

---

*${product.name} is part of [APILayer](${APILAYER_SIGNUP}), a platform with 40+ production-ready APIs under one account and one API key.*
`.trim();

      return {
        title: `${product.name} — ${product.tagline}`,
        body,
        tags: ['webdev', 'api', 'tools', 'programming'],
      };
    }
  },

  roundup: {
    generate: (products, category) => {
      const filtered = products.filter(p => p.category === category);
      if (filtered.length < 2) return null;

      let body = `Need ${category.toLowerCase()} data for your app? Here are the best APIs available on APILayer for ${category.toLowerCase()}.\n\n`;

      filtered.forEach((p, i) => {
        const url = `${p.url}?fpr=${APILAYER_AFFILIATE_ID}`;
        body += `## ${i + 1}. ${p.name}\n\n`;
        body += `**${p.tagline}**\n\n`;
        body += `${p.desc}\n\n`;
        body += `[Try ${p.name} free](${url})\n\n---\n\n`;
      });

      body += `## Why APILayer?\n\n`;
      body += `All these APIs work under **one account and one API key**. Sign up once, get access to 40+ APIs. No credit card required.\n\n`;
      body += `[Start building for free](${APILAYER_SIGNUP})\n`;

      const tagMap = {
        Finance: ['api', 'fintech', 'webdev', 'tools'],
        Geolocation: ['api', 'webdev', 'tools', 'programming'],
        SEO: ['seo', 'api', 'webdev', 'tools'],
        News: ['api', 'webdev', 'tools', 'programming'],
        Marketing: ['marketing', 'api', 'webdev', 'tools'],
        DevTools: ['api', 'webdev', 'tools', 'programming'],
        Weather: ['api', 'webdev', 'tools', 'programming'],
        Travel: ['api', 'webdev', 'tools', 'travel'],
        Scraping: ['api', 'webdev', 'tools', 'webscraping'],
      };

      return {
        title: `Best ${category} APIs for Developers in 2026`,
        body,
        tags: tagMap[category] || ['api', 'webdev', 'tools', 'programming'],
      };
    }
  },

  guide: {
    generate: (products, topic) => {
      const guideMap = {
        'ip geolocation': {
          title: 'How to Add IP Geolocation to Your App in 5 Minutes',
          intro: 'Know where your users are — without asking them.',
          products: ['IPStack', 'Positionstack'],
          tags: ['webdev', 'api', 'tools', 'tutorial'],
        },
        'stock market data': {
          title: 'How to Get Real-Time Stock Market Data via API',
          intro: 'Building a finance app or trading bot? You need reliable market data.',
          products: ['Marketstack', 'Coinlayer'],
          tags: ['api', 'fintech', 'webdev', 'tools'],
        },
        'flight tracking': {
          title: 'How to Build a Flight Tracker with Aviationstack API',
          intro: 'Track any flight in real-time with a single API call.',
          products: ['Aviationstack'],
          tags: ['api', 'webdev', 'tools', 'tutorial'],
        },
        'serp scraping': {
          title: 'How to Scrape Google Search Results Without Getting Blocked',
          intro: 'Need SERP data at scale? Forget proxies and headless browsers.',
          products: ['Serpstack', 'Scrapestack'],
          tags: ['seo', 'api', 'webdev', 'tools'],
        },
        'phone validation': {
          title: 'How to Validate Phone Numbers via API — Global Coverage',
          intro: 'Bad phone data kills conversion rates. Fix it at the source.',
          products: ['Numverify'],
          tags: ['api', 'webdev', 'tools', 'marketing'],
        },
      };

      const config = guideMap[topic];
      if (!config) return null;

      const relevant = products.filter(p => config.products.includes(p.name));

      let body = `${config.intro}\n\n`;
      body += `## The Problem\n\n`;
      body += `Most developers either build custom solutions (slow, fragile) or pay for expensive enterprise APIs (overkill for most projects). There's a middle ground.\n\n`;
      body += `## The Solution\n\n`;

      relevant.forEach((p, i) => {
        const url = `${p.url}?fpr=${APILAYER_AFFILIATE_ID}`;
        body += `### ${p.name}\n\n`;
        body += `${p.desc}\n\n`;
        body += `[Try ${p.name} free](${url})\n\n`;
      });

      body += `## Getting Started\n\n`;
      body += `1. [Sign up for APILayer](${APILAYER_SIGNUP}) — free, no credit card\n`;
      body += `2. Get your API key from the dashboard\n`;
      body += `3. Make your first API call in seconds\n\n`;
      body += `One account gives you access to 40+ APIs. Start free and scale as you grow.\n`;

      return {
        title: config.title,
        body,
        tags: config.tags,
      };
    }
  }
};

const APILAYER_CATEGORIES = ['Finance', 'Geolocation', 'SEO', 'News', 'Marketing', 'DevTools', 'Weather', 'Travel', 'Scraping'];
const APILAYER_GUIDE_TOPICS = ['ip geolocation', 'stock market data', 'flight tracking', 'serp scraping', 'phone validation'];

const COMPARISON_KEYWORDS = [
  'instagram', 'tiktok', 'linkedin', 'youtube', 'twitter', 'facebook',
  'google maps', 'amazon', 'indeed', 'reddit'
];

const CATEGORIES_FOR_LISTS = [
  'LEAD_GENERATION', 'SOCIAL_MEDIA', 'ECOMMERCE', 'AI', 'SEO_TOOLS',
  'AUTOMATION', 'DEVELOPER_TOOLS', 'JOBS', 'REAL_ESTATE', 'MCP_SERVERS',
  'TRAVEL', 'VIDEOS', 'NEWS', 'AGENTS'
];

const GUIDE_TOPICS = [
  'web scraping', 'lead generation', 'social media scraping',
  'ai data pipelines', 'price monitoring'
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

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'DevToBot/1.0' } }, (res) => {
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
  const res = await fetchJSON(`https://api.apify.com/v2/store?limit=${limit}&category=${category}`);
  return res.data?.items || [];
}

async function fetchAllTopActors(limit = 200) {
  const res = await fetchJSON(`https://api.apify.com/v2/store?limit=${limit}`);
  return res.data?.items || [];
}

// ─── Dev.to publish ───────────────────────────────────────────────────────────

async function publishArticle(title, body, tags, series) {
  const article = {
    article: {
      title,
      body_markdown: body,
      published: true,
      tags,
      ...(series ? { series } : {}),
    }
  };

  const postData = JSON.stringify(article);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'dev.to',
      port: 443,
      path: '/api/articles',
      method: 'POST',
      headers: {
        'api-key': DEVTO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'DevToBot/1.0',
        'Content-Length': Buffer.byteLength(postData),
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ─── State ────────────────────────────────────────────────────────────────────

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {
      postedActors: [],
      postedCategories: [],
      postedKeywords: [],
      postedGuides: [],
      typeQueue: [],
      postCount: 0,
      lastRun: null,
      // APILayer state
      alPostedProducts: [],
      alPostedCategories: [],
      alPostedGuides: [],
      alTypeQueue: [],
      // Base44 state
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

function pickPostType(state) {
  const types = ['spotlight', 'topList', 'comparison', 'guide'];
  if (!state.typeQueue || state.typeQueue.length === 0) {
    state.typeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  return state.typeQueue.shift();
}

function pickALPostType(state) {
  const types = ['spotlight', 'roundup', 'guide'];
  if (!state.alTypeQueue || state.alTypeQueue.length === 0) {
    state.alTypeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  return state.alTypeQueue.shift();
}

async function generateApifyArticle(state) {
  const type = pickPostType(state);
  console.log(`Generating Apify ${type} article...`);

  if (type === 'spotlight') {
    const allActors = await fetchAllTopActors(200);
    const unposted = allActors.filter(a => !state.postedActors.includes(`${a.username}/${a.name}`));
    if (unposted.length === 0) { state.postedActors = []; return generateApifyArticle(state); }
    const actor = unposted[Math.floor(Math.random() * Math.min(30, unposted.length))];
    const article = ARTICLE_TYPES.spotlight.generate(actor);
    state.postedActors.push(`${actor.username}/${actor.name}`);
    return { ...article, type: 'spotlight', series: 'Apify Tool Spotlight', platform: 'apify' };
  }

  if (type === 'topList') {
    const unpostedCats = CATEGORIES_FOR_LISTS.filter(c => !state.postedCategories.includes(c));
    if (unpostedCats.length === 0) { state.postedCategories = []; return generateApifyArticle(state); }
    const cat = unpostedCats[Math.floor(Math.random() * unpostedCats.length)];
    const actors = await fetchTopActors(cat, 20);
    const article = ARTICLE_TYPES.topList.generate(actors, cat);
    state.postedCategories.push(cat);
    return { ...article, type: 'topList', series: 'Best APIs & Scrapers', platform: 'apify' };
  }

  if (type === 'comparison') {
    const unpostedKw = COMPARISON_KEYWORDS.filter(k => !state.postedKeywords.includes(k));
    if (unpostedKw.length === 0) { state.postedKeywords = []; return generateApifyArticle(state); }
    const kw = unpostedKw[Math.floor(Math.random() * unpostedKw.length)];
    const allActors = await fetchAllTopActors(200);
    const article = ARTICLE_TYPES.comparison.generate(allActors, kw);
    if (!article) { state.postedKeywords.push(kw); return generateApifyArticle(state); }
    state.postedKeywords.push(kw);
    return { ...article, type: 'comparison', series: 'Tool Comparisons', platform: 'apify' };
  }

  if (type === 'guide') {
    const unpostedGuides = GUIDE_TOPICS.filter(t => !state.postedGuides.includes(t));
    if (unpostedGuides.length === 0) { state.postedGuides = []; return generateApifyArticle(state); }
    const topic = unpostedGuides[Math.floor(Math.random() * unpostedGuides.length)];
    const allActors = await fetchAllTopActors(50);
    const article = ARTICLE_TYPES.guide.generate(allActors, topic);
    if (!article) { state.postedGuides.push(topic); return generateApifyArticle(state); }
    state.postedGuides.push(topic);
    return { ...article, type: 'guide', series: 'Automation Guides', platform: 'apify' };
  }
}

function generateAPILayerArticle(state) {
  const type = pickALPostType(state);
  console.log(`Generating APILayer ${type} article...`);

  if (type === 'spotlight') {
    if (!state.alPostedProducts) state.alPostedProducts = [];
    const unposted = APILAYER_PRODUCTS.filter(p => !state.alPostedProducts.includes(p.slug));
    if (unposted.length === 0) { state.alPostedProducts = []; return generateAPILayerArticle(state); }
    const product = unposted[Math.floor(Math.random() * unposted.length)];
    const article = APILAYER_ARTICLE_TYPES.spotlight.generate(product);
    state.alPostedProducts.push(product.slug);
    return { ...article, type: 'spotlight', series: 'API Spotlight', platform: 'apilayer' };
  }

  if (type === 'roundup') {
    if (!state.alPostedCategories) state.alPostedCategories = [];
    const unpostedCats = APILAYER_CATEGORIES.filter(c => !state.alPostedCategories.includes(c));
    if (unpostedCats.length === 0) { state.alPostedCategories = []; return generateAPILayerArticle(state); }
    const cat = unpostedCats[Math.floor(Math.random() * unpostedCats.length)];
    const article = APILAYER_ARTICLE_TYPES.roundup.generate(APILAYER_PRODUCTS, cat);
    if (!article) { state.alPostedCategories.push(cat); return generateAPILayerArticle(state); }
    state.alPostedCategories.push(cat);
    return { ...article, type: 'roundup', series: 'Best APIs for Developers', platform: 'apilayer' };
  }

  if (type === 'guide') {
    if (!state.alPostedGuides) state.alPostedGuides = [];
    const unposted = APILAYER_GUIDE_TOPICS.filter(t => !state.alPostedGuides.includes(t));
    if (unposted.length === 0) { state.alPostedGuides = []; return generateAPILayerArticle(state); }
    const topic = unposted[Math.floor(Math.random() * unposted.length)];
    const article = APILAYER_ARTICLE_TYPES.guide.generate(APILAYER_PRODUCTS, topic);
    if (!article) { state.alPostedGuides.push(topic); return generateAPILayerArticle(state); }
    state.alPostedGuides.push(topic);
    return { ...article, type: 'guide', series: 'API Guides', platform: 'apilayer' };
  }
}

function pickB44ArticleType(state) {
  const types = ['spotlight', 'useCase', 'comparison'];
  if (!state.b44TypeQueue || state.b44TypeQueue.length === 0) {
    state.b44TypeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  return state.b44TypeQueue.shift();
}

function generateBase44Article(state) {
  const type = pickB44ArticleType(state);
  console.log(`Generating Base44 ${type} article...`);

  if (type === 'spotlight') {
    const feature = BASE44_FEATURES[Math.floor(Math.random() * BASE44_FEATURES.length)];
    return {
      title: `Build Apps Without Code: ${feature.name} with Base44`,
      body: `Building software used to require months of development time. Base44 changes that completely.\n\n## What is Base44?\n\nBase44 is a no-code/vibe-coding platform that lets you build full applications by describing what you want in plain English. The AI generates your app — frontend, backend, database, and deployment — in minutes.\n\n## Feature Spotlight: ${feature.name}\n\n${feature.desc}\n\n## Why Developers and Non-Developers Love It\n\n- **AI-powered generation** — describe your app, get a working prototype\n- **Built-in database** — no schema design or migration headaches\n- **Authentication included** — user login works out of the box\n- **One-click deploy** — go live instantly, no DevOps needed\n- **AI agents** — build intelligent automations natively\n\n## Get Started\n\nBase44 is free to start. No credit card required.\n\n**[Try Base44 free →](${BASE44_LINK})**`,
      tags: ['nocode', 'webdev', 'programming', 'ai'],
      series: 'No-Code Development',
      platform: 'base44',
      type: 'spotlight'
    };
  }

  if (type === 'useCase') {
    if (!state.b44PostedUseCases) state.b44PostedUseCases = [];
    const unposted = BASE44_USE_CASES.filter(u => !state.b44PostedUseCases.includes(u));
    const useCases = unposted.length > 0 ? unposted : BASE44_USE_CASES;
    if (unposted.length === 0) state.b44PostedUseCases = [];
    const uc = useCases[Math.floor(Math.random() * useCases.length)];
    state.b44PostedUseCases.push(uc);
    const ucTitle = uc.charAt(0).toUpperCase() + uc.slice(1);
    return {
      title: `How to Build ${ucTitle} Without Writing a Single Line of Code`,
      body: `Need ${uc} but don't have the budget for a dev team? Here's how to build it yourself in minutes.\n\n## The Problem\n\nTraditionally, building ${uc} requires:\n- A frontend developer\n- A backend developer\n- Database design\n- DevOps for deployment\n- Weeks or months of development time\n\n## The Solution: Base44\n\nBase44 lets you skip all of that. Just describe your ${uc} app in plain English, and the AI builds everything:\n\n1. **Describe** — Tell Base44 what your ${uc} app should do\n2. **Customize** — Tweak the generated UI and logic\n3. **Deploy** — Go live with one click\n\n## What You Get\n\n- Full working application with database\n- User authentication built in\n- Mobile-responsive design\n- Custom domain support\n- No monthly developer costs\n\n## Perfect For\n\n- Non-technical founders building ${uc}\n- Freelancers delivering ${uc} to clients fast\n- Teams prototyping before committing to custom development\n\n**[Build your ${uc} app free →](${BASE44_LINK})**`,
      tags: ['nocode', 'startup', 'webdev', 'productivity'],
      series: 'No-Code Development',
      platform: 'base44',
      type: 'useCase'
    };
  }

  if (type === 'comparison') {
    return {
      title: 'No-Code in 2024: Why AI-Powered App Builders Are Replacing Drag-and-Drop',
      body: `The no-code space has evolved. Drag-and-drop builders were the first wave. AI-powered builders like Base44 are the next.\n\n## Traditional No-Code vs AI-Powered No-Code\n\n| Feature | Drag & Drop Tools | Base44 (AI-Powered) |\n|---------|-------------------|--------------------|\n| App creation | Manual component placement | Describe in English |\n| Database | Manual schema design | Auto-generated |\n| Authentication | Plugin or add-on | Built-in |\n| AI agents | Not available | Native support |\n| Learning curve | Hours to days | Minutes |\n| Deployment | Separate configuration | One click |\n\n## What Makes Base44 Different\n\n**You describe, AI builds.** Instead of dragging components around a canvas, you tell Base44 what your app should do in plain English. The AI generates the full stack — frontend, backend, database, auth, and hosting.\n\n**Full-stack output.** Most no-code tools give you a frontend. Base44 gives you a complete application with a real database, API endpoints, and user management.\n\n**AI agents built in.** Build intelligent automations that can process data, answer questions, and trigger actions — no third-party integrations needed.\n\n## Who It's For\n\n- Founders who want to validate ideas fast\n- Agencies building client apps without dev overhead\n- Teams that need internal tools yesterday\n\n**[Try Base44 free →](${BASE44_LINK})**`,
      tags: ['nocode', 'ai', 'webdev', 'startup'],
      series: 'No-Code Development',
      platform: 'base44',
      type: 'comparison'
    };
  }
}

function pickHostArticleType(state) {
  const types = ['planGuide', 'useCase', 'whySwitch'];
  if (!state.hostTypeQueue || state.hostTypeQueue.length === 0) {
    state.hostTypeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  return state.hostTypeQueue.shift();
}

function generateHostingerArticle(state) {
  const type = pickHostArticleType(state);
  console.log(`Generating Hostinger ${type} article...`);
  const coupons = loadHostingerCoupons();
  const couponSection = formatCouponSection(coupons);
  console.log(`Loaded ${coupons.length} coupons`);

  if (type === 'planGuide') {
    return {
      title: 'Hostinger Plans Compared: Which One Do You Actually Need in 2026?',
      body: `Choosing a hosting plan shouldn't be complicated. Here's a breakdown of Hostinger's three main plans so you can pick the right one without overpaying.\n\n## Plan Comparison\n\n| Plan | Price | Websites | Storage | Backups | Best For |\n|------|-------|----------|---------|---------|----------|\n| Premium | $2.99/mo | 3 | 20 GB SSD | Weekly | Personal sites, blogs |\n| Unlimited | $3.79/mo | Unlimited | 50 GB NVMe | Daily | Freelancers, growing brands |\n| Cloud Startup | $7.99/mo | Unlimited | 100 GB NVMe | Daily + on-demand | Agencies, high-traffic sites |\n\n## What All Plans Include\n\n- Free domain for 1 year\n- Free SSL certificate\n- CDN for global speed\n- WordPress one-click install\n- Drag-and-drop website builder\n- Vibe coding — describe your site, AI builds it\n- 24/7 priority support\n- 99.9% uptime guarantee\n\n## My Recommendation\n\nThe **Unlimited plan at $3.79/mo** is the sweet spot. Unlimited websites, daily backups, unlimited mailboxes, and NVMe storage. If you're managing client sites or running multiple projects, it's hard to beat.\n\nFor high-traffic sites or agencies, **Cloud Startup** adds dedicated IP, 4 CPU cores, and 4 GB RAM.${couponSection}\n\nAll plans come with a 30-day money-back guarantee.\n\n**[Check Hostinger pricing →](${HOSTINGER_LINK})**`,
      tags: ['webdev', 'hosting', 'beginners', 'wordpress'],
      series: 'Web Hosting Guides',
      platform: 'hostinger',
      type: 'planGuide'
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
      title: `How to Launch ${/^[aeiou]/i.test(ucTitle) ? 'an' : 'a'} ${ucTitle} for Under $3/Month`,
      body: `You don't need expensive hosting to launch a ${uc}. Here's how to get one live in under an hour for $2.99/mo.\n\n## What You Need\n\n1. **A domain** — Hostinger includes one free for the first year\n2. **Hosting** — The Premium plan ($2.99/mo) is enough to start\n3. **A platform** — WordPress (one-click install) or Hostinger's drag-and-drop builder\n\n## Step-by-Step Setup\n\n### 1. Pick Your Plan\n\nFor a ${uc}, the **Premium plan** works great. You get 20 GB SSD storage, free SSL, CDN, and 24/7 support.\n\nIf you think you'll add more sites later, the **Unlimited plan** ($3.79/mo) gives you unlimited websites and daily backups.\n\n### 2. Register Your Domain\n\nPick a domain during checkout — it's free for the first year with WHOIS privacy included.\n\n### 3. Install WordPress or Use the Builder\n\nHostinger's control panel lets you install WordPress in one click. Or use their drag-and-drop builder if you want something simpler.\n\nThey also have **vibe coding** — describe your site in plain English and AI generates it.\n\n### 4. Set Up Email\n\nCreate a professional email address (hello@yourdomain.com) through Hostinger's built-in email tools.\n\n### 5. Go Live\n\nActivate SSL (free), enable CDN, and you're live. The whole process takes 30-60 minutes.\n\n## Why Hostinger?\n\n- NVMe storage on higher plans\n- 99.9% uptime guarantee\n- Built-in ecommerce support\n- Free automatic website migration\n- 30-day money-back guarantee${couponSection}\n\n**[Get started with Hostinger →](${HOSTINGER_LINK})**`,
      tags: ['webdev', 'hosting', 'beginners', 'tutorial'],
      series: 'Web Hosting Guides',
      platform: 'hostinger',
      type: 'useCase'
    };
  }

  if (type === 'whySwitch') {
    return {
      title: 'Why I Switched to Hostinger — Honest Review After Using It for Months',
      body: `I've tried multiple hosting providers over the years. Here's why Hostinger is my current recommendation, especially for developers and small businesses.\n\n## What I Like\n\n### Price-to-Value Ratio\n\nStarting at $2.99/mo for the Premium plan, you get more than most hosts charge $10+/mo for:\n- Free domain (1 year)\n- Free SSL\n- CDN included\n- WordPress one-click install\n- Drag-and-drop builder\n- Email accounts\n\n### NVMe Storage\n\nThe Unlimited ($3.79/mo) and Cloud Startup ($7.99/mo) plans use NVMe storage, which is noticeably faster than regular SSD hosting.\n\n### Vibe Coding\n\nThis is a newer feature — describe your website in plain English and AI builds it. Useful for quick prototypes and landing pages.\n\n### Developer-Friendly\n\n- Node.js support\n- SSH access\n- Git integration\n- Multiple PHP versions\n- WP-CLI support\n\n## Plan Breakdown\n\n| Plan | Price | Storage | Websites | Key Feature |\n|------|-------|---------|----------|-------------|\n| Premium | $2.99/mo | 20 GB SSD | 3 | Best starting point |\n| Unlimited | $3.79/mo | 50 GB NVMe | Unlimited | Best value |\n| Cloud Startup | $7.99/mo | 100 GB NVMe | Unlimited | Best performance |\n\n## Who Should Use Hostinger\n\n- **Beginners** launching their first site\n- **Freelancers** managing multiple client sites (Unlimited plan)\n- **Small businesses** that need reliable hosting without enterprise pricing\n- **Developers** who want Node.js + WordPress on the same host\n\n30-day money-back guarantee on all plans.${couponSection}\n\n**[Check Hostinger plans →](${HOSTINGER_LINK})**`,
      tags: ['webdev', 'hosting', 'review', 'wordpress'],
      series: 'Web Hosting Guides',
      platform: 'hostinger',
      type: 'whySwitch'
    };
  }
}

async function generateArticle(state, index) {
  const totalIndex = (state.postCount || 0) + (index || 0);
  const platform = PLATFORM_ROTATION[totalIndex % PLATFORM_ROTATION.length];
  console.log(`Platform: ${platform}`);
  if (platform === 'hostinger') return generateHostingerArticle(state);
  if (platform === 'base44') return generateBase44Article(state);
  if (platform === 'apilayer') return generateAPILayerArticle(state);
  return generateApifyArticle(state);
}

// ─── Jekyll post ─────────────────────────────────────────────────────────────

function saveJekyllPost(article) {
  const today = new Date().toISOString().split('T')[0];
  const slug = article.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
  const filename = `${today}-${slug}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  if (fs.existsSync(filepath)) return null;

  const tags = (article.tags || []).map(t => `"${t}"`).join(', ');
  const content = `---
layout: post
title: "${article.title.replace(/"/g, '\\"')}"
date: ${today}
tags: [${tags}]
description: "${article.title.replace(/"/g, '\\"')}"
---

${article.body}
`;

  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(filepath, content);
  console.log(`Saved Jekyll post: _posts/${filename}`);
  return filename;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || POSTS_PER_RUN;

  console.log(`\n=== Dev.to Article Poster ===`);
  console.log(`Posts to create: ${count}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const state = loadState();

  for (let i = 0; i < count; i++) {
    console.log(`\n--- Article ${i + 1}/${count} ---`);

    const article = await generateArticle(state, i);
    console.log(`Type: ${article.type}`);
    console.log(`Title: ${article.title}`);
    console.log(`Tags: ${article.tags.join(', ')}`);
    console.log(`Series: ${article.series}`);

    saveJekyllPost(article);

    if (dryRun) {
      console.log(`\n--- Preview ---\n${article.body.substring(0, 400)}...\n--- End Preview ---`);
    } else {
      const res = await publishArticle(article.title, article.body, article.tags, article.series);
      if (res.status === 201) {
        console.log(`Published: ${res.data.url}`);
      } else {
        console.log(`Error (${res.status}): ${JSON.stringify(res.data).substring(0, 300)}`);
      }

      state.postCount++;
      state.lastRun = new Date().toISOString();
      saveState(state);

      if (i < count - 1) {
        console.log('Waiting 5+ min between articles (rate limit)...');
        await sleep(DELAY_BETWEEN_POSTS);
      }
    }
  }

  saveState(state);
  console.log(`\nDone! Total articles ever: ${state.postCount}`);
}

main().catch(console.error);
