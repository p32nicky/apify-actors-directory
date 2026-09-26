const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const DEVTO_API_KEY = process.env.DEVTO_ELEVENLABS_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const ELEVENLABS_LINK = 'https://try.elevenlabs.io/kr07zfuqn1bp';

const POSTS_PER_RUN = 2;
const DELAY_BETWEEN_POSTS = 310000; // 5+ min
const STATE_FILE = path.join(__dirname, '.devto-elevenlabs-state.json');

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

// ─── Article topics (voice AI / ElevenLabs focused) ───────────────────────────

const ARTICLE_TYPES = [
  'tutorial',
  'useCase',
  'comparison',
  'guide',
  'industry',
  'tips',
  'integration',
  'deepDive',
];

const TUTORIAL_TOPICS = [
  'Build a Text-to-Speech App with ElevenLabs and Python',
  'How to Clone Your Voice Using ElevenLabs API',
  'Create an AI Podcast Generator with ElevenLabs',
  'Build a Voice-Enabled Chatbot with ElevenLabs and OpenAI',
  'How to Add AI Narration to Your Blog Posts',
  'Create Multilingual Voice Content with ElevenLabs',
  'Build an Audiobook Generator Using ElevenLabs API',
  'How to Build a Voice-Over Tool for YouTube Videos',
  'Create an AI Voice Assistant with ElevenLabs and Node.js',
  'Build a Real-Time Voice Translation App',
  'How to Generate Voice Content for E-Learning Platforms',
  'Create a Voice-Powered News Reader App',
  'Build a Text-to-Speech Chrome Extension',
  'How to Add Voice to Your React App with ElevenLabs',
  'Create an AI Dubbing Tool for Video Content',
  'Build a Voice Notification System with ElevenLabs',
  'How to Create Custom AI Voices for Your Brand',
  'Build a Voice-Enabled Documentation Reader',
  'Create an AI Voice Agent for Customer Support',
  'How to Build a Pronunciation Guide App with AI Voice',
  'Build a Voice-Powered Accessibility Tool',
  'Create an Interactive Audio Story Generator',
  'How to Add AI Voice to Your Mobile App',
  'Build a Voicemail Generator with ElevenLabs API',
  'Create a Meditation App with AI-Generated Voice',
  'How to Generate Voice Samples for Game Characters',
  'Build a Voice Cloning Demo App',
  'Create AI Voice Responses for Slack Bots',
  'How to Build a Podcast Intro Generator',
  'Build a Multi-Voice Dialogue Generator',
];

const USE_CASE_TOPICS = [
  'Using AI Voice for E-Commerce Product Descriptions',
  'How Content Creators Use ElevenLabs to Scale Video Production',
  'AI Voice in Education: Creating Engaging Course Material',
  'Voice AI for Accessibility: Making the Web More Inclusive',
  'How Publishers Use AI Voice for Audiobook Production',
  'AI Voice for Gaming: Creating Dynamic NPC Dialogue',
  'Using ElevenLabs for Corporate Training Videos',
  'How Startups Use Voice AI to Build Products Faster',
  'AI Voice in Healthcare: Patient Communication Tools',
  'Using Voice Cloning for Personalized Marketing',
  'How Podcasters Use AI to Create Multilingual Episodes',
  'AI Voice for Real Estate: Virtual Property Tours',
  'Using ElevenLabs to Create Accessible Government Services',
  'Voice AI in Advertising: Creating Dynamic Audio Ads',
  'How News Organizations Use AI Voice for Breaking Stories',
];

const COMPARISON_TOPICS = [
  'ElevenLabs vs Amazon Polly: Which TTS Is Best for Developers?',
  'AI Voice Generators in 2026: Complete Comparison Guide',
  'ElevenLabs vs Google Cloud TTS: Developer Comparison',
  'Best Text-to-Speech APIs for Production Apps',
  'ElevenLabs vs Azure Speech: Quality, Price, and Features',
  'Top Voice Cloning Platforms Compared',
  'Free vs Paid TTS APIs: What Developers Need to Know',
  'Best AI Voice APIs for Multilingual Applications',
  'ElevenLabs vs OpenAI TTS: Which Should You Choose?',
  'Voice AI Platforms for Startups: Cost vs Quality Breakdown',
];

