const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const DEVTO_API_KEY = process.env.DEVTO_BLUEHOST_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const BLUEHOST_LINK = 'https://bluehost.sjv.io/5k0d52';

const POSTS_PER_RUN = 1;
const DELAY_BETWEEN_POSTS = 310000;
const STATE_FILE = path.join(__dirname, '.devto-bluehost-state.json');

// ─── Groq LLM ─────────────────────────────────────────────────────────────────

const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
let groqModelIdx = 0;

function callGroq(prompt) {
  return new Promise((resolve, reject) => {
    const model = GROQ_MODELS[groqModelIdx % GROQ_MODELS.length];
    groqModelIdx++;
    const postData = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 3000,
    });
    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`Groq ${res.statusCode}: ${data.substring(0, 200)}`));
            return;
          }
          const content = JSON.parse(data).choices[0].message.content;
          resolve(content);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ─── Article topics (web hosting / WordPress / Bluehost focused) ──────────────

const TOPICS = [
  // WordPress + Bluehost tutorials
  'How to Set Up a WordPress Blog with Bluehost in 15 Minutes',
  'Bluehost vs Shared Hosting: Why It Wins for WordPress',
  'How to Install WordPress on Bluehost: Step-by-Step Guide',
  'Setting Up WooCommerce on Bluehost: Complete Tutorial',
  'How to Migrate Your WordPress Site to Bluehost',
  'Bluehost WordPress Hosting: Features Every Developer Should Know',
  'How to Set Up SSL on Bluehost for Free',
  'Bluehost cPanel Guide: Everything You Need to Know',
  'How to Create a Staging Site on Bluehost',
  'Setting Up Email Hosting with Bluehost',
  'How to Speed Up Your Bluehost WordPress Site',
  'Bluehost Domain Setup: Connecting Your Custom Domain',
  'How to Set Up Automatic WordPress Backups on Bluehost',
  'Bluehost Security Features: Protecting Your Website',
  'How to Use Bluehost Website Builder for Non-Developers',

  // Web development guides
  'Best Web Hosting for Developers in 2026',
  'How to Launch Your First Website for Under $3/Month',
  'WordPress vs Custom Code: When to Use Each',
  'How to Set Up a Development Environment on Shared Hosting',
  'Best Hosting for Side Projects and Portfolio Sites',
  'How to Host Multiple WordPress Sites on One Account',
  'Shared Hosting vs VPS: Which Do You Actually Need?',
  'How to Deploy a Node.js App with Bluehost VPS',
  'Setting Up a Blog That Actually Makes Money',
  'How to Build a Freelance Portfolio Website in 2026',
  'Best WordPress Themes for Developer Portfolios',
  'How to Set Up a Client Website on Bluehost',
  'Building a Landing Page That Converts: Hosting Guide',
  'How to Start a Tech Blog and Get Your First 1000 Readers',
  'Web Hosting Security Checklist for Beginners',

  // WordPress tips and tricks
  'Top 10 WordPress Plugins Every Developer Should Use',
  'How to Optimize WordPress Performance in 2026',
  'WordPress SEO: Complete Setup Guide for New Sites',
  'How to Build a WordPress REST API Backend',
  'Essential WordPress Security Plugins for 2026',
  'How to Create Custom WordPress Themes from Scratch',
  'WordPress Gutenberg: Building Custom Blocks',
  'How to Set Up WordPress Multisite',
  'Best WordPress Caching Plugins Compared',
  'How to Add Analytics to Your WordPress Site',
  'WordPress Database Optimization: A Developer Guide',
  'How to Build a Membership Site with WordPress',
  'Creating Custom Post Types in WordPress',
  'WordPress vs Headless CMS: Pros and Cons',
  'How to Build an E-Commerce Site from Scratch with WordPress',

  // Business/monetization
  'How to Start a Web Design Business with WordPress',
  'Best Hosting for Small Business Websites in 2026',
  'How to Build and Sell WordPress Websites as a Side Hustle',
  'Starting an Online Store: Hosting Setup Guide',
  'How to Create a SaaS Landing Page on WordPress',
  'Building a Real Estate Website with WordPress and Bluehost',
  'How to Set Up a Restaurant Website in 30 Minutes',
  'Creating a Booking Site with WordPress',
  'How to Build a Job Board with WordPress',
  'Setting Up an Online Course Platform with WordPress',

  // Comparison/reviews
  'Bluehost Review 2026: Is It Still Worth It?',
  'Bluehost vs SiteGround: Honest Developer Comparison',
  'Bluehost vs DigitalOcean: Managed vs Unmanaged Hosting',
  'Best WordPress Hosting Providers Compared',
  'Bluehost vs GoDaddy: Which Is Better for WordPress?',
  'Cheap WordPress Hosting That Actually Performs Well',
  'Bluehost Pricing Explained: Which Plan Do You Need?',
  'Best Hosting for WordPress Beginners in 2026',
  'Bluehost vs Cloudways: Traditional vs Cloud Hosting',
  'Is Managed WordPress Hosting Worth the Extra Cost?',

  // Technical deep dives
  'Understanding Web Hosting: Shared, VPS, and Dedicated Explained',
  'How DNS Works: A Developer-Friendly Explanation',
  'HTTPS and SSL Certificates: Everything You Need to Know',
  'How to Configure PHP on Bluehost for Better Performance',
  'Understanding WordPress Hosting Requirements',
  'How CDNs Work and Why Your WordPress Site Needs One',
  'Server-Side Caching vs Plugin Caching for WordPress',
  'How to Read and Understand Your Hosting Error Logs',
  'Database Management for WordPress Developers',
  'How to Handle WordPress Hosting for High-Traffic Sites',

  // Seasonal/trending
  'Best Black Friday Web Hosting Deals for Developers',
  'How to Prepare Your Website for Holiday Traffic',
  'New Year Website Audit: Hosting Performance Checklist',
  'Spring Cleaning Your WordPress Installation',
  'Mid-Year Hosting Review: Is Your Site Performing?',
];

