const fs = require('fs');
const path = require('path');

const categoriesDir = path.join(__dirname, 'categories');
const directoryDir = path.join(__dirname, 'directory');
const postsDir = path.join(__dirname, '_posts');

const categoryMeta = {
  'agents': { emoji: '🧠', title: 'Agents', apiCat: 'AGENTS', desc: 'Autonomous AI agents for research, data collection, content creation, and complex multi-step automation tasks.' },
  'ai': { emoji: '🤖', title: 'AI', apiCat: 'AI', desc: 'AI-powered scrapers, content generators, data processors, and intelligent automation tools.' },
  'automation': { emoji: '⚡', title: 'Automation', apiCat: 'AUTOMATION', desc: 'Browser automation, workflow builders, form fillers, scheduled tasks, and no-code automation tools.' },
  'developer-tools': { emoji: '🔧', title: 'Developer Tools', apiCat: 'DEVELOPER_TOOLS', desc: 'Web crawlers, HTML parsers, proxy managers, API testers, and utilities for building scrapers.' },
  'e-commerce': { emoji: '🛒', title: 'E-Commerce', apiCat: 'ECOMMERCE', desc: 'Price monitoring, product scraping, and review extraction for Amazon, eBay, Walmart, Shopify, and more.' },
  'integrations': { emoji: '🔗', title: 'Integrations', apiCat: 'INTEGRATIONS', desc: 'Connect scrapers to Google Sheets, Slack, Zapier, webhooks, databases, and other services.' },
  'jobs': { emoji: '💼', title: 'Jobs', apiCat: 'JOBS', desc: 'Scrape job boards like LinkedIn Jobs, Indeed, Glassdoor. Extract listings, salaries, and company info.' },
  'lead-generation': { emoji: '🎯', title: 'Lead Generation', apiCat: 'LEAD_GENERATION', desc: 'Extract emails, phone numbers, and company data from Google Maps, LinkedIn, Yellow Pages, and directories.' },
  'mcp-servers': { emoji: '🔌', title: 'MCP Servers', apiCat: 'MCP_SERVERS', desc: 'Model Context Protocol servers for connecting AI agents to real-world data and services.' },
  'news': { emoji: '📰', title: 'News', apiCat: 'NEWS', desc: 'Monitor news sites, RSS feeds, press releases. Track mentions, trending topics, and breaking stories.' },
  'open-source': { emoji: '🌐', title: 'Open Source', apiCat: 'OPEN_SOURCE', desc: 'Community-built open source scrapers, crawlers, and automation tools.' },
  'other': { emoji: '📦', title: 'Other', apiCat: 'OTHER', desc: 'Uncategorized tools — niche scrapers, utilities, and experiments.' },
  'real-estate': { emoji: '🏠', title: 'Real Estate', apiCat: 'REAL_ESTATE', desc: 'Monitor Zillow, Realtor.com, Redfin. Track listings, price changes, and market data.' },
  'seo-tools': { emoji: '📊', title: 'SEO Tools', apiCat: 'SEO_TOOLS', desc: 'SERP scrapers, rank trackers, site auditors, backlink monitors, and keyword research tools.' },
  'social-media': { emoji: '📱', title: 'Social Media', apiCat: 'SOCIAL_MEDIA', desc: 'Scrape Instagram, TikTok, Facebook, Twitter/X, LinkedIn, YouTube — posts, profiles, followers, comments.' },
  'travel': { emoji: '✈️', title: 'Travel', apiCat: 'TRAVEL', desc: 'Scrape Booking.com, Airbnb, TripAdvisor, Google Flights. Compare prices and track availability.' },
  'videos': { emoji: '🎬', title: 'Videos', apiCat: 'VIDEOS', desc: 'YouTube, Vimeo, TikTok video scrapers, downloaders, and metadata extractors.' },
  'uncategorized': { emoji: '❓', title: 'Uncategorized', apiCat: '', desc: 'Tools not yet assigned to a category.' }
};

