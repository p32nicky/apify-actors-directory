const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const DEVTO_API_KEY = process.env.DEVTO_BOOK_API_KEY || '';
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

// ─── Book catalog (real books, real ASINs) ──────────────────────────────────
const BOOKS = [
  {
    title: 'Clean Code',
    subtitle: 'A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    asin: '0132350882',
    category: 'software-craft',
    tags: ['programming', 'beginners', 'career', 'productivity'],
    year: 2008,
    pages: 464,
    summary: `Clean Code is the book that changed how a generation of developers think about writing software. Robert "Uncle Bob" Martin argues that code is read far more often than it's written, so readability and clarity should be your top priority.\n\nThe book walks through real-world examples of messy code and refactors them step by step. You'll learn about meaningful naming, small functions, proper commenting (and when NOT to comment), error handling, and how to structure classes and modules.\n\nThe later chapters tackle code smells — patterns that indicate deeper problems — and show how to systematically improve legacy codebases without breaking things.`,
    review: `This is the book I recommend to every developer who's been coding for 6-12 months and wants to level up. The first half is immediately actionable — you'll start writing better variable names and shorter functions the next day.\n\nThe second half on refactoring and code smells is more advanced but equally valuable. Some of the Java examples feel dated, but the principles are timeless and apply to any language.\n\n**Who should read it:** Every developer, period. Junior devs will learn good habits early. Senior devs will find words for things they already intuit.\n\n**Skip if:** You're looking for language-specific patterns or system design — this is about the craft of writing code at the function/class level.`,
    related_searches: ['software craftsmanship books', 'refactoring books for developers', 'Robert C Martin books'],
  },
  {
    title: 'The Pragmatic Programmer',
    subtitle: 'Your Journey to Mastery (20th Anniversary Edition)',
    author: 'David Thomas and Andrew Hunt',
    asin: '0135957052',
    category: 'software-craft',
    tags: ['programming', 'career', 'beginners', 'productivity'],
    year: 2019,
    pages: 352,
    summary: `The Pragmatic Programmer is a career-spanning guide to becoming a better developer. First published in 1999 and updated for its 20th anniversary, it covers everything from personal responsibility and career management to coding techniques and project automation.\n\nThe book is organized around 100 practical tips like "Don't Repeat Yourself," "Automate Everything," and "Use Tracer Bullets." Each tip is explained with real scenarios and actionable advice.\n\nUnlike books that focus on one technology, this one teaches you how to think. It covers debugging strategies, estimation, requirements gathering, team dynamics, and how to stay sharp throughout a long career.`,
    review: `If I could only recommend one programming book, this would be it. The 20th anniversary edition is worth buying even if you own the original — it's been substantially rewritten with modern examples.\n\nThe "tracer bullet" concept alone is worth the price. The book teaches you to build thin, end-to-end slices of functionality first, then iterate — an approach that's saved me countless hours.\n\n**Who should read it:** Developers at any level. New devs get a roadmap. Experienced devs get a framework for mentoring.\n\n**Skip if:** You want deep dives into specific technologies. This is about principles, not implementation details.`,
    related_searches: ['best programming books for career growth', 'software development philosophy books'],
  },
  {
    title: 'Designing Data-Intensive Applications',
    subtitle: 'The Big Ideas Behind Reliable, Scalable, and Maintainable Systems',
    author: 'Martin Kleppmann',
    asin: '1449373321',
    category: 'system-design',
    tags: ['webdev', 'database', 'architecture', 'programming'],
    year: 2017,
    pages: 616,
    summary: `DDIA (as developers call it) is the definitive guide to understanding how modern data systems work under the hood. Martin Kleppmann covers databases, message queues, stream processing, batch processing, and distributed systems with exceptional clarity.\n\nThe book explains the tradeoffs between different database models (relational, document, graph), replication strategies, partitioning schemes, and consistency models. It doesn't just tell you what to use — it explains why each approach exists and when it breaks down.\n\nPart III on derived data is particularly valuable, covering how to combine batch and stream processing to build reliable data pipelines.`,
    review: `This is the single best technical book I've read in the last decade. Kleppmann has a gift for making complex distributed systems concepts genuinely understandable.\n\nEvery chapter builds on the previous one, creating a mental model of how data flows through modern systems. After reading it, you'll understand why your database makes certain tradeoffs and how to choose the right tool for your specific problem.\n\n**Who should read it:** Backend developers, data engineers, and anyone who designs systems that store or process data. Essential for system design interviews.\n\n**Skip if:** You're purely frontend or just starting to code. Come back after a year of backend experience.`,
    related_searches: ['system design books', 'distributed systems books', 'database internals books'],
  },
  {
    title: 'System Design Interview',
    subtitle: 'An Insider\'s Guide (Volume 1)',
    author: 'Alex Xu',
    asin: 'B08CMF2CQF',
    category: 'system-design',
    tags: ['career', 'webdev', 'architecture', 'programming'],
    year: 2020,
    pages: 322,
    summary: `Alex Xu's System Design Interview walks through 16 real system design problems step by step: URL shortener, news feed, chat system, notification service, rate limiter, key-value store, and more.\n\nEach chapter follows a consistent framework: understand the problem, estimate scale, propose a high-level design, dive into components, handle edge cases, and discuss tradeoffs. The diagrams are clear and the explanations assume you know how to code but haven't designed large systems before.\n\nThe book also covers fundamentals like load balancing, caching, CDNs, database sharding, and message queues as building blocks you'll reuse across designs.`,
    review: `If you have a system design interview coming up, buy this book today. It's the most practical, structured resource available for this specific skill.\n\nThe framework Xu teaches — requirements → estimation → high-level → deep dive → wrap up — is exactly what interviewers expect. The 16 problems cover the most commonly asked questions at FAANG companies.\n\n**Who should read it:** Anyone preparing for system design interviews at mid to senior level. Also useful for developers who want to understand how large-scale systems are built.\n\n**Skip if:** You want deep academic treatment of distributed systems — read DDIA instead. This is optimized for interviews.`,
    related_searches: ['system design interview prep books', 'software engineering interview books', 'Alex Xu volume 2'],
  },
  {
    title: 'System Design Interview Volume 2',
    subtitle: 'An Insider\'s Guide',
    author: 'Alex Xu and Sahn Lam',
    asin: '1736049119',
    category: 'system-design',
    tags: ['career', 'webdev', 'architecture', 'programming'],
    year: 2022,
    pages: 434,
    summary: `Volume 2 picks up where the first book left off with 13 more system design problems: proximity service, nearby friends, Google Maps, distributed message queue, metrics monitoring, ad click event aggregation, hotel reservation, distributed email service, S3-like object storage, real-time gaming leaderboard, payment system, digital wallet, and stock exchange.\n\nThe problems are more complex than Volume 1 and go deeper into specific domains. The payment system and stock exchange chapters are particularly detailed, covering consistency requirements that don't come up in simpler designs.`,
    review: `A worthy sequel that tackles harder, more specialized problems. If you've already read Volume 1, this adds significant depth.\n\nThe payment system and stock exchange chapters are standouts — they cover domain-specific constraints (exactly-once processing, regulatory requirements) that you won't find in generic system design resources.\n\n**Who should read it:** Anyone who found Volume 1 useful and wants more practice, especially for senior/staff-level interviews where the problems are more complex.\n\n**Skip if:** You haven't read Volume 1 yet. Start there — the framework and fundamentals are essential context.`,
    related_searches: ['advanced system design books', 'staff engineer interview prep'],
  },
  {
    title: 'Cracking the Coding Interview',
    subtitle: '189 Programming Questions and Solutions',
    author: 'Gayle Laakmann McDowell',
    asin: '0984782850',
    category: 'interview-prep',
    tags: ['career', 'programming', 'beginners', 'productivity'],
    year: 2015,
    pages: 687,
    summary: `CTCI is the bible of coding interview prep. Gayle McDowell, a former Google/Microsoft/Apple interviewer, breaks down 189 problems across arrays, linked lists, trees, graphs, recursion, dynamic programming, sorting, bit manipulation, and more.\n\nBut it's not just a problem set. The first section covers the entire interview process: how tech companies evaluate candidates, how to structure your resume, behavioral questions, Big O analysis, and strategies for solving problems you've never seen before.\n\nEach problem includes a detailed walkthrough of the thought process, not just the final solution. The hints system lets you try problems yourself before seeing the answer.`,
    review: `Still the gold standard for coding interview prep after all these years. The problem selection is excellent — they're representative of what you'll actually face, not obscure competitive programming puzzles.\n\nThe Big O chapter alone is worth buying the book for. McDowell explains time and space complexity more clearly than any CS textbook I've read.\n\n**Who should read it:** Anyone interviewing at tech companies, from new grads to experienced developers switching jobs.\n\n**Skip if:** You've already done 200+ LeetCode problems and have your own system. At that point, you'd get more value from mock interviews.`,
    related_searches: ['coding interview preparation books', 'leetcode companion books', 'tech interview guides'],
  },
  {
    title: 'Learning JavaScript Design Patterns',
    subtitle: 'A JavaScript and React Developer\'s Guide',
    author: 'Addy Osmani',
    asin: '1098139879',
    category: 'javascript',
    tags: ['javascript', 'webdev', 'react', 'programming'],
    year: 2023,
    pages: 530,
    summary: `Addy Osmani (Chrome team at Google) updated his classic design patterns book for modern JavaScript and React. The book covers classical patterns (Singleton, Observer, Mediator, Factory) adapted for ES modules, plus modern patterns specific to React (Hooks patterns, Higher-Order Components, Render Props, Islands Architecture).\n\nThe second edition adds significant coverage of rendering patterns (SSR, SSG, streaming, progressive hydration), performance patterns (code splitting, tree shaking, dynamic imports), and React-specific patterns for state management and component composition.\n\nEach pattern includes when to use it, when to avoid it, and real code examples.`,
    review: `The 2nd edition is essentially a new book. If you bought the original, upgrade — the React and rendering pattern chapters are excellent.\n\nOsmani's strength is explaining the "why" behind patterns. You won't just learn what the Observer pattern is — you'll understand exactly when it solves a real problem in your React app versus when it's overengineering.\n\n**Who should read it:** JavaScript and React developers who want to write more maintainable code. Especially valuable at the 2-5 year experience level.\n\n**Skip if:** You're not working in JavaScript/TypeScript. The patterns are universal but the examples are JS-specific.`,
    related_searches: ['JavaScript books 2024', 'React design patterns', 'Addy Osmani books'],
  },
  {
    title: 'Eloquent JavaScript',
    subtitle: 'A Modern Introduction to Programming (4th Edition)',
    author: 'Marijn Haverbeke',
    asin: '1718504101',
    category: 'javascript',
    tags: ['javascript', 'webdev', 'beginners', 'programming'],
    year: 2024,
    pages: 472,
    summary: `Eloquent JavaScript is the best introduction to programming through JavaScript. The 4th edition covers modern JS (ES2023+), the browser DOM, Node.js, and even builds a small programming language as a learning exercise.\n\nThe book starts from zero — variables, control flow, functions — but quickly ramps up to closures, higher-order functions, prototypes, async/await, and modules. Each chapter ends with exercises that genuinely test understanding.\n\nThe project chapters are the highlight: a robot simulation, a programming language interpreter, a pixel art editor, and a platform game. These tie together everything you've learned into real applications.`,
    review: `The best beginner JavaScript book, period. Haverbeke strikes the perfect balance between teaching programming fundamentals and JavaScript specifics.\n\nThe exercises are challenging in a good way — they make you think rather than just copy patterns. The project chapters are where everything clicks. Building a programming language interpreter in Chapter 12 is a mind-expanding experience.\n\n**Who should read it:** Complete beginners who want to learn programming through JavaScript. Also great for self-taught developers who want to fill gaps in their fundamentals.\n\n**Skip if:** You already know JavaScript well. Look at "JavaScript: The Good Parts" or the design patterns book instead.`,
    related_searches: ['learn JavaScript books', 'beginner programming books 2024', 'JavaScript tutorial books'],
  },
  {
    title: 'Python Crash Course',
    subtitle: 'A Hands-On, Project-Based Introduction to Programming (3rd Edition)',
    author: 'Eric Matthes',
    asin: '1718502702',
    category: 'python',
    tags: ['python', 'beginners', 'programming', 'tutorial'],
    year: 2023,
    pages: 552,
    summary: `Python Crash Course is the bestselling Python book for a reason — it teaches real Python through three substantial projects: a Space Invaders-style game (Pygame), a data visualization dashboard (Matplotlib/Plotly), and a web application (Django).\n\nPart 1 covers Python fundamentals: variables, lists, dictionaries, functions, classes, files, and testing. Each concept is introduced with clear examples and exercises.\n\nPart 2 is where it shines. The three projects are real applications, not toy examples. By the end you'll have built things you're genuinely proud of and have a portfolio to show for it.`,
    review: `If someone asks me "how do I learn Python?", I hand them this book. The 3rd edition is updated for Python 3.11+ and modern best practices.\n\nThe project-based approach works because you see why each concept matters. Learning about classes in isolation is boring. Learning about classes because your game needs a Ship and an Alien is motivating.\n\n**Who should read it:** Complete beginners to programming, or experienced developers learning Python as an additional language.\n\n**Skip if:** You already write Python. Look at "Fluent Python" for intermediate/advanced topics.`,
    related_searches: ['learn Python books 2024', 'Python beginner books', 'Python project books'],
  },
  {
    title: 'Fluent Python',
    subtitle: 'Clear, Concise, and Effective Programming (2nd Edition)',
    author: 'Luciano Ramalho',
    asin: '1492056359',
    category: 'python',
    tags: ['python', 'programming', 'advanced', 'tutorial'],
    year: 2022,
    pages: 1012,
    summary: `Fluent Python is the book that turns a Python programmer into a Pythonista. Ramalho dives deep into the features that make Python unique: the data model (dunder methods), iterators and generators, closures and decorators, type hints, concurrency with asyncio, and metaprogramming.\n\nThe 2nd edition adds extensive coverage of type hints, pattern matching (match/case), dataclasses, and modern async patterns. At 1000+ pages, it's comprehensive — but every page teaches something you can use.\n\nThe key insight is the Python data model. Once you understand how __repr__, __len__, __getitem__, and other special methods work, you can write classes that feel native to the language.`,
    review: `This is the most important Python book after you've learned the basics. It transformed how I write Python — my code became shorter, more readable, and more "Pythonic" almost immediately.\n\nThe generators and iterators chapters are worth the price alone. Understanding how Python's iteration protocol works under the hood unlocks a level of elegance in your code that's hard to achieve otherwise.\n\n**Who should read it:** Python developers with 1+ year of experience who want to write idiomatic, professional Python.\n\n**Skip if:** You're new to Python (read Python Crash Course first) or you only use Python for quick scripts and don't need deep language knowledge.`,
    related_searches: ['advanced Python books', 'intermediate Python books', 'Python best practices books'],
  },
  {
    title: 'Staff Engineer',
    subtitle: 'Leadership Beyond the Management Track',
    author: 'Will Larsen',
    asin: '1736417916',
    category: 'career',
    tags: ['career', 'productivity', 'programming', 'leadership'],
    year: 2021,
    pages: 387,
    summary: `Staff Engineer maps out the career path beyond senior engineer for people who want to stay technical rather than move into management. Will Larsen interviewed 14 staff+ engineers at companies like Stripe, Slack, Auth0, and Fastly to understand what the role actually looks like in practice.\n\nThe book identifies four archetypes of staff engineers: Tech Lead, Architect, Solver, and Right Hand. It covers how to get promoted to staff, how to operate effectively once you're there, and how to create visibility for the kind of ambiguous, cross-cutting work that defines the role.\n\nKey topics include writing technical strategy documents, managing technical quality at scale, creating time for deep work, and navigating organizational politics productively.`,
    review: `If you're a senior engineer wondering "what's next?", this book answers that question better than anything else available. The four archetypes framework alone clarifies a lot of career confusion.\n\nThe interviews with real staff engineers are the highlight. Their stories are honest about the challenges — the role is less about writing clever code and more about organizational influence, which surprises many people.\n\n**Who should read it:** Senior engineers considering the staff track, and engineering managers who want to understand and support their staff engineers better.\n\n**Skip if:** You're early in your career (focus on technical depth first) or you're sure you want the management track.`,
    related_searches: ['staff engineer career books', 'senior developer career growth', 'engineering leadership books'],
  },
  {
    title: 'The Software Engineer\'s Guidebook',
    subtitle: 'Navigating Senior, Tech Lead, and Staff Engineer Positions',
    author: 'Gergely Orosz',
    asin: '908338182X',
    category: 'career',
    tags: ['career', 'programming', 'productivity', 'leadership'],
    year: 2023,
    pages: 434,
    summary: `Gergely Orosz (The Pragmatic Engineer newsletter) wrote the career guide he wished existed when he was growing from junior to staff engineer at Uber and Microsoft. The book covers the full arc: what to focus on at each level, how to get promoted, how to operate as a tech lead, and what staff-level work actually looks like.\n\nUnique sections cover code review best practices, on-call and incident response, working with product managers, navigating reorgs, and understanding how engineering organizations make decisions.\n\nThe book is practical and opinionated. Orosz doesn't just describe what each level looks like — he gives specific advice on what to do and what to avoid.`,
    review: `The most comprehensive engineering career guide available. Where "Staff Engineer" focuses on one transition, this book covers the entire journey from junior to staff.\n\nOrosz's background at both Big Tech (Uber, Microsoft) and startups gives him a balanced perspective. The code review chapter should be required reading for every team — it covers both how to review well and how to receive reviews without getting defensive.\n\n**Who should read it:** Any software engineer who wants to grow their career deliberately rather than hoping experience alone is enough.\n\n**Skip if:** You're looking for technical depth on a specific topic. This is about career strategy, not implementation.`,
    related_searches: ['software engineering career books', 'Gergely Orosz books', 'tech lead books'],
  },
  {
    title: 'Refactoring',
    subtitle: 'Improving the Design of Existing Code (2nd Edition)',
    author: 'Martin Fowler',
    asin: '0134757599',
    category: 'software-craft',
    tags: ['programming', 'webdev', 'javascript', 'productivity'],
    year: 2018,
    pages: 448,
    summary: `Refactoring is the definitive catalog of code transformations that improve design without changing behavior. Martin Fowler's 2nd edition rewrites all examples in JavaScript (the 1st edition used Java) and adds modern patterns.\n\nThe first section explains what refactoring is, when to do it, and how to convince your team it's worth the investment. The catalog section contains 60+ named refactorings — Extract Function, Inline Variable, Replace Conditional with Polymorphism, etc. — each with motivation, mechanics, and a worked example.\n\nThe key insight: refactoring isn't a separate activity. It's something you do continuously, in small steps, as part of normal development. The book teaches you to recognize when code needs improvement and how to improve it safely.`,
    review: `If Clean Code tells you what good code looks like, Refactoring tells you how to get there from where you are. The two books complement each other perfectly.\n\nThe 2nd edition's switch to JavaScript makes it more accessible to web developers. Each refactoring is small and mechanical — you can apply them with confidence because each step preserves behavior.\n\n**Who should read it:** Developers who work with existing codebases (so, everyone). Especially useful if you've inherited legacy code and need to improve it safely.\n\n**Skip if:** You're a complete beginner. Learn to write code first, then learn to improve it.`,
    related_searches: ['Martin Fowler books', 'legacy code books', 'code refactoring guides'],
  },
  {
    title: 'Head First Design Patterns',
    subtitle: 'Building Extensible and Maintainable Object-Oriented Software (2nd Edition)',
    author: 'Eric Freeman and Elisabeth Robson',
    asin: '149207800X',
    category: 'software-craft',
    tags: ['programming', 'beginners', 'java', 'webdev'],
    year: 2021,
    pages: 672,
    summary: `Head First Design Patterns teaches the Gang of Four design patterns through a visual, conversational approach. The 2nd edition updates examples for modern Java and adds patterns relevant to contemporary development.\n\nThe book covers Strategy, Observer, Decorator, Factory, Singleton, Command, Adapter, Facade, Template Method, Iterator, Composite, State, Proxy, and Compound patterns. Each pattern is introduced through a real problem scenario before showing the solution.\n\nThe "Head First" approach uses puzzles, exercises, conversations, and visual explanations to make abstract concepts stick. It's deliberately not a reference book — it's designed to teach patterns so you actually remember and apply them.`,
    review: `The most approachable design patterns book ever written. Where the original GoF book is a dense reference, Head First turns each pattern into a story you remember.\n\nThe 2nd edition feels more modern and the examples are better. The Duck Simulator example for the Strategy pattern is legendary — you'll never forget when to use composition over inheritance.\n\n**Who should read it:** Developers who've been coding for 6+ months and want to understand design patterns without the academic overhead. Great for self-taught developers.\n\n**Skip if:** You already know design patterns well or prefer terse reference material to conversational explanations.`,
    related_searches: ['design patterns books for beginners', 'Head First series books', 'OOP books'],
  },
  {
    title: 'Web Scalability for Startup Engineers',
    subtitle: '',
    author: 'Artur Ejsmont',
    asin: '0071843655',
    category: 'system-design',
    tags: ['webdev', 'architecture', 'programming', 'devops'],
    year: 2015,
    pages: 400,
    summary: `This book is a practical guide to scaling web applications from a few users to millions. Ejsmont covers the full stack: frontend optimization, web servers, caching layers, asynchronous processing, databases, search engines, and infrastructure.\n\nUnlike academic distributed systems books, this one focuses on the decisions startups actually face: when to add a cache layer, how to shard your database, when to move from a monolith to services, and how to handle eventual consistency in practice.\n\nEach chapter includes architecture diagrams, decision frameworks, and real-world tradeoffs. The message queue chapter is particularly practical — it covers when to use queues, which patterns work, and common pitfalls.`,
    review: `The most practical scaling book for web developers. DDIA is deeper on theory; this book is better on "what do I actually do on Monday morning."\n\nThe progression mirrors how startups actually grow: single server → separate database → add caching → add queues → shard → microservices. Each step is motivated by a real scaling pain point.\n\n**Who should read it:** Backend developers at startups or growing companies. Also great interview prep for system design questions with a more practical bent.\n\n**Skip if:** You're at a company where infrastructure is handled by a dedicated platform team and you won't make these decisions yourself.`,
    related_searches: ['web scalability books', 'startup engineering books', 'backend architecture books'],
  },
  {
    title: 'Building Microservices',
    subtitle: 'Designing Fine-Grained Systems (2nd Edition)',
    author: 'Sam Newman',
    asin: '1492034029',
    category: 'system-design',
    tags: ['architecture', 'devops', 'programming', 'webdev'],
    year: 2021,
    pages: 616,
    summary: `Sam Newman's Building Microservices is the definitive guide to the microservices architectural style. The 2nd edition is significantly updated with new chapters on build pipelines, deployment strategies, and the organizational aspects of running microservices.\n\nThe book covers how to decompose a monolith, define service boundaries, handle inter-service communication (sync and async), manage data across services, and deal with the operational complexity that microservices introduce.\n\nCritically, Newman is honest about when NOT to use microservices. The book includes a chapter on monolith-first strategies and discusses the real costs of distributed systems.`,
    review: `The most balanced take on microservices available. Newman doesn't evangelize — he presents microservices as a tool with specific tradeoffs and helps you decide if those tradeoffs make sense for your situation.\n\nThe 2nd edition's coverage of organizational aspects is excellent. The insight that microservices are as much an organizational pattern as a technical one is crucial and often overlooked.\n\n**Who should read it:** Architects and senior developers making decisions about service boundaries and communication patterns. Also valuable for anyone working in a microservices environment who wants to understand why things are structured the way they are.\n\n**Skip if:** You're building a small application or working solo. Microservices add complexity that only pays off at certain scales.`,
    related_searches: ['microservices architecture books', 'Sam Newman books', 'distributed systems for developers'],
  },
  {
    title: 'Learning Go',
    subtitle: 'An Idiomatic Approach to Real-World Go Programming (2nd Edition)',
    author: 'Jon Bodner',
    asin: '1098139291',
    category: 'golang',
    tags: ['go', 'programming', 'beginners', 'webdev'],
    year: 2024,
    pages: 422,
    summary: `Learning Go is the best introduction to Go for developers coming from other languages. Jon Bodner focuses on writing idiomatic Go — code that follows the conventions and patterns that experienced Go developers expect.\n\nThe book covers types, control structures, functions, pointers, methods, interfaces, generics (new in the 2nd edition), errors, modules, concurrency with goroutines and channels, the standard library, and testing.\n\nWhat makes this book stand out is its emphasis on the "why" behind Go's design decisions. You'll understand why Go doesn't have inheritance, why error handling looks the way it does, and why the simplicity is a feature, not a limitation.`,
    review: `The Go book I recommend to every developer learning the language. Bodner assumes you already know how to program and doesn't waste time on basics — he teaches you Go specifically.\n\nThe concurrency chapters are the highlight. goroutines and channels are Go's killer feature, and Bodner explains them with clarity and practical examples that you'll use in real projects.\n\n**Who should read it:** Experienced developers learning Go. The 2nd edition's generics coverage makes it current with modern Go.\n\n**Skip if:** You're a complete beginner to programming (learn with Python or JavaScript first) or you already write Go professionally.`,
    related_searches: ['Go programming books 2024', 'Golang beginner books', 'Go concurrency books'],
  },
  {
    title: 'Rust in Action',
    subtitle: 'Systems Programming Concepts and Techniques',
    author: 'Tim McNamara',
    asin: '1617294551',
    category: 'rust',
    tags: ['rust', 'programming', 'systems', 'webdev'],
    year: 2021,
    pages: 456,
    summary: `Rust in Action teaches Rust through building real systems: a CPU emulator, a file format parser, a key-value store, a simple grep clone, a networking client, and more. Instead of covering every language feature in isolation, each concept is introduced when a project needs it.\n\nThe book covers ownership, borrowing, lifetimes, traits, generics, error handling, concurrency, and unsafe Rust — all the concepts that make Rust both challenging and powerful.\n\nMcNamara's project-based approach means you see why Rust's ownership model matters in practice. When your file parser needs to handle borrowed references correctly, the borrow checker stops being an obstacle and starts being a tool.`,
    review: `The best way to learn Rust if you're a "learn by doing" developer. The projects are genuinely interesting and each one teaches important Rust concepts in context.\n\nThe ownership and borrowing explanations are clearer here than in any other Rust resource I've found. The CPU emulator project in particular drives home why Rust's memory model exists and how it prevents real bugs.\n\n**Who should read it:** Developers curious about Rust who learn best through projects. Especially good for C/C++ developers considering Rust.\n\n**Skip if:** You prefer reference-style learning (use "The Rust Programming Language" book instead) or you're not interested in systems-level programming.`,
    related_searches: ['Rust programming books', 'learn Rust 2024', 'systems programming books'],
  },
  {
    title: 'A Philosophy of Software Design',
    subtitle: '',
    author: 'John Ousterhout',
    asin: '173210221X',
    category: 'software-craft',
    tags: ['programming', 'architecture', 'productivity', 'career'],
    year: 2021,
    pages: 196,
    summary: `John Ousterhout's short, opinionated book argues that the fundamental challenge of software design is managing complexity. He introduces the concept of "deep modules" — modules with simple interfaces that hide significant implementation complexity — as the primary tool for building maintainable software.\n\nThe book challenges some popular wisdom: Ousterhout argues that small methods aren't always better, that comments are more valuable than most developers think, and that "clean code" principles sometimes increase complexity rather than reducing it.\n\nAt under 200 pages, every sentence earns its place. Key topics include information hiding, interface design, tactical vs. strategic programming, and how to recognize and reduce complexity.`,
    review: `The most thought-provoking software design book I've read. Ousterhout's "deep vs. shallow modules" framework fundamentally changed how I think about API design.\n\nThe controversial takes are the most valuable parts. His argument against tiny methods challenges Clean Code orthodoxy with a compelling alternative: optimize for the reader's cognitive load, not arbitrary line counts.\n\n**Who should read it:** Every developer with 2+ years of experience. At 196 pages, you can read it in a weekend.\n\n**Skip if:** You want concrete recipes. This book changes how you think about design; it doesn't give you step-by-step patterns.`,
    related_searches: ['software design philosophy books', 'John Ousterhout books', 'software complexity books'],
  },
  {
    title: 'Docker Deep Dive',
    subtitle: '',
    author: 'Nigel Poulton',
    asin: 'B0BLG71GY6',
    category: 'devops',
    tags: ['devops', 'docker', 'programming', 'webdev'],
    year: 2023,
    pages: 290,
    summary: `Docker Deep Dive is the most practical introduction to Docker containers. Nigel Poulton covers images, containers, networking, volumes, Docker Compose, Docker Swarm, and security — everything you need to go from "what is Docker?" to running production containers.\n\nThe book is structured as a progressive journey: install Docker, run your first container, build custom images, network containers together, persist data with volumes, orchestrate multi-container apps with Compose, and scale with Swarm.\n\nEach chapter has hands-on exercises. By the end you'll have built and deployed a multi-container application with a web frontend, API backend, and database — all orchestrated with Docker Compose.`,
    review: `The fastest path from zero to productive with Docker. Poulton's explanations are clear and the exercises work (a surprisingly rare quality in tech books).\n\nThe Compose chapters are the most valuable. Most developers use Docker through Compose, and this book teaches it thoroughly with realistic multi-service examples.\n\n**Who should read it:** Developers who need to learn Docker for work. Also good for DevOps beginners and anyone studying for the Docker Certified Associate exam.\n\n**Skip if:** You already use Docker daily. This is an introductory/intermediate book, not a deep internals reference.`,
    related_searches: ['Docker books for beginners', 'container books', 'DevOps books 2024'],
  },
  {
    title: 'Fundamentals of Software Architecture',
    subtitle: 'An Engineering Approach',
    author: 'Mark Richards and Neal Ford',
    asin: '1492043451',
    category: 'system-design',
    tags: ['architecture', 'programming', 'career', 'webdev'],
    year: 2020,
    pages: 422,
    summary: `This book defines what software architecture actually is and gives you a framework for making architectural decisions. Richards and Ford cover architecture styles (layered, microkernel, event-driven, microservices, space-based), architecture characteristics (scalability, elasticity, reliability, etc.), and the soft skills architects need.\n\nThe architecture characteristics star diagram is particularly useful — it gives you a visual way to compare tradeoffs between different architectural styles for your specific requirements.\n\nPart III on soft skills covers presenting to stakeholders, negotiation, leading teams, and developing a career path toward architecture — topics most technical books ignore.`,
    review: `The most structured introduction to software architecture available. The framework for evaluating architecture styles against requirements is something I use weekly in my actual work.\n\nThe soft skills section is surprisingly good. Architecture is as much about communication and influence as it is about technical decisions, and this book acknowledges that honestly.\n\n**Who should read it:** Senior developers moving toward architecture roles, and working architects who want a structured framework for decision-making.\n\n**Skip if:** You're early in your career. Build technical depth first, then come back to architecture when you're making system-level decisions.`,
    related_searches: ['software architecture books', 'architect career books', 'Mark Richards books'],
  },
];

