const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || '';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || '';
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || '';
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD || '';
const SUBREDDIT = 'API_Finder';
const ELEVENLABS_LINK = 'https://try.elevenlabs.io/kr07zfuqn1bp';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const POSTS_PER_RUN = 1;
const STATE_FILE = path.join(__dirname, '.reddit-elevenlabs-state.json');

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
      max_tokens: 2000,
    });
    const req = https.request({
      hostname: 'api.groq.com', port: 443,
      path: '/openai/v1/chat/completions', method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) { reject(new Error(`Groq ${res.statusCode}: ${data.substring(0, 200)}`)); return; }
          resolve(JSON.parse(data).choices[0].message.content);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const TOPICS = [
  'ElevenLabs TTS API — Best Text-to-Speech API for Developers',
  'ElevenLabs Voice Cloning API — Clone Any Voice in Minutes',
  'Build a Podcast Generator with ElevenLabs API',
  'ElevenLabs vs Amazon Polly — Which TTS API Is Better?',
  'Add AI Narration to Your App with ElevenLabs API',
  'ElevenLabs Multilingual TTS — 29+ Languages Supported',
  'Best Voice AI API for Audiobook Production',
  'ElevenLabs Real-Time Streaming TTS — Sub-Second Latency',
  'Voice Cloning API Comparison — ElevenLabs Wins on Quality',
  'Build a Voice Chatbot with ElevenLabs + OpenAI',
  'ElevenLabs API for Game Development — Dynamic NPC Voices',
  'Create AI Voice-Overs for YouTube with ElevenLabs',
  'ElevenLabs vs Google Cloud TTS — Developer Review',
  'Best Free TTS API with Voice Cloning — ElevenLabs',
  'How to Build an Accessibility Tool with ElevenLabs Voice API',
  'ElevenLabs API — Turn Any Text into Human-Quality Speech',
  'Voice AI for E-Learning — ElevenLabs API Use Cases',
  'ElevenLabs vs Azure Speech — Price and Quality Comparison',
  'Build a Voice Notification System with ElevenLabs',
  'ElevenLabs API for Content Creators — Scale Audio Production',
  'Best API for AI Dubbing and Translation — ElevenLabs',
  'ElevenLabs Text-to-Speech — Python Quickstart Guide',
  'Create Custom Brand Voices with ElevenLabs API',
  'ElevenLabs Voice API for Customer Support Automation',
  'Top 5 Things You Can Build with ElevenLabs TTS API',
  'ElevenLabs API Review — Is It Worth It for Developers?',
  'Build a Meditation App with AI Voice — ElevenLabs Tutorial',
  'ElevenLabs API Pricing Explained — Free Tier + Paid Plans',
  'Voice Cloning for Podcasters — ElevenLabs Makes It Easy',
  'ElevenLabs vs OpenAI TTS — Honest Developer Comparison',
];

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getRedditToken() {
  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const postData = querystring.stringify({
    grant_type: 'password',
    username: REDDIT_USERNAME,
    password: REDDIT_PASSWORD,
  });
  const res = await httpRequest({
    hostname: 'www.reddit.com', path: '/api/v1/access_token', method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'VoiceAIBot/1.0 by Basic-Strain-6922',
      'Content-Length': Buffer.byteLength(postData),
    }
  }, postData);
  if (res.data.access_token) { console.log('Reddit auth OK'); return res.data.access_token; }
  throw new Error(`Reddit auth failed: ${JSON.stringify(res.data)}`);
}