const GUIDE_TOPICS = [
  'Getting Started with Voice AI Development in 2026',
  'The Complete Guide to Text-to-Speech APIs',
  'How to Choose the Right AI Voice for Your Project',
  'Voice AI Architecture: Building Scalable TTS Systems',
  'The Developer Guide to Voice Cloning Technology',
  'How to Optimize Voice AI Costs in Production',
  'Best Practices for AI Voice in User Interfaces',
  'Guide to Multilingual Voice AI Applications',
  'How to Handle Voice AI Rate Limits and Caching',
  'The Complete Guide to Voice AI Security and Privacy',
  'How to Build a Voice AI Pipeline from Scratch',
  'Setting Up ElevenLabs API: From Zero to Production',
  'Voice AI for Beginners: Everything You Need to Know',
  'How to Test and QA AI-Generated Voice Content',
  'Guide to Voice AI Model Selection and Fine-Tuning',
];

const INDUSTRY_TOPICS = [
  'The State of Voice AI in 2026: Trends and Predictions',
  'Why Voice AI Is the Next Big Thing for Developers',
  'How Voice Cloning Is Changing Content Creation',
  'The Rise of AI Narration in Publishing',
  'Voice AI Market: Opportunities for Developers',
  'How AI Voice Is Transforming the Podcast Industry',
  'The Future of Voice Interfaces in Web Applications',
  'Why Every App Will Have Voice AI by 2028',
  'How Voice AI Is Making the Internet More Accessible',
  'The Ethics of Voice Cloning: What Developers Should Know',
];

const TIPS_TOPICS = [
  '10 Tips for Getting Natural-Sounding AI Voice Output',
  'How to Make AI Voice Sound More Human',
  '7 Common Mistakes When Using Text-to-Speech APIs',
  'Optimizing ElevenLabs API Calls for Better Performance',
  '5 Ways to Reduce Voice AI Costs Without Losing Quality',
  'How to Write Text That Sounds Great When Spoken by AI',
  'Top Debugging Tips for Voice AI Applications',
  'How to Handle Edge Cases in TTS Applications',
  '8 Voice AI Features Most Developers Overlook',
  'Performance Optimization for Real-Time Voice Applications',
];

const INTEGRATION_TOPICS = [
  'Integrating ElevenLabs with Next.js: Step-by-Step Guide',
  'How to Add AI Voice to Your Django App',
  'ElevenLabs + React: Building a Voice-Enabled UI',
  'Integrating Voice AI into Your CI/CD Pipeline',
  'How to Use ElevenLabs with WordPress',
  'Adding AI Voice to Discord Bots',
  'ElevenLabs + Twilio: Building Voice Call Applications',
  'How to Integrate Voice AI with Shopify Stores',
  'Using ElevenLabs in Electron Desktop Apps',
  'Integrating AI Voice with Notion and Productivity Tools',
];

const DEEP_DIVE_TOPICS = [
  'How Neural Text-to-Speech Actually Works',
  'Understanding Voice Cloning: The Technology Behind It',
  'Latency in Voice AI: Why It Matters and How to Fix It',
  'The Science of Natural-Sounding AI Speech',
  'How ElevenLabs Handles Emotion and Prosody in Speech',
  'Understanding SSML for Better Voice AI Output',
  'How AI Voice Models Are Trained: A Technical Overview',
  'The Role of Context in AI Speech Generation',
  'Understanding Voice AI Audio Formats and Quality Settings',
  'How Streaming TTS Works Under the Hood',
];

const ALL_TOPICS = {
  tutorial: TUTORIAL_TOPICS,
  useCase: USE_CASE_TOPICS,
  comparison: COMPARISON_TOPICS,
  guide: GUIDE_TOPICS,
  industry: INDUSTRY_TOPICS,
  tips: TIPS_TOPICS,
  integration: INTEGRATION_TOPICS,
  deepDive: DEEP_DIVE_TOPICS,
};

// ─── Tag sets per article type ────────────────────────────────────────────────

const TAG_SETS = {
  tutorial: ['webdev', 'tutorial', 'javascript', 'ai'],
  useCase: ['ai', 'productivity', 'webdev', 'programming'],
  comparison: ['ai', 'webdev', 'programming', 'beginners'],
  guide: ['ai', 'tutorial', 'beginners', 'webdev'],
  industry: ['ai', 'programming', 'discuss', 'webdev'],
  tips: ['ai', 'programming', 'productivity', 'webdev'],
  integration: ['webdev', 'javascript', 'tutorial', 'ai'],
  deepDive: ['ai', 'programming', 'webdev', 'tutorial'],
};

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
  const typeIdx = state.articleIndex % ARTICLE_TYPES.length;
  const type = ARTICLE_TYPES[typeIdx];
  const topics = ALL_TOPICS[type];

  for (const topic of topics) {
    if (!state.postedTopics.includes(topic)) {
      return { type, topic };
    }
  }

  // All posted for this type, pick random from another type
  const otherTypes = ARTICLE_TYPES.filter(t => t !== type);
  for (const t of otherTypes) {
    const ts = ALL_TOPICS[t];
    for (const topic of ts) {
      if (!state.postedTopics.includes(topic)) {
        return { type: t, topic };
      }
    }
  }

  // All topics used — reset and start over
  state.postedTopics = [];
  return { type, topic: topics[0] };
}