// Generate directory pages
for (const file of fs.readdirSync(categoriesDir)) {
  if (!file.endsWith('.md')) continue;
  const slug = file.replace('.md', '');
  const meta = categoryMeta[slug];
  if (!meta) continue;

  const content = fs.readFileSync(path.join(categoriesDir, file), 'utf-8');

  // Extract actor count from first lines
  const countMatch = content.match(/\*(\d[\d,]+)\s+actors?\*/i);
  const count = countMatch ? countMatch[1] : '?';

  // Extract table rows (top 50 only for the page)
  const lines = content.split('\n');
  const tableStart = lines.findIndex(l => l.startsWith('| # |'));
  let tableLines = [];
  if (tableStart >= 0) {
    tableLines.push(lines[tableStart]);     // header
    tableLines.push(lines[tableStart + 1]); // separator
    for (let i = tableStart + 2; i < lines.length && i < tableStart + 52; i++) {
      if (!lines[i].startsWith('|')) break;
      tableLines.push(lines[i]);
    }
  }

  const dirSlug = slug === 'e-commerce' ? 'ecommerce' : slug;
  const pageDir = path.join(directoryDir, dirSlug);
  if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });

  const page = `---
layout: default
title: "${meta.emoji} ${meta.title} — Top Tools & APIs"
description: "${meta.desc}"
permalink: /directory/${dirSlug}/
---

# ${meta.emoji} ${meta.title}

**${count} tools available** — ${meta.desc}

<div style="margin:24px 0;">
  <a href="https://apify.com/store?category=${meta.apiCat}&fpr=97nrp4" class="cta-btn">Browse All on Apify →</a>
</div>

## Top Tools

${tableLines.join('\n')}

<div style="margin:32px 0;text-align:center;">
  <p style="color:var(--text-muted);margin-bottom:12px;">See all ${count} tools in this category</p>
  <a href="https://apify.com/store?category=${meta.apiCat}&fpr=97nrp4" class="cta-btn">View Full List on Apify →</a>
</div>

<p><a href="{{ '/directory/' | relative_url }}">← Back to all categories</a></p>
`;

  fs.writeFileSync(path.join(pageDir, 'index.md'), page);
  console.log(`Created directory/${dirSlug}/index.md (${count} actors)`);
}

