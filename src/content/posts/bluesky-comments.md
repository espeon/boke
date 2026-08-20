---
title: "Building Bluesky Comments for My Blog"
description: "I hate disqus too much."
date: "Aug 6 2025"
---

## The Comment System Problem

I've been running my blog without decent comments for years. Not by choice, really - I just couldn't find a solution that didn't suck.

* Disqus? Slow, heavy, tracks users, and I don't own anything. Plus it makes every page 100x slower to load.

* Self-hosted solutions? Great in theory. (not really.) You're signing up to manage users, moderate spam, maintain databases, and deal with all the headaches that come with running basically a miniature social platform. And if your users aren't where you are, it's probably slow as hell.

* GitHub Issues as comments? Probably works for some developer blogs, but feels hacky and limits your audience to people with GitHub accounts.

* No comments at all? Clean and simple, but you lose the conversations. Some of my favorite discoveries came from comment threads that went in unexpected directions.

I've been a Bluesky user for a while. Recently, the community has been feeling healthier than Twitter ever did, the API is designed, and this decentralized approach means I don't necessarily have to be beholden to a single company. People have been doing some interesting things with Bluesky, like on-protocol blog content and using Bluesky comments as a comment system. Why not do some of that for myself?

## Why Bluesky Actually Makes Sense

The more I thought about it, the more directly using Bluesky for comments made sense:

* No infrastructure to maintain. (for me, at least) I don't need to run databases, manage user accounts, or build moderation tools. Bluesky handles all of that.

* Rich(er) content support. People can post images, links, and in threads. All the stuff that makes conversations interesting.

* Real identities. Since people are using their actual Bluesky profiles, and your one profile can *actually* be used on any supported platform, there's more accountability and less incentive to drive-by troll.

* Cross-platform conversations. Comments live on Bluesky too, so people can discover my blog posts through social media and vice versa.

* I own my content, they own theirs. No platform lock-in for anyone!

The workflow is simple: I publish a blog post, share it on Bluesky, edit the post to add the AT URI, and the replies to that Bluesky post become the comments on my blog.

## Building the Component

### Understanding the AT Protocol

Bluesky runs on the AT Protocol, which has surprisingly okay documentation. The key concepts I needed:

- **DIDs** (Decentralized Identifiers): Unique user IDs like `did:plc:abc123...` or `did:web:joe.coffee`
- **CIDs** (Content Identifiers): Unique post IDs
- **AT URIs**: Addresses for content like `at://did:plc:user.../app.bsky.feed.post/postid`

To fetch comments, I just need to call the `getPostThread` endpoint with the right URI. No authentication required. Easy peasy.

### Component Architecture

I ended up with three main pieces:

1. The main comments component that fetches and displays the thread.
2. A reply component that handles rendering individual posts and their replies. Also includes metadata and a link to the original Bluesky post.
3. An embed component for rich content like images and open graph previews.

This separation made each piece reasonably manageable, reasonable, and small.

### The Threading Challenge

The interesting part was handling nested replies. Bluesky threads can go arbitrarily deep, but I needed to display them in a way that's readable and doesn't break layouts.

I settled on a naive recursive approach where each reply can render child replies, with visual indentation to show the hierarchy. I cap it at 5 levels deep because beyond that, conversations usually devolve into two people arguing anyway.

```typescript
const MAX_DEPTH = 5;
const BlueskyReply = ({ thread, depth = 0 }) => {
  return (
    <div style={{ marginLeft: depth * 12 }}>
      {/* Render the post content */}

      {depth < MAX_DEPTH && thread.replies?.map(reply =>
        <BlueskyReply thread={reply} depth={depth + 1} />
      )}
    </div>
  );
};
```

### Handling Rich Content

One of the nice things about Bluesky is that posts can contain more than just text. People embed images, external links, and even quote other posts. Each embed type needs special handling.

**Images** were the most complex. Bluesky serves them through their CDN, and people often post multiple images in a single reply. I built a responsive grid layout that adapts based on image count, plus a modal for viewing images full-screen.

**External links** get rendered as cards with thumbnails and descriptions, just like they appear in Bluesky apps.

**Other embed types** get a graceful fallback message since the AT Protocol is extensible and new embed types might appear.

### Integrating with Astro

Getting this working with my Astro blog was straightforward. I had the React integration (which I already had for my background and music components) and used the `client:load` directive to ensure the comment component hydrates immediately:

```astro
---
import BlueskyComments from '../components/bsky-comments.tsx';
---

{post.data.bsky && (
  <BlueskyComments
    did={post.data.bsky.did}
    postCid={post.data.bsky.postCid}
    client:load
  />
)}
```

Now I just add this to any post's frontmatter to enable comments:

```yaml
bsky:
  did: "my-bluesky-did"
  postCid: "the-post-id"
```

## What I Learned

### TypeScript is Your Friend

There are proper TypeScript types for all their API responses through the `@atcute/client` package. This made development much smoother as I could rely on autocomplete and catch type errors before they became runtime bugs.

### Progressive Enhancement Works

I built the comments as an enhancement to the blog, not a core dependency. If JavaScript is disabled or the API is down, the blog post (rendered a long time ago) still works perfectly. The comments just don't appear.

### Performance by Default (-ish)

Since I'm not managing any backend infrastructure, server-side performance optimizations are just there. Bluesky's CDN handles image delivery, their public API is fast and cached, and I don't have to care about database queries or server scaling.

## The Results

I'm pretty happy with how it turned out. The conversations feel more natural than traditional blog comments - people use their actual profiles, share images and links, and more. It's a lot more like social media.

## What's Next

I'm considering a few improvements, but honestly, the core system works so well that I'm not in a rush to change it. Sometimes the best solution is the one just works, almost invisibly.

## Why This Approach Works

Traditional comment systems try to recreate social media features on every individual website. I think that's backwards. People already have social media accounts they like using. Instead of forcing them to create new accounts and learn new interfaces, why not try meeting them where they already are?

This approach scales with the platform because it *uses* the platform. As Bluesky grows, more people can participate in blog discussions without any additional work from me. And because everything is built on open protocols, I'm not locked into any single platform's decisions. If Bluesky ever changes for the worse, I can always switch to another AppView, such as zeppelin or Blacksky's AppView.

I could theoretically even write my own comments AppView. ATProto is designed to be flexible, especially with data, so doing such would be quite simple. I'd just need to listen to the right events on the firehose and store the data in a way that makes sense and rebuild the comment thread every so often.

In my opinion, the web is better when independent sites can connect to broader conversations without sacrificing their independence. I feel like this ~~is~~ was the goal of other decentralised platforms like Mastodon, but Bluesky's focus on user-owned identities and app intercompat via the PDS ultimately makes it a better fit.

---

*Want to see it in action? The comments are right below this post, powered by the system I mentioned above. Meta.*
