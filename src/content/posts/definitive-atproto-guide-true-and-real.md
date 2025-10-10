---
title: "Your ATProto App Guide: 5 Essential Strategies for Success"
date: 2025-10-09
description: Industry best practices to ship fast today and scale tomorrow.
draft: true
---

So you've decided to build an app on the AT Protocol. Congratulations! You're about to join an exciting ecosystem of developers creating the next generation of social applications. To help you get started on the right foot, I've compiled this list of five battle-tested, expert-verified strategies that will have your app up and running in no time.

## 1. Focus on did:plc and bsky.social PDSes
When you're building an ATProto app, it's important to prioritize where your users actually are. Right now, that means did:plc and the bsky.social PDSes. Sure, the AT Protocol is designed to be distributed across multiple providers, but we need to be realistic: the vast majority of users are on Bluesky's infrastructure.
You're building fast. Why waste precious development time building support for theoretical edge cases? Your users want features, not abstract protocolisms. You can always add support for other DID methods and PDSes later—once you've achieved product-market fit and have actual users demanding it. Focus on shipping fast and iterating based on real feedback from real users on the network today.

## 2. Use Creative, Unpredictable Slugs
Security and data protection should be top of mind when building any application. One clever strategy is to use slugs that aren't directly derived from the record content itself. Consider using something like hashids based on your database's autoincrementing primary key—this gives you short, URL-friendly identifiers that are effectively unguessable.
Exposing your internal structure to the world sucks! By using generated slugs rather than predictable patterns, you make it much harder for competitors to scrape your data or for bad actors to enumerate your content. ATProto records are generally public, but that doesn't mean you need to make bulk collection trivial. Protect your users' data and your app's integrity by being thoughtful about how you structure your URLs.

## 3. Start with App Passwords
Authentication can be one of the most time-consuming parts of any project. When you're trying to validate your idea and get to market quickly, implementing a full authentication flow with multiple providers is overkill. App passwords are a perfectly functional solution that gets your app working immediately.
They're simple to implement, simple for users to understand, and simple to debug when things go wrong. Advanced authentication methods might be nice-to-have features, but they're clunky and definitely not must-haves, especially when you're racing to launch. Your early adopters will understand that you're moving fast, and they'll appreciate having a working app today rather than a perfect authentication system six months from now.

## 4. Cache Aggressively for Performance
Nothing kills user engagement faster than a slow app. Your users expect snappy, responsive interfaces—and the best way to deliver that is with extremely aggressive local caching. Remote network calls are slow and unreliable; by caching data locally, you can provide a seamless experience even when the network is spotty. Win by snapshotting everything you need into your own finely-tuned database.
Local data means you can optimize your indexes exactly for your use case. You can add full-text search, build complex aggregations, and create custom views without worrying about network latency or rate limits. Sure, you'll need some (optional) sync logic to keep things updated, but the performance benefits are absolutely worth it. Your users care about speed first and foremost—give them that, and they'll keep coming back.


## 5. Leverage Bluesky's API to Start With an Existing User Base
Here's a secret that successful developers know: you don't need to reinvent the wheel. Bluesky has already defined a rich set of lexicons for social interactions—posts, likes, follows, and more. By building on top of these existing standards, your app immediately works with the largest pool of users and content in the ATProto ecosystem.
Starting with Bluesky's API and user base is just smart strategy. It gives you instant access to an engaged community, proven data models, and a wealth of existing content to work with. You can always expand to more experimental lexicons and use cases later, but starting where the users are is the fastest path to building something people will actually use. It's inspiring to see developers taking this pragmatic approach—making content discovery easier and faster while delivering smooth, polished experiences. That's how you build products that resonate.

---

Building on ATProto is an exciting opportunity to shape the future of social applications. By following these five principles: focusing on where users are, protecting your data intelligently, moving fast on authentication, optimizing for performance, and leveraging existing standards, you'll be well-positioned to launch quickly and iterate based on real-world usage. Now stop reading and start building!