// ─── Article types ──────────────────────────────────────────────────────────

function generateSingleReview(book) {
  const link = amazonLink(book.asin);
  const body = `
${book.summary}

## My Review

${book.review}

## Book Details

| Detail | Info |
|--------|------|
| **Author** | ${book.author} |
| **Pages** | ${book.pages} |
| **Year** | ${book.year} |
| **Category** | ${book.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} |

**[Get ${book.title} on Amazon](${link})**

---

## Related Reading

${book.related_searches.map(q => `- [Search: "${q}"](${searchLink(q)})`).join('\n')}
`.trim();

  return {
    title: `${book.title} — Review and Summary for Developers`,
    body,
    tags: book.tags,
    series: 'Developer Book Reviews',
  };
}

function generateComparisonPost(books, topic) {
  const comparisons = {
    'interview-prep': {
      title: 'Best Books for Coding Interviews in 2026 — Complete Guide',
      intro: 'Preparing for tech interviews? These are the books that actually help, ranked by what stage of prep they serve best.',
      filter: b => ['interview-prep', 'system-design', 'career'].includes(b.category),
      tags: ['career', 'programming', 'beginners', 'productivity'],
    },
    'career-growth': {
      title: 'Developer Career Growth: The 5 Books That Actually Move the Needle',
      intro: "Promotions don't happen by accident. These books give you the frameworks to grow from junior to staff engineer deliberately.",
      filter: b => ['career', 'software-craft'].includes(b.category),
      tags: ['career', 'programming', 'productivity', 'leadership'],
    },
    'system-design': {
      title: 'System Design Books Ranked — From Beginner to Staff Engineer',
      intro: 'Whether you\'re prepping for interviews or actually designing systems at work, here\'s what to read and in what order.',
      filter: b => b.category === 'system-design',
      tags: ['architecture', 'webdev', 'career', 'programming'],
    },
    'clean-code': {
      title: 'The Best Books on Writing Clean, Maintainable Code',
      intro: 'Writing code that works is table stakes. Writing code that other humans can read and maintain — that\'s the craft.',
      filter: b => b.category === 'software-craft',
      tags: ['programming', 'productivity', 'webdev', 'beginners'],
    },
    'javascript-mastery': {
      title: 'Best JavaScript Books in 2026 — From Beginner to Advanced',
      intro: 'JavaScript is everywhere. These books take you from first steps to design patterns and framework mastery.',
      filter: b => b.category === 'javascript',
      tags: ['javascript', 'webdev', 'programming', 'beginners'],
    },
    'python-mastery': {
      title: 'Best Python Books in 2026 — Beginner to Advanced',
      intro: 'Python\'s the most popular language in the world right now. Here\'s the reading list to actually master it.',
      filter: b => b.category === 'python',
      tags: ['python', 'programming', 'beginners', 'tutorial'],
    },
    'backend-essentials': {
      title: 'Essential Books for Backend Developers — The Complete Reading List',
      intro: 'Backend development is more than CRUD. These books cover data systems, scalability, architecture, and the operational side.',
      filter: b => ['system-design', 'devops'].includes(b.category),
      tags: ['webdev', 'architecture', 'programming', 'devops'],
    },
    'new-languages': {
      title: 'Learning Go vs Rust: The Books That Make Each Language Click',
      intro: 'Thinking about picking up Go or Rust? The right book makes all the difference. Here\'s what to read for each.',
      filter: b => ['golang', 'rust'].includes(b.category),
      tags: ['go', 'rust', 'programming', 'beginners'],
    },
  };

  const config = comparisons[topic];
  if (!config) return null;
  const selected = books.filter(config.filter);
  if (selected.length < 2) return null;

  let body = `${config.intro}\n\n`;
  body += `## Quick Comparison\n\n`;
  body += `| Book | Author | Pages | Best For |\n|------|--------|-------|----------|\n`;
  selected.forEach(b => {
    body += `| [${b.title}](${amazonLink(b.asin)}) | ${b.author} | ${b.pages} | ${b.category.replace(/-/g, ' ')} |\n`;
  });

  selected.forEach((b, i) => {
    const link = amazonLink(b.asin);
    body += `\n## ${i + 1}. ${b.title}\n\n`;
    body += `**By ${b.author}** · ${b.pages} pages\n\n`;
    body += `${b.summary.split('\n\n')[0]}\n\n`;
    body += `${b.review.split('\n\n')[0]}\n\n`;
    body += `**[Get it on Amazon](${link})**\n`;
  });

  body += `\n---\n\n`;
  body += `## Browse More Developer Books\n\n`;
  body += `- [Search all developer books on Amazon](${searchLink('software developer books 2024')})\n`;
  body += `- [Programming books bestsellers](${searchLink('programming books bestseller')})\n`;

  return {
    title: config.title,
    body,
    tags: config.tags,
    series: 'Developer Book Reviews',
  };
}

