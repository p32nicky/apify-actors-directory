const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const DEVTO_API_KEY = process.env.DEVTO_BOOK_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const AMAZON_TAG = 'nicdav09-20';

const POSTS_PER_RUN = 2;
const DELAY_BETWEEN_POSTS = 310000; // 5+ min
const STATE_FILE = path.join(__dirname, '.devto-book-state.json');

function amazonLink(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;
}

function searchLink(query) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;
}

// ─── Book catalog (real books, real ASINs, verified) ────────────────────────
const BOOKS = [
  // ── Software Craft ──────────────────────────────────────────────
  { title: 'Clean Code', author: 'Robert C. Martin', asin: '0132350882', category: 'software-craft', tags: ['programming', 'beginners', 'career', 'productivity'], year: 2008, pages: 464 },
  { title: 'The Pragmatic Programmer', author: 'David Thomas and Andrew Hunt', asin: '0135957052', category: 'software-craft', tags: ['programming', 'career', 'beginners', 'productivity'], year: 2019, pages: 352 },
  { title: 'Refactoring', author: 'Martin Fowler', asin: '0134757599', category: 'software-craft', tags: ['programming', 'webdev', 'javascript', 'productivity'], year: 2018, pages: 448 },
  { title: 'A Philosophy of Software Design', author: 'John Ousterhout', asin: '173210221X', category: 'software-craft', tags: ['programming', 'architecture', 'productivity', 'career'], year: 2021, pages: 196 },
  { title: 'Head First Design Patterns', author: 'Eric Freeman and Elisabeth Robson', asin: '149207800X', category: 'software-craft', tags: ['programming', 'beginners', 'java', 'webdev'], year: 2021, pages: 672 },
  { title: 'Working Effectively with Legacy Code', author: 'Michael Feathers', asin: '0131177052', category: 'software-craft', tags: ['programming', 'productivity', 'career', 'webdev'], year: 2004, pages: 456 },
  { title: 'Code Complete', author: 'Steve McConnell', asin: '0735619670', category: 'software-craft', tags: ['programming', 'beginners', 'career', 'productivity'], year: 2004, pages: 960 },
  { title: 'The Clean Coder', author: 'Robert C. Martin', asin: '0137081073', category: 'software-craft', tags: ['career', 'programming', 'productivity', 'beginners'], year: 2011, pages: 256 },
  { title: 'Clean Architecture', author: 'Robert C. Martin', asin: '0134494164', category: 'software-craft', tags: ['architecture', 'programming', 'webdev', 'productivity'], year: 2017, pages: 432 },
  { title: 'Design Patterns', author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides', asin: '0201633612', category: 'software-craft', tags: ['programming', 'architecture', 'java', 'webdev'], year: 1994, pages: 395 },
  { title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson and Gerald Jay Sussman', asin: '0262510871', category: 'software-craft', tags: ['programming', 'beginners', 'career', 'productivity'], year: 1996, pages: 657 },
  { title: 'Domain-Driven Design', author: 'Eric Evans', asin: '0321125215', category: 'software-craft', tags: ['architecture', 'programming', 'webdev', 'productivity'], year: 2003, pages: 560 },
  { title: 'Test Driven Development', author: 'Kent Beck', asin: '0321146530', category: 'software-craft', tags: ['programming', 'testing', 'productivity', 'webdev'], year: 2002, pages: 240 },
  { title: 'Patterns of Enterprise Application Architecture', author: 'Martin Fowler', asin: '0321127420', category: 'software-craft', tags: ['architecture', 'programming', 'webdev', 'java'], year: 2002, pages: 560 },

  // ── System Design / Architecture ────────────────────────────────
  { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', asin: '1449373321', category: 'system-design', tags: ['webdev', 'database', 'architecture', 'programming'], year: 2017, pages: 616 },
  { title: 'System Design Interview Volume 1', author: 'Alex Xu', asin: 'B08CMF2CQF', category: 'system-design', tags: ['career', 'webdev', 'architecture', 'programming'], year: 2020, pages: 322 },
  { title: 'System Design Interview Volume 2', author: 'Alex Xu and Sahn Lam', asin: '1736049119', category: 'system-design', tags: ['career', 'webdev', 'architecture', 'programming'], year: 2022, pages: 434 },
  { title: 'Web Scalability for Startup Engineers', author: 'Artur Ejsmont', asin: '0071843655', category: 'system-design', tags: ['webdev', 'architecture', 'programming', 'devops'], year: 2015, pages: 400 },
  { title: 'Building Microservices', author: 'Sam Newman', asin: '1492034029', category: 'system-design', tags: ['architecture', 'devops', 'programming', 'webdev'], year: 2021, pages: 616 },
  { title: 'Fundamentals of Software Architecture', author: 'Mark Richards and Neal Ford', asin: '1492043451', category: 'system-design', tags: ['architecture', 'programming', 'career', 'webdev'], year: 2020, pages: 422 },
  { title: 'Software Architecture: The Hard Parts', author: 'Neal Ford, Mark Richards, Pramod Sadalage, Zhamak Dehghani', asin: '1492086894', category: 'system-design', tags: ['architecture', 'programming', 'webdev', 'devops'], year: 2021, pages: 459 },
  { title: 'Understanding Distributed Systems', author: 'Roberto Vitillo', asin: '1838430210', category: 'system-design', tags: ['architecture', 'programming', 'webdev', 'devops'], year: 2022, pages: 273 },

  // ── Interview Prep ──────────────────────────────────────────────
  { title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', asin: '0984782850', category: 'interview-prep', tags: ['career', 'programming', 'beginners', 'productivity'], year: 2015, pages: 687 },
  { title: 'Elements of Programming Interviews in Python', author: 'Adnan Aziz, Tsung-Hsien Lee, Amit Prakash', asin: '1537713949', category: 'interview-prep', tags: ['python', 'career', 'programming', 'productivity'], year: 2016, pages: 442 },
  { title: 'Grokking Algorithms', author: 'Aditya Bhargava', asin: '1617292230', category: 'interview-prep', tags: ['programming', 'beginners', 'python', 'career'], year: 2016, pages: 256 },
  { title: 'Introduction to Algorithms (CLRS)', author: 'Thomas Cormen, Charles Leiserson, Ronald Rivest, Clifford Stein', asin: '026204630X', category: 'interview-prep', tags: ['programming', 'career', 'productivity', 'beginners'], year: 2022, pages: 1312 },
  { title: 'The Algorithm Design Manual', author: 'Steven Skiena', asin: '3030542556', category: 'interview-prep', tags: ['programming', 'career', 'productivity', 'beginners'], year: 2020, pages: 800 },

  // ── JavaScript / TypeScript ─────────────────────────────────────
  { title: 'Learning JavaScript Design Patterns', author: 'Addy Osmani', asin: '1098139879', category: 'javascript', tags: ['javascript', 'webdev', 'react', 'programming'], year: 2023, pages: 530 },
  { title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', asin: '1718504101', category: 'javascript', tags: ['javascript', 'webdev', 'beginners', 'programming'], year: 2024, pages: 472 },
  { title: 'You Don\'t Know JS Yet: Get Started', author: 'Kyle Simpson', asin: 'B084DFZ6GS', category: 'javascript', tags: ['javascript', 'webdev', 'beginners', 'programming'], year: 2020, pages: 143 },
  { title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', asin: '0596517742', category: 'javascript', tags: ['javascript', 'webdev', 'programming', 'productivity'], year: 2008, pages: 176 },
  { title: 'Programming TypeScript', author: 'Boris Cherny', asin: '1492037656', category: 'javascript', tags: ['javascript', 'webdev', 'programming', 'productivity'], year: 2019, pages: 324 },
  { title: 'Effective TypeScript', author: 'Dan Vanderkam', asin: '1098155068', category: 'javascript', tags: ['javascript', 'webdev', 'programming', 'productivity'], year: 2024, pages: 400 },
  { title: 'Learning React', author: 'Alex Banks and Eve Porcello', asin: '1492051721', category: 'javascript', tags: ['javascript', 'webdev', 'react', 'beginners'], year: 2020, pages: 310 },
  { title: 'Full Stack React, TypeScript, and Node', author: 'David Choi', asin: '1839219939', category: 'javascript', tags: ['javascript', 'webdev', 'react', 'programming'], year: 2020, pages: 648 },
  { title: 'Node.js Design Patterns', author: 'Mario Casciaro and Luciano Mammino', asin: '1839214112', category: 'javascript', tags: ['javascript', 'webdev', 'programming', 'architecture'], year: 2020, pages: 660 },

  // ── Python ──────────────────────────────────────────────────────
  { title: 'Python Crash Course', author: 'Eric Matthes', asin: '1718502702', category: 'python', tags: ['python', 'beginners', 'programming', 'tutorial'], year: 2023, pages: 552 },
  { title: 'Fluent Python', author: 'Luciano Ramalho', asin: '1492056359', category: 'python', tags: ['python', 'programming', 'productivity', 'tutorial'], year: 2022, pages: 1012 },
  { title: 'Automate the Boring Stuff with Python', author: 'Al Sweigart', asin: '1593279922', category: 'python', tags: ['python', 'beginners', 'programming', 'tutorial'], year: 2019, pages: 592 },
  { title: 'Effective Python', author: 'Brett Slatkin', asin: '0134853989', category: 'python', tags: ['python', 'programming', 'productivity', 'tutorial'], year: 2019, pages: 480 },
  { title: 'Architecture Patterns with Python', author: 'Harry Percival and Bob Gregory', asin: '1492052205', category: 'python', tags: ['python', 'architecture', 'programming', 'webdev'], year: 2020, pages: 280 },
  { title: 'Robust Python', author: 'Patrick Viafore', asin: '1098100662', category: 'python', tags: ['python', 'programming', 'productivity', 'architecture'], year: 2021, pages: 365 },

  // ── Go ──────────────────────────────────────────────────────────
  { title: 'Learning Go', author: 'Jon Bodner', asin: '1098139291', category: 'golang', tags: ['go', 'programming', 'beginners', 'webdev'], year: 2024, pages: 422 },
  { title: 'Concurrency in Go', author: 'Katherine Cox-Buday', asin: '1491941197', category: 'golang', tags: ['go', 'programming', 'architecture', 'webdev'], year: 2017, pages: 238 },
  { title: 'Go Programming Language', author: 'Alan Donovan and Brian Kernighan', asin: '0134190440', category: 'golang', tags: ['go', 'programming', 'beginners', 'webdev'], year: 2015, pages: 380 },
  { title: 'Cloud Native Go', author: 'Matthew Titmus', asin: '1492076333', category: 'golang', tags: ['go', 'devops', 'architecture', 'programming'], year: 2021, pages: 436 },

  // ── Rust ─────────────────────────────────────────────────────────
  { title: 'Rust in Action', author: 'Tim McNamara', asin: '1617294551', category: 'rust', tags: ['rust', 'programming', 'beginners', 'webdev'], year: 2021, pages: 456 },
  { title: 'Programming Rust', author: 'Jim Blandy, Jason Orendorff, Leonora Tindall', asin: '1492052590', category: 'rust', tags: ['rust', 'programming', 'architecture', 'webdev'], year: 2021, pages: 738 },
  { title: 'Rust for Rustaceans', author: 'Jon Gjengset', asin: '1718501854', category: 'rust', tags: ['rust', 'programming', 'architecture', 'productivity'], year: 2021, pages: 282 },

  // ── DevOps / Cloud / Infrastructure ─────────────────────────────
  { title: 'Docker Deep Dive', author: 'Nigel Poulton', asin: 'B0BLG71GY6', category: 'devops', tags: ['devops', 'docker', 'programming', 'webdev'], year: 2023, pages: 290 },
  { title: 'Kubernetes in Action', author: 'Marko Luksa', asin: '1617297615', category: 'devops', tags: ['devops', 'docker', 'architecture', 'programming'], year: 2022, pages: 600 },
  { title: 'The Phoenix Project', author: 'Gene Kim, Kevin Behr, George Spafford', asin: '1942788290', category: 'devops', tags: ['devops', 'career', 'productivity', 'programming'], year: 2018, pages: 432 },
  { title: 'Site Reliability Engineering', author: 'Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Murphy', asin: '149192912X', category: 'devops', tags: ['devops', 'architecture', 'programming', 'productivity'], year: 2016, pages: 552 },
  { title: 'Terraform: Up & Running', author: 'Yevgeniy Brikman', asin: '1098116747', category: 'devops', tags: ['devops', 'programming', 'architecture', 'webdev'], year: 2022, pages: 510 },
  { title: 'Infrastructure as Code', author: 'Kief Morris', asin: '1098114671', category: 'devops', tags: ['devops', 'architecture', 'programming', 'productivity'], year: 2020, pages: 410 },
  { title: 'The DevOps Handbook', author: 'Gene Kim, Jez Humble, Patrick Debois, John Willis', asin: '1950508404', category: 'devops', tags: ['devops', 'career', 'productivity', 'programming'], year: 2021, pages: 528 },
  { title: 'Continuous Delivery', author: 'Jez Humble and David Farley', asin: '0321601912', category: 'devops', tags: ['devops', 'programming', 'productivity', 'architecture'], year: 2010, pages: 512 },

  // ── Career / Leadership ─────────────────────────────────────────
  { title: 'Staff Engineer', author: 'Will Larsen', asin: '1736417916', category: 'career', tags: ['career', 'productivity', 'programming', 'leadership'], year: 2021, pages: 387 },
  { title: 'The Software Engineer\'s Guidebook', author: 'Gergely Orosz', asin: '908338182X', category: 'career', tags: ['career', 'programming', 'productivity', 'leadership'], year: 2023, pages: 434 },
  { title: 'The Manager\'s Path', author: 'Camille Fournier', asin: '1491973897', category: 'career', tags: ['career', 'leadership', 'productivity', 'programming'], year: 2017, pages: 244 },
  { title: 'An Elegant Puzzle', author: 'Will Larsen', asin: '1732265186', category: 'career', tags: ['career', 'leadership', 'productivity', 'programming'], year: 2019, pages: 288 },
  { title: 'Soft Skills: The Software Developer\'s Life Manual', author: 'John Sonmez', asin: '0999081446', category: 'career', tags: ['career', 'beginners', 'productivity', 'programming'], year: 2020, pages: 506 },
  { title: 'The Passionate Programmer', author: 'Chad Fowler', asin: '1934356344', category: 'career', tags: ['career', 'productivity', 'programming', 'beginners'], year: 2009, pages: 200 },

  // ── Data / ML / AI ──────────────────────────────────────────────
  { title: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', author: 'Aurélien Géron', asin: '1098125975', category: 'data-ml', tags: ['python', 'programming', 'tutorial', 'productivity'], year: 2022, pages: 861 },
  { title: 'Designing Machine Learning Systems', author: 'Chip Huyen', asin: '1098107969', category: 'data-ml', tags: ['programming', 'architecture', 'python', 'career'], year: 2022, pages: 380 },
  { title: 'Python for Data Analysis', author: 'Wes McKinney', asin: '109810403X', category: 'data-ml', tags: ['python', 'beginners', 'programming', 'tutorial'], year: 2022, pages: 579 },
  { title: 'Deep Learning with Python', author: 'François Chollet', asin: '1617296864', category: 'data-ml', tags: ['python', 'programming', 'tutorial', 'productivity'], year: 2021, pages: 504 },
  { title: 'The Hundred-Page Machine Learning Book', author: 'Andriy Burkov', asin: '199957950X', category: 'data-ml', tags: ['programming', 'beginners', 'python', 'tutorial'], year: 2019, pages: 160 },
  { title: 'Build a Large Language Model (From Scratch)', author: 'Sebastian Raschka', asin: '1633437167', category: 'data-ml', tags: ['python', 'programming', 'tutorial', 'productivity'], year: 2024, pages: 368 },

  // ── Security ────────────────────────────────────────────────────
  { title: 'The Web Application Hacker\'s Handbook', author: 'Dafydd Stuttard and Marcus Pinto', asin: '1118026470', category: 'security', tags: ['webdev', 'programming', 'career', 'productivity'], year: 2011, pages: 912 },
  { title: 'Hacking: The Art of Exploitation', author: 'Jon Erickson', asin: '1593271441', category: 'security', tags: ['programming', 'career', 'productivity', 'webdev'], year: 2008, pages: 488 },
  { title: 'Cybersecurity Ops with bash', author: 'Paul Troncone and Carl Albing', asin: '1492041312', category: 'security', tags: ['devops', 'programming', 'productivity', 'career'], year: 2019, pages: 306 },

  // ── Databases ───────────────────────────────────────────────────
  { title: 'Database Internals', author: 'Alex Petrov', asin: '1492040347', category: 'databases', tags: ['database', 'architecture', 'programming', 'webdev'], year: 2019, pages: 350 },
  { title: 'SQL Performance Explained', author: 'Markus Winand', asin: '3950307826', category: 'databases', tags: ['database', 'programming', 'webdev', 'productivity'], year: 2012, pages: 204 },
  { title: 'Redis in Action', author: 'Josiah Carlson', asin: '1617290858', category: 'databases', tags: ['database', 'programming', 'webdev', 'architecture'], year: 2013, pages: 320 },
  { title: 'MongoDB: The Definitive Guide', author: 'Shannon Bradshaw, Eoin Brazil, Kristina Chodorow', asin: '1491954469', category: 'databases', tags: ['database', 'programming', 'webdev', 'beginners'], year: 2019, pages: 514 },

  // ── Linux / Command Line ────────────────────────────────────────
  { title: 'The Linux Command Line', author: 'William Shotts', asin: '1593279523', category: 'linux', tags: ['devops', 'beginners', 'programming', 'productivity'], year: 2019, pages: 504 },
  { title: 'How Linux Works', author: 'Brian Ward', asin: '1718500408', category: 'linux', tags: ['devops', 'programming', 'productivity', 'beginners'], year: 2021, pages: 392 },
  { title: 'Unix and Linux System Administration Handbook', author: 'Evi Nemeth, Garth Snyder, Trent Hein, Ben Whaley, Dan Mackin', asin: '0134277554', category: 'linux', tags: ['devops', 'programming', 'career', 'productivity'], year: 2017, pages: 1232 },

  // ── Networking ──────────────────────────────────────────────────
  { title: 'Computer Networking: A Top-Down Approach', author: 'James Kurose and Keith Ross', asin: '0136681557', category: 'networking', tags: ['programming', 'architecture', 'webdev', 'beginners'], year: 2020, pages: 800 },
  { title: 'High Performance Browser Networking', author: 'Ilya Grigorik', asin: '1449344763', category: 'networking', tags: ['webdev', 'programming', 'architecture', 'productivity'], year: 2013, pages: 400 },

  // ── C / C++ / Low Level ─────────────────────────────────────────
  { title: 'The C Programming Language', author: 'Brian Kernighan and Dennis Ritchie', asin: '0131103628', category: 'low-level', tags: ['programming', 'beginners', 'career', 'productivity'], year: 1988, pages: 272 },
  { title: 'Computer Systems: A Programmer\'s Perspective', author: 'Randal Bryant and David O\'Hallaron', asin: '013409266X', category: 'low-level', tags: ['programming', 'architecture', 'career', 'productivity'], year: 2015, pages: 1120 },
];

// ─── Groq LLM for generating varied articles ───────────────────────────────

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

// ─── Static article generators (no LLM needed) ─────────────────────────────

function generateSingleReview(book) {
  const link = amazonLink(book.asin);
  const relatedBooks = BOOKS.filter(b => b.category === book.category && b.asin !== book.asin).slice(0, 3);
  const authorBooks = BOOKS.filter(b => b.author.includes(book.author.split(' ').pop()) && b.asin !== book.asin);

  let body = `**${book.title}** by ${book.author} is one of those books that keeps showing up on every developer's recommended reading list — and for good reason.\n\n`;
  body += `Published in ${book.year}, this ${book.pages}-page book covers ${book.category.replace(/-/g, ' ')} in a way that's both thorough and practical.\n\n`;
  body += `**[Get ${book.title} on Amazon](${link})**\n\n`;
  body += `## What Makes This Book Stand Out\n\n`;
  body += `In a field where technology changes every few years, ${book.title} has remained relevant because it focuses on principles rather than specific tools. ${book.author} brings real-world experience to every chapter.\n\n`;
  body += `## Who Should Read It\n\n`;
  body += `This book is ideal for developers interested in ${book.category.replace(/-/g, ' ')}. Whether you're a junior developer building foundations or a senior engineer looking to sharpen your skills, there's value here.\n\n`;
  body += `**[Get ${book.title} on Amazon](${link})**\n\n`;

  if (relatedBooks.length > 0) {
    body += `## Related Books You Might Like\n\n`;
    relatedBooks.forEach(b => {
      body += `- **[${b.title}](${amazonLink(b.asin)})** by ${b.author} (${b.year})\n`;
    });
    body += '\n';
  }

  if (authorBooks.length > 0) {
    body += `## More from ${book.author.split(',')[0]}\n\n`;
    authorBooks.forEach(b => {
      body += `- **[${b.title}](${amazonLink(b.asin)})** (${b.year})\n`;
    });
    body += '\n';
  }

  body += `## Book Details\n\n`;
  body += `| Detail | Info |\n|--------|------|\n`;
  body += `| **Author** | ${book.author} |\n`;
  body += `| **Pages** | ${book.pages} |\n`;
  body += `| **Year** | ${book.year} |\n`;
  body += `| **Category** | ${book.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} |\n\n`;
  body += `**[Get ${book.title} on Amazon](${link})**\n\n`;
  body += `---\n\n`;
  body += `*Looking for more developer books? [Browse the full collection on Amazon](${searchLink(book.category.replace(/-/g, ' ') + ' books for developers')})*\n`;

  return {
    title: `${book.title} by ${book.author} — Developer Book Review`,
    body,
    tags: book.tags,
    series: 'Developer Book Reviews',
  };
}

function generateComparisonPost(books, topic) {
  const comparisons = {
    'interview-prep': { title: 'Best Books for Coding Interviews in 2026', filter: b => ['interview-prep', 'system-design'].includes(b.category), tags: ['career', 'programming', 'beginners', 'productivity'] },
    'career-growth': { title: 'Developer Career Growth: Books That Actually Move the Needle', filter: b => ['career', 'software-craft'].includes(b.category), tags: ['career', 'programming', 'productivity', 'leadership'] },
    'system-design': { title: 'System Design Books Ranked for Every Level', filter: b => b.category === 'system-design', tags: ['architecture', 'webdev', 'career', 'programming'] },
    'clean-code': { title: 'The Best Books on Writing Clean, Maintainable Code', filter: b => b.category === 'software-craft', tags: ['programming', 'productivity', 'webdev', 'beginners'] },
    'javascript': { title: 'Best JavaScript and TypeScript Books in 2026', filter: b => b.category === 'javascript', tags: ['javascript', 'webdev', 'programming', 'beginners'] },
    'python': { title: 'Best Python Books in 2026 — Beginner to Advanced', filter: b => b.category === 'python', tags: ['python', 'programming', 'beginners', 'tutorial'] },
    'backend': { title: 'Essential Books for Backend Developers', filter: b => ['system-design', 'devops', 'databases'].includes(b.category), tags: ['webdev', 'architecture', 'programming', 'devops'] },
    'go-vs-rust': { title: 'Go vs Rust Books: What to Read for Each Language', filter: b => ['golang', 'rust'].includes(b.category), tags: ['go', 'rust', 'programming', 'beginners'] },
    'devops': { title: 'Best DevOps Books for Engineers in 2026', filter: b => b.category === 'devops', tags: ['devops', 'docker', 'programming', 'architecture'] },
    'data-ml': { title: 'Best Machine Learning and Data Science Books', filter: b => b.category === 'data-ml', tags: ['python', 'programming', 'tutorial', 'productivity'] },
    'security': { title: 'Best Cybersecurity Books for Developers', filter: b => b.category === 'security', tags: ['webdev', 'programming', 'career', 'productivity'] },
    'databases': { title: 'Best Database Books Every Developer Should Read', filter: b => b.category === 'databases', tags: ['database', 'programming', 'webdev', 'architecture'] },
    'linux': { title: 'Best Linux and Command Line Books for Developers', filter: b => ['linux', 'devops'].includes(b.category), tags: ['devops', 'programming', 'beginners', 'productivity'] },
    'architecture-deep': { title: 'Software Architecture Books — From Patterns to Microservices', filter: b => b.tags.includes('architecture'), tags: ['architecture', 'programming', 'webdev', 'career'] },
    'new-developer': { title: 'The Complete New Developer Reading List for 2026', filter: b => b.tags.includes('beginners'), tags: ['beginners', 'programming', 'career', 'webdev'] },
  };

  const config = comparisons[topic];
  if (!config) return null;
  const selected = books.filter(config.filter);
  if (selected.length < 2) return null;

  let body = `Here's my curated list of the best ${topic.replace(/-/g, ' ')} books for developers.\n\n`;
  body += `## Quick Comparison\n\n`;
  body += `| Book | Author | Pages | Year |\n|------|--------|-------|------|\n`;
  selected.forEach(b => {
    body += `| [${b.title}](${amazonLink(b.asin)}) | ${b.author.split(',')[0]} | ${b.pages} | ${b.year} |\n`;
  });

  selected.forEach((b, i) => {
    body += `\n## ${i + 1}. ${b.title}\n\n`;
    body += `**By ${b.author}** · ${b.pages} pages · ${b.year}\n\n`;
    body += `A solid ${b.category.replace(/-/g, ' ')} book that every developer should consider.\n\n`;
    body += `**[Get it on Amazon](${amazonLink(b.asin)})**\n`;
  });

  body += `\n---\n\n`;
  body += `## Browse More\n\n`;
  body += `- [All developer books on Amazon](${searchLink('software developer books 2024')})\n`;
  body += `- [Programming bestsellers](${searchLink('programming books bestseller')})\n`;

  return { title: config.title, body, tags: config.tags, series: 'Developer Book Reviews' };
}

function generateTopNPost(books, topic) {
  const lists = {
    'beginner': { title: '7 Books Every New Developer Should Read', filter: b => b.tags.includes('beginners'), tags: ['beginners', 'programming', 'career', 'webdev'] },
    'senior': { title: 'Books That Made Me a Better Senior Developer', filter: b => !b.tags.includes('beginners') || b.category === 'software-craft', tags: ['programming', 'career', 'architecture', 'productivity'] },
    'must-own': { title: '10 Developer Books Worth Owning in Physical Form', filter: () => true, tags: ['programming', 'career', 'beginners', 'productivity'] },
    'under-300-pages': { title: 'Best Short Developer Books (Under 300 Pages)', filter: b => b.pages < 300, tags: ['programming', 'productivity', 'beginners', 'career'] },
    'classics': { title: 'Timeless Programming Books That Still Hold Up', filter: b => b.year < 2015, tags: ['programming', 'career', 'beginners', 'productivity'] },
    'modern': { title: 'Best Developer Books Published Since 2020', filter: b => b.year >= 2020, tags: ['programming', 'webdev', 'career', 'productivity'] },
    'thick-reads': { title: 'Epic Developer Books Over 500 Pages (Worth Every Page)', filter: b => b.pages >= 500, tags: ['programming', 'career', 'architecture', 'productivity'] },
    'quick-wins': { title: 'Developer Books You Can Finish in a Weekend', filter: b => b.pages <= 250, tags: ['programming', 'beginners', 'productivity', 'career'] },
    'fullstack': { title: 'Full Stack Developer Reading List 2026', filter: b => ['javascript', 'python', 'devops', 'databases', 'system-design'].includes(b.category), tags: ['webdev', 'javascript', 'programming', 'devops'] },
    'leadership': { title: 'Engineering Leadership Books Every Tech Lead Needs', filter: b => b.tags.includes('leadership') || b.category === 'career', tags: ['career', 'leadership', 'productivity', 'programming'] },
  };

  const config = lists[topic];
  if (!config) return null;
  const selected = books.filter(config.filter).slice(0, 10);
  if (selected.length < 3) return null;

  let body = `\n`;
  selected.forEach((b, i) => {
    body += `## ${i + 1}. ${b.title} — ${b.author.split(',')[0]}\n\n`;
    body += `${b.pages} pages · ${b.year} · ${b.category.replace(/-/g, ' ')}\n\n`;
    body += `**[Get it on Amazon](${amazonLink(b.asin)})**\n\n---\n\n`;
  });

  body += `## Want More?\n\n`;
  body += `- [Browse developer books on Amazon](${searchLink('best developer books')})\n`;
  body += `- [Software engineering bestsellers](${searchLink('software engineering books bestseller')})\n`;

  return { title: config.title, body, tags: config.tags, series: 'Developer Book Reviews' };
}

// ─── LLM-generated articles (unlimited topics) ─────────────────────────────

// Hundreds of topic combinations — the LLM writes fresh articles about ANY dev book
const LLM_TOPICS = [
  // ── Languages (50+ topics) ──────────────────────────────────────
  ...[
    'Python', 'JavaScript', 'TypeScript', 'Rust', 'Go', 'Java', 'C#', 'C++', 'Ruby',
    'Swift', 'Kotlin', 'Scala', 'Elixir', 'Haskell', 'Clojure', 'PHP', 'Dart', 'Lua',
    'R', 'Julia', 'Zig', 'OCaml', 'F#', 'Perl', 'COBOL',
  ].flatMap(lang => [
    { title: `Best ${lang} Books for Beginners in 2026`, topic: `beginner ${lang} programming books`, tags: ['programming', 'beginners', 'tutorial', 'career'] },
    { title: `Advanced ${lang} Books That Will Level Up Your Code`, topic: `advanced ${lang} programming books`, tags: ['programming', 'productivity', 'career', 'tutorial'] },
  ]),

  // ── Frameworks & Tools (60+ topics) ─────────────────────────────
  ...[
    'React', 'Vue.js', 'Angular', 'Next.js', 'Svelte', 'Django', 'Flask', 'FastAPI',
    'Spring Boot', 'Express.js', 'NestJS', 'Rails', 'Laravel', 'ASP.NET', 'Phoenix',
    'Remix', 'Nuxt', 'Astro', 'Tailwind CSS', 'GraphQL', 'tRPC', 'Prisma',
    'SQLAlchemy', 'Mongoose', 'Redux', 'Zustand', 'React Native', 'Flutter',
    'Electron', 'Tauri',
  ].map(fw => ({
    title: `Best Books and Resources to Learn ${fw}`,
    topic: `${fw} programming books tutorials`,
    tags: ['webdev', 'programming', 'tutorial', 'beginners'],
  })),

  // ── Career stages (30+ topics) ──────────────────────────────────
  ...[
    'junior developer', 'mid-level developer', 'senior developer', 'staff engineer',
    'principal engineer', 'engineering manager', 'CTO', 'tech lead', 'architect',
    'freelance developer', 'solo founder', 'bootcamp graduate', 'career changer',
    'self-taught programmer', 'CS student', 'intern',
  ].map(role => ({
    title: `Must-Read Books for Every ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    topic: `best programming books for ${role}`,
    tags: ['career', 'programming', 'productivity', 'beginners'],
  })),

  // ── Skills & Concepts (80+ topics) ──────────────────────────────
  ...[
    'API design', 'REST APIs', 'microservices', 'monolith to microservices',
    'event-driven architecture', 'domain-driven design', 'test-driven development',
    'behavior-driven development', 'continuous integration', 'continuous deployment',
    'infrastructure as code', 'serverless', 'cloud computing', 'AWS', 'Azure', 'GCP',
    'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD pipelines',
    'database design', 'SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'message queues', 'RabbitMQ', 'Kafka', 'system design', 'distributed systems',
    'concurrency', 'multithreading', 'async programming',
    'functional programming', 'object-oriented programming', 'design patterns',
    'clean code', 'refactoring', 'code review', 'pair programming',
    'agile', 'scrum', 'kanban', 'extreme programming',
    'unit testing', 'integration testing', 'end-to-end testing', 'load testing',
    'security', 'OWASP', 'penetration testing', 'cryptography', 'authentication',
    'OAuth', 'JWT', 'web security',
    'machine learning', 'deep learning', 'natural language processing', 'computer vision',
    'data engineering', 'data pipelines', 'ETL', 'data warehousing',
    'algorithms', 'data structures', 'dynamic programming', 'graph algorithms',
    'operating systems', 'networking', 'TCP/IP', 'HTTP',
    'compilers', 'interpreters', 'programming language design',
    'game development', 'embedded systems', 'IoT',
    'mobile development', 'iOS development', 'Android development',
    'web performance', 'accessibility', 'SEO for developers',
    'open source', 'technical writing', 'documentation',
    'debugging', 'profiling', 'observability', 'logging', 'monitoring',
    'Git', 'version control', 'Linux administration', 'shell scripting', 'Vim',
  ].map(skill => ({
    title: `Best Books to Learn ${skill.charAt(0).toUpperCase() + skill.slice(1)}`,
    topic: `${skill} books for developers`,
    tags: ['programming', 'tutorial', 'webdev', 'productivity'],
  })),

  // ── Problem-solving articles (40+ topics) ───────────────────────
  ...[
    'failing coding interviews', 'imposter syndrome', 'burnout',
    'stuck at mid-level', 'can\'t finish side projects', 'legacy codebase nightmares',
    'production outages', 'slow deployments', 'flaky tests', 'code review conflicts',
    'choosing between frameworks', 'analysis paralysis on architecture',
    'learning too many things at once', 'not getting promoted',
    'bad at estimating tasks', 'struggling with algorithms',
    'can\'t understand distributed systems', 'overwhelmed by cloud services',
    'writing unmaintainable code', 'team communication problems',
    'technical debt piling up', 'fear of breaking things in production',
    'not understanding databases deeply enough', 'struggling with async code',
    'can\'t keep up with new technologies', 'dependency hell',
    'security vulnerabilities in your code', 'poor API design',
    'monolith getting too big', 'microservices too complex',
    'no idea how to scale', 'your app is too slow',
    'CI/CD pipeline keeps breaking', 'Docker confusion',
    'Kubernetes is overwhelming', 'cloud costs out of control',
    'data pipeline failures', 'ML model not performing',
    'mobile app crashes', 'frontend state management chaos',
  ].map(problem => ({
    title: `Books That Help When You're ${problem.charAt(0).toUpperCase() + problem.slice(1)}`,
    topic: `developer books for ${problem}`,
    tags: ['career', 'programming', 'productivity', 'beginners'],
  })),

  // ── Comparison / vs articles (30+ topics) ───────────────────────
  ...[
    ['Python', 'JavaScript'], ['React', 'Vue.js'], ['Go', 'Rust'],
    ['Django', 'FastAPI'], ['TypeScript', 'JavaScript'], ['Docker', 'Kubernetes'],
    ['SQL', 'NoSQL'], ['Monolith', 'Microservices'], ['REST', 'GraphQL'],
    ['AWS', 'Azure'], ['MongoDB', 'PostgreSQL'], ['Redis', 'Memcached'],
    ['Next.js', 'Remix'], ['Flutter', 'React Native'], ['Java', 'Kotlin'],
    ['C++', 'Rust'], ['Spring Boot', 'NestJS'], ['Svelte', 'React'],
    ['Angular', 'React'], ['Ruby', 'Python'], ['Scala', 'Kotlin'],
    ['Terraform', 'Pulumi'], ['Jenkins', 'GitHub Actions'],
    ['Jest', 'Vitest'], ['Express', 'Fastify'],
  ].map(([a, b]) => ({
    title: `${a} vs ${b}: Best Books for Each in 2026`,
    topic: `${a} vs ${b} programming books comparison`,
    tags: ['programming', 'webdev', 'beginners', 'tutorial'],
  })),

  // ── Hot takes (20+ topics) ──────────────────────────────────────
  ...[
    'Most programming books are outdated before they\'re published',
    'You only need 5 books to become a great developer',
    'Books are better than online courses for learning to code',
    'Every developer should read books outside of tech',
    'The best programming book is free online',
    'Stop reading tutorials and read real books instead',
    'Algorithm books are a waste of time for most developers',
    'Design pattern books do more harm than good',
    'You should re-read your favorite programming book every year',
    'Physical books are better than ebooks for learning',
    'The best career advice isn\'t in a programming book',
    'Most system design books are just interview prep disguised as knowledge',
    'Self-taught developers need different books than CS grads',
    'Old programming books teach better fundamentals than new ones',
    'AI books are already outdated by the time you read them',
  ].map(take => ({
    title: `Hot Take: ${take}`,
    topic: `developer book opinions ${take.split(' ').slice(0, 4).join(' ')}`,
    tags: ['programming', 'career', 'productivity', 'webdev'],
  })),

  // ── Themed lists (30+ topics) ───────────────────────────────────
  ...[
    'books you can read in a weekend', 'books over 500 pages worth the investment',
    'free programming books available online', 'most underrated developer books',
    'most overrated developer books', 'books that changed how I think about code',
    'books for developers who hate reading', 'audiobook-friendly programming books',
    'books every startup founder who codes should read',
    'books for developers transitioning to data science',
    'books for gamers who want to learn programming',
    'books about the history of computing',
    'books about tech company culture', 'books about open source',
    'programming books with the best exercises',
    'books that teach you to think like a programmer',
    'math books every developer should read',
    'books about software project management',
    'books about developer productivity and focus',
    'books about writing better documentation',
    'books for developers who want to write',
    'books about building developer tools',
    'programming books published this year worth reading',
    'books that senior developers wish they read earlier',
    'books about debugging and troubleshooting',
    'books that explain computer science without math',
    'books for developers who want to understand hardware',
    'books about building SaaS products',
    'books about developer experience and DX',
    'books about ethical technology',
  ].map(theme => ({
    title: `${theme.charAt(0).toUpperCase() + theme.slice(1)}`,
    topic: `developer ${theme}`,
    tags: ['programming', 'career', 'beginners', 'productivity'],
  })),
];

// Shuffle helper
function pick(arr, n) {
  const shuffled = arr.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function generateLLMArticle(state) {
  if (!state.usedLLMTopics) state.usedLLMTopics = [];

  // Find unused topics
  let available = LLM_TOPICS.filter((_, i) => !state.usedLLMTopics.includes(i));
  if (available.length === 0) {
    state.usedLLMTopics = [];
    available = LLM_TOPICS;
  }

  const topicIdx = LLM_TOPICS.indexOf(available[Math.floor(Math.random() * available.length)]);
  const chosen = LLM_TOPICS[topicIdx];
  state.usedLLMTopics.push(topicIdx);

  // Pick some catalog books to seed the article with real ASIN links
  const seedBooks = pick(BOOKS, 3);
  const seedLinks = seedBooks.map(b => `- "${b.title}" by ${b.author}: ${amazonLink(b.asin)}`).join('\n');

  const searchUrl = searchLink(chosen.topic);

  const prompt = `You are a developer book reviewer writing for Dev.to. Write a markdown article titled "${chosen.title}".

IMPORTANT RULES:
- Recommend 4-7 REAL, well-known books that actually exist. Use their real titles and real authors. Do NOT invent fake books.
- For each book, include an Amazon search link in this exact format: [Book Title](https://www.amazon.com/s?k=ENCODED+BOOK+TITLE+AUTHOR&tag=${AMAZON_TAG})
- Also weave in these specific book links naturally if they're relevant to the topic:
${seedLinks}
- End with a "Browse More" section linking to: [Find more on Amazon](${searchUrl})
- Include at least 5 clickable Amazon links total spread throughout the article.

STRUCTURE:
- Opening paragraph (why this topic matters, no fluff)
- 4-7 book recommendations with ## headers, each with: author, why it's good, who it's for, and an Amazon link
- A comparison table if comparing books
- Closing with action items and browse link

Write 600-900 words. Be practical, opinionated, specific. Write like a senior developer recommending to a colleague. American English.
Return ONLY the markdown body (no title, no frontmatter, no \`\`\` wrappers).`;

  try {
    console.log(`  Calling Groq for: ${chosen.title}`);
    const body = await callGroq(prompt);
    const cleaned = body.replace(/^---[\s\S]*?---\n?/, '').replace(/^#\s+.*\n?/, '').replace(/^```[\s\S]*?```$/gm, '').trim();
    return { title: chosen.title, body: cleaned, tags: chosen.tags, series: 'Developer Book Reviews' };
  } catch (e) {
    console.log(`  Groq failed: ${e.message}. Using static fallback.`);
    return null;
  }
}

// ─── Post type rotation ─────────────────────────────────────────────────────

const COMPARISON_TOPICS = Object.keys({
  'interview-prep':1, 'career-growth':1, 'system-design':1, 'clean-code':1, 'javascript':1,
  'python':1, 'backend':1, 'go-vs-rust':1, 'devops':1, 'data-ml':1, 'security':1,
  'databases':1, 'linux':1, 'architecture-deep':1, 'new-developer':1,
});

const TOPN_TOPICS = Object.keys({
  'beginner':1, 'senior':1, 'must-own':1, 'under-300-pages':1, 'classics':1,
  'modern':1, 'thick-reads':1, 'quick-wins':1, 'fullstack':1, 'leadership':1,
});

async function generateArticle(state) {
  // 50% LLM (unlimited), 20% review, 15% comparison, 15% topN
  const types = ['llm', 'llm', 'llm', 'review', 'review', 'comparison', 'topN', 'llm', 'llm', 'llm'];
  if (!state.typeQueue || state.typeQueue.length === 0) {
    state.typeQueue = types.slice().sort(() => Math.random() - 0.5);
  }
  const type = state.typeQueue.shift();
  console.log(`Generating ${type} article...`);

  if (type === 'review') {
    if (!state.reviewedBooks) state.reviewedBooks = [];
    const unreviewed = BOOKS.filter(b => !state.reviewedBooks.includes(b.asin));
    if (unreviewed.length === 0) { state.reviewedBooks = []; return generateArticle(state); }
    const book = unreviewed[Math.floor(Math.random() * unreviewed.length)];
    state.reviewedBooks.push(book.asin);
    return generateSingleReview(book);
  }

  if (type === 'comparison') {
    if (!state.postedComparisons) state.postedComparisons = [];
    const unposted = COMPARISON_TOPICS.filter(t => !state.postedComparisons.includes(t));
    if (unposted.length === 0) { state.postedComparisons = []; return generateArticle(state); }
    const topic = unposted[Math.floor(Math.random() * unposted.length)];
    const article = generateComparisonPost(BOOKS, topic);
    if (!article) return generateArticle(state);
    state.postedComparisons.push(topic);
    return article;
  }

  if (type === 'topN') {
    if (!state.postedTopN) state.postedTopN = [];
    const unposted = TOPN_TOPICS.filter(t => !state.postedTopN.includes(t));
    if (unposted.length === 0) { state.postedTopN = []; return generateArticle(state); }
    const topic = unposted[Math.floor(Math.random() * unposted.length)];
    const article = generateTopNPost(BOOKS, topic);
    if (!article) return generateArticle(state);
    state.postedTopN.push(topic);
    return article;
  }

  if (type === 'llm') {
    const article = await generateLLMArticle(state);
    if (article) return article;
    // fallback to review
    return generateArticle(state);
  }
}

// ─── Dev.to publish ─────────────────────────────────────────────────────────

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
        'User-Agent': 'DevToBookBot/1.0',
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

// ─── State ──────────────────────────────────────────────────────────────────

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { postCount: 0, lastRun: null, reviewedBooks: [], postedComparisons: [], postedTopN: [], typeQueue: [], llmTemplateQueue: [] };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (!DEVTO_API_KEY && !dryRun) {
    console.error('Set DEVTO_BOOK_API_KEY environment variable');
    process.exit(1);
  }
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || POSTS_PER_RUN;

  console.log(`\n=== Dev.to Book Review Poster ===`);
  console.log(`Books in catalog: ${BOOKS.length}`);
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