const TAG_POOL = [
  ['webdev', 'wordpress', 'tutorial', 'beginners'],
  ['webdev', 'hosting', 'wordpress', 'programming'],
  ['wordpress', 'tutorial', 'webdev', 'productivity'],
  ['webdev', 'beginners', 'programming', 'tutorial'],
  ['wordpress', 'webdev', 'discuss', 'beginners'],
  ['hosting', 'webdev', 'wordpress', 'tutorial'],
  ['webdev', 'programming', 'wordpress', 'productivity'],
  ['wordpress', 'beginners', 'webdev', 'discuss'],
];

// ─── State management ─────────────────────────────────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch(e) {}
  return { postedTopics: [], articleIndex: 0, totalPosted: 0 };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Article generation ───────────────────────────────────────────────────────

function pickTopic(state) {
  for (const topic of TOPICS) {
    if (!state.postedTopics.includes(topic)) return topic;
  }
  state.postedTopics = [];
  return TOPICS[0];
}

async function generateArticle(state) {
  const topic = pickTopic(state);
  const tags = TAG_POOL[state.articleIndex % TAG_POOL.length];

  const prompt = `Write a Dev.to article titled: "${topic}"

This is about web hosting, WordPress development, and building websites.
Include Bluehost as the recommended hosting provider with this affiliate link: ${BLUEHOST_LINK}

Requirements:
- Write 600-1000 words of original, helpful content
- Use proper markdown formatting with ## headers
- Include 2-3 natural mentions of Bluehost with the link
- Be practical and developer-focused
- Do NOT include the title in the body (Dev.to adds it)
- Do NOT include frontmatter or metadata
- End with a clear call-to-action to try Bluehost
- Write in a conversational, developer-friendly tone
- Make sure ALL Bluehost links use exactly this URL: ${BLUEHOST_LINK}
- Include real, actionable advice — not generic filler
- If it's a tutorial, include actual steps with code or config examples`;

  let body;
  try {
    body = await callGroq(prompt);
    body = body.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  } catch (e) {
    console.error(`LLM generation failed: ${e.message}`);
    body = generateFallbackArticle(topic);
  }

  if (!body.includes(BLUEHOST_LINK)) {
    body += `\n\n---\n\n**Ready to launch your website?** [Get started with Bluehost](${BLUEHOST_LINK}) — reliable WordPress hosting starting at $2.95/month with a free domain and SSL.\n`;
  }

  state.postedTopics.push(topic);
  state.articleIndex++;
  state.totalPosted++;

  return { title: topic, body, tags };
}