function generateTopNPost(books, topic) {
  const lists = {
    'beginner': {
      title: '7 Books Every New Developer Should Read in 2026',
      intro: 'Starting your dev career? Skip the fluff. These seven books are the ones that actually accelerate your growth.',
      filter: b => b.tags.includes('beginners'),
      tags: ['beginners', 'programming', 'career', 'webdev'],
    },
    'senior-developer': {
      title: 'Books That Made Me a Better Senior Developer',
      intro: "Past the tutorial stage? These books shaped how I think about code, systems, and career growth. They'll do the same for you.",
      filter: b => !b.tags.includes('beginners') || b.category === 'software-craft',
      tags: ['programming', 'career', 'architecture', 'productivity'],
    },
    'must-own': {
      title: 'The Developer Bookshelf: 10 Books Worth Owning in Physical Form',
      intro: "Some books you reference so often that having them on your desk pays for itself. Here's my physical bookshelf picks.",
      filter: () => true,
      tags: ['programming', 'career', 'beginners', 'productivity'],
    },
  };

  const config = lists[topic];
  if (!config) return null;
  const selected = books.filter(config.filter).slice(0, 10);

  let body = `${config.intro}\n\n`;
  selected.forEach((b, i) => {
    const link = amazonLink(b.asin);
    body += `## ${i + 1}. ${b.title} — ${b.author}\n\n`;
    body += `${b.review.split('\n\n')[0]}\n\n`;
    body += `**[Get it on Amazon](${link})**\n\n---\n\n`;
  });

  body += `## Want More Recommendations?\n\n`;
  body += `- [Browse developer books on Amazon](${searchLink('best developer books')})\n`;
  body += `- [Software engineering bestsellers](${searchLink('software engineering books bestseller')})\n`;

  return {
    title: config.title,
    body,
    tags: config.tags,
    series: 'Developer Book Reviews',
  };
}

// ─── Post type rotation ─────────────────────────────────────────────────────

const COMPARISON_TOPICS = ['interview-prep', 'career-growth', 'system-design', 'clean-code', 'javascript-mastery', 'python-mastery', 'backend-essentials', 'new-languages'];
const TOPN_TOPICS = ['beginner', 'senior-developer', 'must-own'];

function generateArticle(state) {
  const types = ['review', 'comparison', 'topN'];
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
    return { postCount: 0, lastRun: null, reviewedBooks: [], postedComparisons: [], postedTopN: [], typeQueue: [] };
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
  console.log(`Posts to create: ${count}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const state = loadState();

  for (let i = 0; i < count; i++) {
    console.log(`\n--- Article ${i + 1}/${count} ---`);

    const article = generateArticle(state);
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