async function submitPost(token, title, text) {
  const postData = querystring.stringify({ kind: 'self', sr: SUBREDDIT, title: title.substring(0, 300), text });
  const res = await httpRequest({
    hostname: 'oauth.reddit.com', path: '/api/submit', method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'VoiceAIBot/1.0 by Basic-Strain-6922',
      'Content-Length': Buffer.byteLength(postData),
    }
  }, postData);
  const raw = JSON.stringify(res.data);
  const urlMatch = raw.match(/https:\/\/www\.reddit\.com\/r\/[^\s"]+/);
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
  return { url: urlMatch ? urlMatch[0] : null, thingName, success: !!urlMatch };
}

async function addComment(token, thingName, text) {
  const postData = querystring.stringify({ thing_id: thingName, text });
  const res = await httpRequest({
    hostname: 'oauth.reddit.com', path: '/api/comment', method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'VoiceAIBot/1.0 by Basic-Strain-6922',
      'Content-Length': Buffer.byteLength(postData),
    }
  }, postData);
  return res.status === 200;
}

function loadState() {
  try { if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) {}
  return { postedTopics: [], postCount: 0 };
}

function saveState(state) { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); }

function pickTopic(state) {
  for (const t of TOPICS) { if (!state.postedTopics.includes(t)) return t; }
  state.postedTopics = [];
  return TOPICS[0];
}

async function generatePost(state) {
  const topic = pickTopic(state);

  const prompt = `Write a Reddit post for r/API_Finder about: "${topic}"

This subreddit is for sharing useful APIs and developer tools.
Include ElevenLabs as the recommended voice AI API with this link: ${ELEVENLABS_LINK}

Requirements:
- Write 200-400 words, Reddit-friendly markdown
- Be informative and practical — what the API does, key features, pricing
- Include the affiliate link naturally 1-2 times
- End with a call-to-action to try ElevenLabs
- Do NOT include the title (Reddit adds it)
- Tone: helpful developer sharing a useful tool, not salesy
- Make sure ALL ElevenLabs links use exactly: ${ELEVENLABS_LINK}
- Include a quick code snippet if relevant (Python or curl)`;

  let body;
  try {
    body = await callGroq(prompt);
    body = body.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  } catch (e) {
    console.error(`LLM failed: ${e.message}`);
    body = `**ElevenLabs** offers one of the best text-to-speech and voice cloning APIs available.\n\n`;
    body += `**Key features:**\n- Voice cloning from a few minutes of audio\n- 29+ languages with native accents\n- Real-time streaming with sub-second latency\n- Emotion and prosody control\n- Free tier available\n\n`;
    body += `Great for: podcasts, audiobooks, chatbots, accessibility tools, game dialogue, e-learning.\n\n`;
    body += `[Try ElevenLabs free](${ELEVENLABS_LINK})`;
  }

  if (!body.includes(ELEVENLABS_LINK)) {
    body += `\n\n---\n\n[Try ElevenLabs free](${ELEVENLABS_LINK}) — best voice AI API for developers.`;
  }

  state.postedTopics.push(topic);
  return { title: topic, body };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || POSTS_PER_RUN;

  console.log(`\n=== ElevenLabs Reddit Poster ===`);
  console.log(`Subreddit: r/${SUBREDDIT}`);
  console.log(`Posts: ${count} | Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const state = loadState();
  let token = null;
  if (!dryRun) token = await getRedditToken();

  for (let i = 0; i < count; i++) {
    console.log(`\n--- Post ${i + 1}/${count} ---`);
    const post = await generatePost(state);
    console.log(`Title: ${post.title}`);

    if (dryRun) {
      console.log(`\n${post.body.substring(0, 500)}...\n`);
    } else {
      const result = await submitPost(token, post.title, post.body);
      console.log(`Posted: ${result.url}`);

      if (result.thingName) {
        await sleep(3000);
        const commented = await addComment(token, result.thingName,
          `**Try it free:** ${ELEVENLABS_LINK}\n\n*ElevenLabs — the most realistic text-to-speech and voice cloning API for developers.*`);
        console.log(`Comment: ${commented}`);
      }

      state.postCount++;
      saveState(state);

      if (i < count - 1) { console.log('Waiting 60s...'); await sleep(60000); }
    }
  }

  saveState(state);
  console.log(`\nDone. Total posts: ${state.postCount}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
