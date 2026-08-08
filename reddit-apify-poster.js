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
          `Search for **${actorPath}** on Apify to try it out.\n\n` +
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
      body += `All of these are available on Apify — just search by name.\n\n`;
      body += `*Want more? Browse all ${displayCat} tools and 26,000+ others in our [full directory on GitHub](${GITHUB_REPO}/blob/master/categories/${catFile}.md).*`;

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

      body += `\nAll available on Apify — search by name to get started. Every new account also gets $5/month in free credits for paid tools.\n\n`;
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

      body += `\nAll available on Apify — search by name to try them.\n\n`;
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
          `Search for **${product.name}** on APILayer to try it out.\n\n` +
          `---\n\n` +
          `*Part of [APILayer](https://apilayer.com) — 40+ production-ready APIs under one account.*`,
        commentLink: `${product.url}?fpr=${APILAYER_AFFILIATE_ID}`
      };
    }
  },

  roundup: {
    generate: (products) => {
      let body = `Here are some of the best **free APIs** available on APILayer right now:\n\n`;
      body += `| # | API | Category | What It Does |\n|---|-----|----------|-------------|\n`;

      products.forEach((p, i) => {
        body += `| ${i + 1} | **${p.name}** | ${p.category} | ${p.tagline} |\n`;
      });

      body += `\nAll available on APILayer — one account, one API key, 40+ APIs. Free to start, no credit card needed.\n\n`;
      body += `---\n\n`;
      body += `*Check out [APILayer](https://apilayer.com) for the full list.*`;

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
      body += `*${product.name} is part of [APILayer](https://apilayer.com) — 40+ APIs, one account, one key.*`;

      return {
        title: `What You Can Build with ${product.name} API — ${product.category} Data Made Easy`,
        text: body,
        commentLink: `${product.url}?fpr=${APILAYER_AFFILIATE_ID}`
      };
    }
  }
};

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

async function generatePost(state, index) {
  const totalIndex = (state.postCount || 0) + (index || 0);
  const platform = (totalIndex % 2 === 0) ? 'apify' : 'apilayer';
  console.log(`Platform: ${platform}`);
  if (platform === 'apilayer') {
    return generateAPILayerPost(state);
  }
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
