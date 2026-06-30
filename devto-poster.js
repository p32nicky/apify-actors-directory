const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const DEVTO_API_KEY = process.env.DEVTO_API_KEY || '';
const AFFILIATE_ID = process.env.APIFY_AFFILIATE_ID || '97nrp4';
const GITHUB_REPO = 'https://github.com/p32nicky/apify-actors-directory';
const APIFY_SIGNUP = `https://www.apify.com/?fpr=${AFFILIATE_ID}`;

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

async function generateArticle(state) {
  const type = pickPostType(state);
  console.log(`Generating ${type} article...`);

  if (type === 'spotlight') {
    const allActors = await fetchAllTopActors(200);
    const unposted = allActors.filter(a => !state.postedActors.includes(`${a.username}/${a.name}`));
    if (unposted.length === 0) { state.postedActors = []; return generateArticle(state); }
    const actor = unposted[Math.floor(Math.random() * Math.min(30, unposted.length))];
    const article = ARTICLE_TYPES.spotlight.generate(actor);
    state.postedActors.push(`${actor.username}/${actor.name}`);
    return { ...article, type: 'spotlight', series: 'Apify Tool Spotlight' };
  }

  if (type === 'topList') {
    const unpostedCats = CATEGORIES_FOR_LISTS.filter(c => !state.postedCategories.includes(c));
    if (unpostedCats.length === 0) { state.postedCategories = []; return generateArticle(state); }
    const cat = unpostedCats[Math.floor(Math.random() * unpostedCats.length)];
    const actors = await fetchTopActors(cat, 20);
    const article = ARTICLE_TYPES.topList.generate(actors, cat);
    state.postedCategories.push(cat);
    return { ...article, type: 'topList', series: 'Best APIs & Scrapers' };
  }

  if (type === 'comparison') {
    const unpostedKw = COMPARISON_KEYWORDS.filter(k => !state.postedKeywords.includes(k));
    if (unpostedKw.length === 0) { state.postedKeywords = []; return generateArticle(state); }
    const kw = unpostedKw[Math.floor(Math.random() * unpostedKw.length)];
    const allActors = await fetchAllTopActors(200);
    const article = ARTICLE_TYPES.comparison.generate(allActors, kw);
    if (!article) { state.postedKeywords.push(kw); return generateArticle(state); }
    state.postedKeywords.push(kw);
    return { ...article, type: 'comparison', series: 'Tool Comparisons' };
  }

  if (type === 'guide') {
    const unpostedGuides = GUIDE_TOPICS.filter(t => !state.postedGuides.includes(t));
    if (unpostedGuides.length === 0) { state.postedGuides = []; return generateArticle(state); }
    const topic = unpostedGuides[Math.floor(Math.random() * unpostedGuides.length)];
    const allActors = await fetchAllTopActors(50);
    const article = ARTICLE_TYPES.guide.generate(allActors, topic);
    if (!article) { state.postedGuides.push(topic); return generateArticle(state); }
    state.postedGuides.push(topic);
    return { ...article, type: 'guide', series: 'Automation Guides' };
  }
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

    const article = await generateArticle(state);
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