function generateFallbackArticle(topic) {
  let body = `Setting up a website doesn't have to be complicated or expensive. Whether you're launching a blog, portfolio, or business site, the right hosting makes all the difference.\n\n`;
  body += `## Why Hosting Matters\n\n`;
  body += `Your hosting provider affects everything — site speed, uptime, security, and SEO. A slow site loses visitors. An unreliable host loses customers.\n\n`;
  body += `[Bluehost](${BLUEHOST_LINK}) has been a top WordPress hosting provider for over a decade, officially recommended by WordPress.org. Plans start at $2.95/month and include a free domain, free SSL, and one-click WordPress installation.\n\n`;
  body += `## Getting Started\n\n`;
  body += `1. **Pick a plan** — Basic is fine for a single site, Choice Plus for unlimited sites\n`;
  body += `2. **Register your domain** — included free for the first year\n`;
  body += `3. **Install WordPress** — one-click from the dashboard\n`;
  body += `4. **Pick a theme** — thousands of free options available\n`;
  body += `5. **Install essential plugins** — SEO, caching, security\n\n`;
  body += `## What You Get\n\n`;
  body += `- **Free domain** for the first year\n`;
  body += `- **Free SSL certificate** for secure HTTPS\n`;
  body += `- **50GB SSD storage** on the Basic plan\n`;
  body += `- **24/7 support** via phone, chat, and email\n`;
  body += `- **99.9% uptime guarantee**\n`;
  body += `- **30-day money-back guarantee**\n\n`;
  body += `## Performance Tips\n\n`;
  body += `Once your site is live, install a caching plugin like WP Super Cache or W3 Total Cache. Enable GZIP compression and optimize your images. These tweaks can cut load times in half.\n\n`;
  body += `---\n\n**Ready to get started?** [Launch your site with Bluehost](${BLUEHOST_LINK}) — trusted by millions, starting at $2.95/month.\n`;
  return body;
}

// ─── Dev.to publishing ────────────────────────────────────────────────────────

async function publishArticle(title, body, tags) {
  const article = {
    article: {
      title,
      body_markdown: body,
      published: true,
      tags,
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
        'User-Agent': 'BluehostPoster/1.0',
        'Content-Length': Buffer.byteLength(postData),
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (!DEVTO_API_KEY && !dryRun) {
    console.error('Set DEVTO_BLUEHOST_KEY environment variable');
    process.exit(1);
  }
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || POSTS_PER_RUN;

  console.log(`\n=== Bluehost Web Hosting Poster ===`);
  console.log(`Topics available: ${TOPICS.length}`);
  console.log(`Posts to create: ${count}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const state = loadState();

  for (let i = 0; i < count; i++) {
    console.log(`\n--- Article ${i + 1}/${count} ---`);

    const article = await generateArticle(state);
    console.log(`Title: ${article.title}`);
    console.log(`Tags: ${article.tags.join(', ')}`);

    if (dryRun) {
      console.log(`\n--- Preview ---\n${article.body.substring(0, 500)}...\n--- End Preview ---`);
    } else {
      const res = await publishArticle(article.title, article.body, article.tags);
      if (res.status === 201) {
        console.log(`Published: ${res.data.url}`);
      } else {
        console.error(`Failed (${res.status}): ${JSON.stringify(res.data).substring(0, 200)}`);
      }
    }

    saveState(state);
    if (i < count - 1) {
      console.log(`Waiting ${DELAY_BETWEEN_POSTS / 1000}s before next post...`);
      await sleep(DELAY_BETWEEN_POSTS);
    }
  }

  console.log(`\nDone. Total posted all-time: ${state.totalPosted}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