// Generate seed blog posts
const posts = [
  {
    date: '2026-06-25',
    slug: 'best-instagram-scrapers-2026',
    title: 'The 10 Best Instagram Scrapers in 2026',
    tags: ['social-media', 'instagram', 'scraping'],
    body: `Looking for the best way to scrape Instagram data? Whether you need to extract posts, profiles, hashtags, comments, or Reels, these are the top-rated Instagram scrapers available right now.

## Why Scrape Instagram?

Marketers, researchers, and developers scrape Instagram for competitor analysis, influencer discovery, hashtag tracking, and content research. The tools below handle all of this without coding.

## Top 10 Instagram Scrapers

### 1. Instagram Scraper by Apify
**312K users** | Rating: 4.8/5

The most popular Instagram scraper. Extracts posts, profiles, hashtags, locations, and comments in one tool. Handles rate limits automatically and outputs clean JSON/CSV.

[Try Instagram Scraper →](https://apify.com/apify/instagram-scraper?fpr=97nrp4)

### 2. Instagram Profile Scraper
**161K users** | Rating: 4.7/5

Focused on profile data — followers, following, bio, posts, story highlights. Great for influencer research and competitor monitoring.

[Try Profile Scraper →](https://apify.com/apify/instagram-profile-scraper?fpr=97nrp4)

### 3. Instagram Reel Scraper
**114K users** | Rating: 4.5/5

Dedicated Reels extractor. Pulls video URLs, view counts, likes, comments, and audio info from any public profile or hashtag.

[Try Reel Scraper →](https://apify.com/apify/instagram-reel-scraper?fpr=97nrp4)

### 4. Instagram Post Scraper
**105K users** | Rating: 4.4/5

Extract individual post data — captions, likes, comments, tagged users, location, and media URLs.

[Try Post Scraper →](https://apify.com/apify/instagram-post-scraper?fpr=97nrp4)

### 5. Instagram Hashtag Scraper
**67K users** | Rating: 3.6/5

Find all posts under any hashtag. Track trending hashtags, monitor branded tags, or research content niches.

[Try Hashtag Scraper →](https://apify.com/apify/instagram-hashtag-scraper?fpr=97nrp4)

### 6. Instagram Comments Scraper
**41K users** | Rating: 4.6/5

Extract all comments from any public post. Great for sentiment analysis, engagement tracking, and audience research.

[Try Comments Scraper →](https://apify.com/apify/instagram-comment-scraper?fpr=97nrp4)

### 7. Contact Details Scraper
**53K users** | Rating: 4.6/5

Goes beyond Instagram — extracts emails and phone numbers from any website or social profile. Works on Instagram bios too.

[Try Contact Scraper →](https://apify.com/vdrmota/contact-info-scraper?fpr=97nrp4)

### 8. Instagram Story Downloader
Pull stories from any public account before they disappear. Save media and metadata for analysis.

[Browse Instagram Tools →](https://apify.com/store?category=SOCIAL_MEDIA&fpr=97nrp4)

### 9. Instagram Follower Scraper
Extract follower and following lists from public profiles. Use for influencer overlap analysis and audience segmentation.

[Browse Instagram Tools →](https://apify.com/store?category=SOCIAL_MEDIA&fpr=97nrp4)

### 10. Instagram Location Scraper
Find all posts tagged at a specific location. Useful for local business marketing and event monitoring.

[Browse Instagram Tools →](https://apify.com/store?category=SOCIAL_MEDIA&fpr=97nrp4)

## Getting Started

All of these tools run in the cloud on [Apify](https://www.apify.com/?fpr=97nrp4). No coding needed — just enter a profile URL or hashtag and hit Run. New accounts get **$5 in free credits**, which is enough to run hundreds of scrapes.

[Create Free Account →](https://www.apify.com/?fpr=97nrp4)`
  },
  {
    date: '2026-06-26',
    slug: 'google-maps-lead-generation-guide',
    title: 'How to Generate Leads from Google Maps (Automated)',
    tags: ['lead-generation', 'google-maps', 'automation'],
    body: `Google Maps is one of the richest sources of business data on the internet. With the right scraping tools, you can extract thousands of leads — complete with names, addresses, phone numbers, websites, and reviews — in minutes.

## What Data Can You Get?

A Google Maps scraper typically extracts:
- **Business name** and category
- **Address** and coordinates
- **Phone number** and website
- **Star rating** and review count
- **Opening hours**
- **Photos** and Google profile URL

## Best Google Maps Scrapers

### Google Maps Scraper by Compass
**230K+ users** | One of the most popular Apify tools overall.

Enter a search query (e.g., "plumbers in Chicago") and get a full spreadsheet of businesses with all their details. Supports geographic filtering, multiple queries, and exports to CSV/JSON/Excel.

[Try Google Maps Scraper →](https://apify.com/compass/crawler-google-places?fpr=97nrp4)

### Google Maps Reviews Scraper
Extract reviews from any business on Google Maps. Great for sentiment analysis, competitive research, and reputation monitoring.

[Browse Lead Gen Tools →](https://apify.com/store?category=LEAD_GENERATION&fpr=97nrp4)

### Google Maps Email Extractor
Combines Maps data with website scraping to find email addresses for every business. Perfect for outreach campaigns.

[Browse Lead Gen Tools →](https://apify.com/store?category=LEAD_GENERATION&fpr=97nrp4)

## How to Use It

1. [Sign up for Apify](https://www.apify.com/?fpr=97nrp4) (free, $5 credit included)
2. Search for "Google Maps Scraper" in the Apify Store
3. Enter your search query and location
4. Click Run and download your results as CSV

## Tips for Better Results

- **Be specific with queries** — "Italian restaurants in Manhattan" beats "restaurants"
- **Use geographic bounds** to focus on your target area
- **Set a result limit** to control costs on large searches
- **Schedule recurring runs** to catch new businesses as they appear

[Start Scraping Google Maps →](https://www.apify.com/?fpr=97nrp4)`
  },
  {
    date: '2026-06-27',
    slug: 'tiktok-vs-instagram-scrapers-compared',
    title: 'TikTok vs Instagram Scrapers — Which Tools Are Best?',
    tags: ['social-media', 'comparison', 'tiktok', 'instagram'],
    body: `Both TikTok and Instagram are goldmines for marketers, but scraping them requires different tools. Here's a side-by-side comparison of the best scrapers for each platform.

## TikTok Scrapers

### TikTok Scraper by Clockworks
**207K users** | Rating: 4.8/5

The go-to TikTok scraper. Extracts videos, captions, likes, shares, comments, and music from any profile, hashtag, or trending page.

[Try TikTok Scraper →](https://apify.com/clockworks/tiktok-scraper?fpr=97nrp4)

### TikTok Data Extractor
**51K users** | Rating: 4.7/5

A free alternative that extracts similar data with a simpler interface. Good for smaller-scale projects.

[Try Data Extractor →](https://apify.com/clockworks/free-tiktok-scraper?fpr=97nrp4)

### TikTok Comments Scraper
**34K users** | Rating: 4.8/5

Dedicated comment extraction. Pull every comment from any TikTok video for sentiment analysis.

[Try Comments Scraper →](https://apify.com/clockworks/tiktok-comments-scraper?fpr=97nrp4)

## Instagram Scrapers

### Instagram Scraper by Apify
**312K users** | Rating: 4.8/5

The most-used Instagram tool. Handles posts, profiles, hashtags, and comments in a single scraper.

[Try Instagram Scraper →](https://apify.com/apify/instagram-scraper?fpr=97nrp4)

### Instagram Profile Scraper
**161K users** | Rating: 4.7/5

Focused profile data extraction — ideal for influencer research.

[Try Profile Scraper →](https://apify.com/apify/instagram-profile-scraper?fpr=97nrp4)

## Head-to-Head Comparison

| Feature | TikTok Scraper | Instagram Scraper |
|---------|---------------|-------------------|
| Users | 207K | 312K |
| Rating | 4.8 | 4.8 |
| Video data | Yes | Yes (Reels) |
| Profile data | Yes | Yes |
| Comments | Separate tool | Separate tool |
| Hashtag tracking | Yes | Yes |
| Stories | N/A | Separate tool |
| Free tier | Yes | Yes |

## Which Should You Choose?

**For TikTok:** Start with TikTok Scraper by Clockworks — it's the most complete option.

**For Instagram:** Start with Instagram Scraper by Apify — it covers the most ground in one tool.

**For both:** All these tools run on the same platform, so you can use them all from one account. New accounts get **$5 free** to test everything.

[Get Started Free →](https://www.apify.com/?fpr=97nrp4)`
  },
  {
    date: '2026-06-28',
    slug: 'web-scraping-without-coding-beginners-guide',
    title: 'Web Scraping Without Coding — A Beginner\'s Guide',
    tags: ['guide', 'web-scraping', 'no-code'],
    body: `You don't need to write a single line of code to scrape data from the web. Modern scraping platforms offer ready-to-use tools that handle everything — you just point them at a URL and get structured data back.

## What Is Web Scraping?

Web scraping is the automated extraction of data from websites. Instead of manually copying information from web pages, a scraper visits the page programmatically and pulls out the data you need.

## Common Use Cases

- **Price monitoring** — Track competitor prices on Amazon, eBay, or any retailer
- **Lead generation** — Extract business contact info from Google Maps or LinkedIn
- **Market research** — Collect reviews, ratings, and product data at scale
- **Social media analytics** — Track posts, followers, engagement across platforms
- **Job monitoring** — Aggregate listings from multiple job boards
- **Real estate** — Monitor new listings and price changes on Zillow, Redfin

## How No-Code Scraping Works

1. **Pick a tool** — Browse the [Apify Store](https://apify.com/store?fpr=97nrp4) and find a scraper for your target website
2. **Configure** — Enter the URL, search query, or other parameters
3. **Run** — Click Start and wait (usually seconds to minutes)
4. **Download** — Export results as CSV, JSON, Excel, or push to Google Sheets

That's it. No Python, no JavaScript, no browser extensions, no proxies to manage.

## Best Platforms for No-Code Scraping

### Apify
The largest marketplace of ready-to-use scrapers. Over 26,000 tools covering social media, e-commerce, lead generation, SEO, and more. Every tool runs in the cloud with scheduling, API access, and integrations.

[Explore Apify Store →](https://apify.com/store?fpr=97nrp4)

## Getting Started

The fastest path:

1. [Create a free Apify account](https://www.apify.com/?fpr=97nrp4) — you get $5 in credits
2. Search the Store for your target website
3. Run the scraper with default settings
4. Download your data

Most scrapers cost fractions of a cent per result, so $5 goes a long way for testing.

## Tips for Beginners

- **Start small** — Test with 10-50 results before running large jobs
- **Check the output format** — Most tools let you preview the data structure before running
- **Use scheduling** — Set scrapers to run daily/weekly for ongoing monitoring
- **Read the docs** — Each tool has a README explaining all the options

[Start Scraping Free →](https://www.apify.com/?fpr=97nrp4)`
  },
  {
    date: '2026-06-29',
    slug: 'best-amazon-price-trackers-scrapers',
    title: '5 Best Amazon Price Trackers & Scrapers (2026)',
    tags: ['ecommerce', 'amazon', 'price-monitoring'],
    body: `Want to monitor Amazon prices, track product data, or scrape reviews at scale? These are the best Amazon scrapers available right now — all run in the cloud with no coding needed.

## 1. Amazon Product Scraper
The most comprehensive Amazon scraper. Extracts product titles, prices, ratings, review counts, images, variants, and seller info from any Amazon URL or search query.

[Try Amazon Scraper →](https://apify.com/store?category=ECOMMERCE&fpr=97nrp4)

## 2. Amazon ASIN Scraper
Input a list of ASINs and get back all product details. Perfect for bulk monitoring of your own or competitor products.

[Browse E-Commerce Tools →](https://apify.com/store?category=ECOMMERCE&fpr=97nrp4)

## 3. Amazon Review Scraper
Extract all reviews for any product — text, star rating, verified purchase status, reviewer info. Great for sentiment analysis and product research.

[Browse E-Commerce Tools →](https://apify.com/store?category=ECOMMERCE&fpr=97nrp4)

## 4. Amazon Price Tracker
Schedule daily runs to track price changes over time. Get alerts when prices drop below your target. Export historical price data for analysis.

[Browse E-Commerce Tools →](https://apify.com/store?category=ECOMMERCE&fpr=97nrp4)

## 5. Amazon Search Scraper
Scrape Amazon search results for any query. Get all products on the first N pages with prices, ratings, and rankings. Monitor how your products rank for specific keywords.

[Browse E-Commerce Tools →](https://apify.com/store?category=ECOMMERCE&fpr=97nrp4)

## How to Set Up Price Tracking

1. [Create an Apify account](https://www.apify.com/?fpr=97nrp4) (free, includes $5 credit)
2. Find the Amazon scraper that fits your needs
3. Enter the product URLs or search queries to monitor
4. Schedule the scraper to run daily
5. Connect to Google Sheets or email for automatic reports

## Why Cloud Scraping Beats Browser Extensions

- **Runs 24/7** without your computer being on
- **Handles anti-bot measures** with built-in proxy rotation
- **Scales** to thousands of products
- **API access** to build into your own workflows
- **Historical data** stored automatically

[Start Tracking Prices →](https://www.apify.com/?fpr=97nrp4)`
  }
];

for (const post of posts) {
  const filename = `${post.date}-${post.slug}.md`;
  const content = `---
layout: post
title: "${post.title}"
date: ${post.date}
tags: [${post.tags.map(t => `"${t}"`).join(', ')}]
description: "${post.title} — find the best tools on Apify."
---

${post.body}
`;
  fs.writeFileSync(path.join(postsDir, filename), content);
  console.log(`Created _posts/${filename}`);
}

console.log('\nDone! Generated directory pages and blog posts.');