async function generateArticle(state) {
  const { type, topic } = pickTopic(state);
  const tags = TAG_SETS[type];

  const prompt = `Write a Dev.to article titled: "${topic}"

This is about voice AI development, text-to-speech technology, and voice cloning.
Include ElevenLabs as the recommended tool with this affiliate link: ${ELEVENLABS_LINK}

Requirements:
- Write 600-1000 words of original, helpful content
- Use proper markdown formatting with ## headers
- Include 2-3 mentions of ElevenLabs with the link naturally woven in
- Add code snippets if it's a tutorial (Python, JavaScript, or curl examples)
- Be practical and developer-focused
- Do NOT include the title in the body (Dev.to adds it)
- Do NOT include frontmatter or metadata
- End with a clear call-to-action to try ElevenLabs
- Write in a conversational, developer-friendly tone
- Make sure ALL ElevenLabs links use exactly this URL: ${ELEVENLABS_LINK}`;

  let body;
  try {
    body = await callGroq(prompt);
    // Strip any thinking tags from Qwen models
    body = body.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  } catch (e) {
    console.error(`LLM generation failed: ${e.message}`);
    body = generateFallbackArticle(topic, type);
  }

  // Ensure affiliate link is present
  if (!body.includes(ELEVENLABS_LINK)) {
    body += `\n\n---\n\n**Ready to add voice AI to your project?** [Try ElevenLabs free](${ELEVENLABS_LINK}) — the most realistic text-to-speech and voice cloning platform for developers.\n`;
  }

  state.postedTopics.push(topic);
  state.articleIndex++;
  state.totalPosted++;

  return { title: topic, body, tags };
}

function generateFallbackArticle(topic, type) {
  let body = `Voice AI is transforming how developers build applications. Whether you're creating podcasts, audiobooks, chatbots, or accessibility tools, text-to-speech technology has reached a point where AI-generated voice is nearly indistinguishable from human speech.\n\n`;
  body += `## Why Voice AI Matters for Developers\n\n`;
  body += `The demand for voice-enabled applications is growing exponentially. Users expect natural-sounding voice in everything from navigation apps to virtual assistants. As a developer, adding voice AI to your stack is becoming essential.\n\n`;
  body += `[ElevenLabs](${ELEVENLABS_LINK}) offers one of the most advanced text-to-speech APIs available, with support for voice cloning, multilingual synthesis, and real-time streaming.\n\n`;
  body += `## Getting Started\n\n`;
  body += `The quickest way to get started is with the ElevenLabs API:\n\n`;
  body += '```python\nimport requests\n\nurl = "https://api.elevenlabs.io/v1/text-to-speech/YOUR_VOICE_ID"\nheaders = {\n    "xi-api-key": "YOUR_API_KEY",\n    "Content-Type": "application/json"\n}\ndata = {\n    "text": "Hello! This is AI-generated speech.",\n    "model_id": "eleven_multilingual_v2"\n}\n\nresponse = requests.post(url, json=data, headers=headers)\nwith open("output.mp3", "wb") as f:\n    f.write(response.content)\n```\n\n';
  body += `## Key Features\n\n`;
  body += `- **Voice Cloning**: Create a custom voice from just a few minutes of audio\n`;
  body += `- **29+ Languages**: Generate speech in dozens of languages with native accents\n`;
  body += `- **Real-Time Streaming**: Sub-second latency for conversational applications\n`;
  body += `- **Emotion Control**: Adjust tone, pace, and emphasis for natural delivery\n\n`;
  body += `## Use Cases\n\n`;
  body += `- Audiobook production at scale\n`;
  body += `- Podcast automation and multilingual episodes\n`;
  body += `- Voice-enabled chatbots and virtual assistants\n`;
  body += `- Accessibility tools for visually impaired users\n`;
  body += `- Game dialogue and character voices\n\n`;
  body += `---\n\n**Ready to build with voice AI?** [Try ElevenLabs free](${ELEVENLABS_LINK}) and start generating natural-sounding speech in minutes.\n`;
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
        'User-Agent': 'ElevenLabsPoster/1.0',
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
    console.error('Set DEVTO_ELEVENLABS_KEY environment variable');
    process.exit(1);
  }
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || POSTS_PER_RUN;

  console.log(`\n=== ElevenLabs Voice AI Poster ===`);
  console.log(`Topics available: ${Object.values(ALL_TOPICS).flat().length}`);
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
