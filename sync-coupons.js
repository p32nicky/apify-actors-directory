const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const COUPONS_FILE = path.join(__dirname, 'hostinger-coupons.json');
const SOURCES = [
  'https://www.dontpayfull.com/at/hostinger.com',
  'https://www.hotdeals.com/coupons/hostinger/',
  'https://www.promocodes.com/hostinger-coupons',
];

function fetch(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return fetch(loc, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

const BLACKLIST = new Set([
  'HOSTINGER', 'COUPON', 'PROMO', 'CODES', 'CODE', 'DEALS', 'DEAL', 'OFFER',
  'OFFERS', 'SAVE', 'SALE', 'HOSTING', 'SHOP', 'CLICK', 'HERE', 'TERMS',
  'VERIFIED', 'EXPIRED', 'EXPIRES', 'STOREWIDE', 'SITEWIDE', 'ORDERS',
  'CHECKOUT', 'DISCOUNT', 'DISCOUNTS', 'FREE', 'TODAY', 'LIMITED', 'SELECT',
  'HTTPS', 'HTTP', 'TRUE', 'FALSE', 'NULL', 'UNDEFINED', 'DOCTYPE',
  'PREMIUM', 'BUSINESS', 'STARTER', 'MONTHS', 'MONTH', 'YEARLY', 'PLANS',
  'JSON', 'SCHEMA', 'TYPE', 'PRODUCT', 'ORGANIZATION', 'WEBSITE', 'THING',
  'LISTITEM', 'ITEMLIST', 'BREADCRUMB', 'WEBAPPLICATION', 'SOFTWAREAPP',
]);

function isValidCode(code) {
  if (!code || code.length < 4 || code.length > 25) return false;
  if (BLACKLIST.has(code)) return false;
  if (/^\d+$/.test(code)) return false;
  if (!/[A-Z]/.test(code)) return false;
  if (/^[A-Z]{1,2}\d{0,1}$/.test(code)) return false;
  return /^[A-Z0-9][A-Z0-9\-_]{3,24}$/.test(code);
}

function extractCoupons(html, source) {
  const coupons = new Map();

  // 1. JSON-LD: look for Offer nodes with codes in description
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = [];
      (function walk(n) {
        if (Array.isArray(n)) n.forEach(walk);
        else if (n && typeof n === 'object') { nodes.push(n); Object.values(n).forEach(walk); }
      })(data);
      for (const node of nodes) {
        let code = '';
        let title = node.name || '';
        if (node.discountCode) {
          code = String(node.discountCode).trim().toUpperCase();
        } else if (node['@type'] === 'Offer' && node.description) {
          const cm = node.description.match(/"([A-Z0-9][A-Z0-9\-_]{3,24})"/);
          if (cm) code = cm[1];
          title = title || node.description.substring(0, 80);
        } else if (node.couponCode) {
          code = String(node.couponCode).trim().toUpperCase();
          title = node.headline || node.description || title;
        }
        if (code && isValidCode(code) && !coupons.has(code)) {
          coupons.set(code, { code, title: title.substring(0, 120), source });
        }
      }
    } catch {}
  }

  // 2. data-code attributes
  const dataCodeRegex = /data-code=["']([^"']+)["']/gi;
  while ((m = dataCodeRegex.exec(html)) !== null) {
    const code = m[1].trim().toUpperCase();
    if (isValidCode(code) && !coupons.has(code)) {
      const titleMatch = html.substring(m.index, m.index + 500).match(/class="[^"]*(?:title|heading)[^"]*"[^>]*>([^<]+)/i);
      coupons.set(code, { code, title: titleMatch ? titleMatch[1].trim() : '', source });
    }
  }

  // 3. "couponCode" in inline JSON
  const couponCodeRegex = /"couponCode"\s*:\s*"([^"]+)"/gi;
  while ((m = couponCodeRegex.exec(html)) !== null) {
    const code = m[1].trim().toUpperCase();
    if (isValidCode(code) && !coupons.has(code)) {
      const ctx = html.substring(Math.max(0, m.index - 200), m.index + 200);
      const titleMatch = ctx.match(/"(?:headline|description|name)"\s*:\s*"([^"]+)"/i);
      coupons.set(code, { code, title: titleMatch ? titleMatch[1].substring(0, 120) : '', source });
    }
  }

  // 4. Quoted codes near "code" keywords
  const codeNearbyRegex = /(?:code|coupon|promo)[^<]{0,30}["']([A-Z0-9][A-Z0-9\-_]{3,24})["']/gi;
  while ((m = codeNearbyRegex.exec(html)) !== null) {
    const code = m[1].toUpperCase();
    if (isValidCode(code) && !coupons.has(code)) {
      coupons.set(code, { code, title: '', source });
    }
  }

  return Array.from(coupons.values());
}

async function main() {
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(COUPONS_FILE, 'utf-8')); } catch {}

  const now = new Date().toISOString();
  let newCount = 0;

  for (const url of SOURCES) {
    try {
      console.log(`Fetching ${url}...`);
      const html = await fetch(url);
      const source = new URL(url).hostname;
      const coupons = extractCoupons(html, source);
      console.log(`Found ${coupons.length} codes from ${source}`);

      for (const c of coupons) {
        if (existing[c.code]) {
          existing[c.code].last_seen = now;
          if (c.title && !existing[c.code].title) existing[c.code].title = c.title;
        } else {
          existing[c.code] = {
            first_seen: now,
            last_seen: now,
            title: c.title,
            source: c.source,
          };
          newCount++;
        }
      }
    } catch (err) {
      console.log(`Failed: ${url} - ${err.message}`);
    }
  }

  fs.writeFileSync(COUPONS_FILE, JSON.stringify(existing, null, 2));
  console.log(`Saved ${Object.keys(existing).length} total coupons (${newCount} new)`);
}

main().catch(console.error);
