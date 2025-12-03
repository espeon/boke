---
title: "Where are your tools, man?"
date: 2025-10-27
description: These are my tools. They're crappy student model tools, and I play better than you.
draft: true
---

> James Jamerson used one finger.<br>
> John McEnroe used a Dunlop. He used a Dunlop Revelation 200G.<br>
> And where are your tools, man?<br>
> These are my tools. They're crappy student model tools, and I play better than you.<br>
> -- [Vulfmon - James Jamerson Used One Finger](https://www.youtube.com/watch?v=pEpALB3SFTo)

The importance of tools can't be understated, but tools can't make the player. A good tool, when properly used, can amplify what your already have - given that you actually know how to use it.

## The Cult of the Tool
In software development (and especially javascript/typescript), there's a tendency to chase the newest, the 'latest and greatest' tools. New frameworks, new libraries, new compilers, new languages. It's pretty easy to feel like you're falling behind if you're not up to date, using the latest tools.

But. Tools don't necessarily make you a better developer. A great developer can make great software with mediocre tools. A mediocre developer can make mediocre software with the best tools.

There's a question fairly commonly asked in tech circles: "What are your tools?"

It's a fair question: it's interesting to know what tools people use and their reasoning behind them.

It's also kind of a trap. It gives a higher focus on *your tools* rather than *your skills*.
It can lead to a sense of security - "I'm using the same tools as x other popular developer, or triangle company, so therefore I'm set and don't need to improve my fundamentals".

This applies to LLMs as well, especially when people are using them not just as coding assistants, but *actively letting them write code with zero oversight*. Let me reframe this:
Would you let a mediocre human junior developer, who (somehow?) can't learn from mistakes, write code for you, with zero oversight, review, or testing? If not, why would you let an LLM do the same?

Anyways, back to tools.

## Who are these people, even?

Jamerson did in fact use one finger. He's probably the greatest bass player of all time. He used a crappy student model bass guitar, and is better than you at bass than you are at basically anything.

McEnroe used a Dunlop Revelation 200G, which honestly is a pretty mediocre tennis racquet. He was still one of the greatest tennis players of all time. He was a huge baby and had a [insanely firey temper](https://en.wikipedia.org/wiki/John_McEnroe#In_popular_culture) (to put it lightly), but he was also really talented and knew how to use that racket, and that reflected in his gameplay.

He also tended to smash his rackets when he got angry, so he went through a lot of them. This didn't mean he was a bad player - quite the opposite! He was a great player, with great skills, and the racket was just a tool to help him express those skills (in more ways than one).

The point is: tools are important, but they don't make the player. A great player can use mediocre tools to great effect. A mediocre player will struggle with even the best tools.

So, focus on your fundamentals. Learn your craft. Practice, practice, practice. Get good at what you do.

Then, pick tools that help you express your skills better. Tools that amplify what you already have.

## Why wouldn't you start with the basics?

> James Jamerson used one finger<br>
And you point, you point to what you want<br>
I'll get, I'll have, I'll go with<br>
Where are you going?

In software development, the basics are things like:
- Knowing how to write clean, maintainable code
- Understanding design patterns and architecture
- Testing and debugging skills
- Version control (e.g., Git)
- Problem-solving and algorithmic thinking
- Language proficiency (e.g., JavaScript, Python, etc.)

There are also a lot of soft skills that are important:
- Communication
- Collaboration
- Time management

and also, the most important one of all: learning how to learn. The tech landscape can change rapidly, and being able to pick up new skills and adapt is extremely valuable.

It's a lot! But getting these basics down pat are what will make you a great developer, regardless of the tools you use.

This leads to my main point: Don't necessarily start with tools, start with the basics.

I view tools as a magnifier for your skills. If your skills are weak or nonexistent, no tool will completely save you. Not even the fanciest LLM.

With LLMs specifically, you need to learn management skills as well. How to prompt them effectively, how to review their output, how to test and validate their code, and more. These mainly fall into the 'soft skills' category, and transfer well to working with real developers with real teams as well. But those kinds of soft skills *also* rely on solid fundamentals.

Prompting requires language fundamentals and library knowledge. Reviewing output requires understanding of code structure, design patterns, and debugging skills. Testing and validating code requires knowledge of testing frameworks, smart test case design, and more.

This kind of leads into another point: tools can flatter you into a false sense of security. You might think "Oh, I'm using the latest LLM, or the latest tools that advertise zero bugs or perfect code generation, so I don't necessarily need to know how to code or review code myself".

This is a dangerous mindset.

Just like real people writing real libraries, LLMs can make mistakes, and they can betray you in real conditions. In this situation, fundamentals are even more important - if the LLM doesn't know what's wrong, how can it fix it? If you don't know what's wrong, how can you fix it?

LLMs are just tools. They're great tools in the right hands! But they aren't magic. They can't replace solid fundamentals, skills, and knowledge, on the part of the developer using them.

## What the hell?

Neural networks, and by extension large language models, are pretty interesting, ignoring the hype, and pretty complex as well. At a super high level, they work similarly to a human brain. They learn patterns from unstructured data, and then use those patterns to generate new data. It's learn-by-example, but on a massive scale. They ingest mountains of tokenised text, notice statistical regularities, and predict the best tokens to come next, given a prompt.

This means that they don't necessarily understand like we do. They compress patterns into a high-dimensional space, and use that to generate new text. They don't have a model of the world, or necessarily a deep understanding of concepts like we may. They just know what patterns are likely to come next, given a prompt.

And they're super good at that! Luckily, most of software engineering is that kind of thing: pattern recognition and generation. Given a prompt (e.g., "write a function that does X"), they can generate code that matches the patterns they've seen during training.

The "learning patterns" and the "using learned patterns" mentioned earlier are completely separate processes. The model learns patterns during training. This is called the training phase. Once trained, the model is "frozen" - it can't learn new patterns. It can only use the patterns it learned during training to generate new text. This is called the inference phase.

This means that if the model encounters something it hasn't seen before, it *can't learn from it*, obviously. This is a big reason why they hallucinate: they create confident, plausible fabrications that read well but are false. They lack an internal fact‑checker or lived grounding, so in this case, they just make stuff up. Plausibility can be a plus in cases, (LLMs can get a lot of the way at times with that) but nothing beats real knowledge and understanding.

An LLM can generate a compiling code sample that has a major security hole, or invent a library that never existed. Both look convincing with someone who doesn't know better, but can be wrong or dangerous in practice.

Put an LLM in capable hands, and it multiplies productivity. Put the same LLM in a role where nobody checks its work and it generally ends up being a disaster.

Where are your tools, man?

## im just vibing man

> Subcamp, Bandstack, Faceschnook, Classact <br>
All just tools, man <br>
Buy an island in Hawaii with your SaaS money <br>
You won't get a rise out of me

Vibe coding, at times, is just the tool fetishism mentioned earlier on crack. Just throw the best tools using the best LLMs you can get your hands on at a problem, and hope for the best.

It works sometimes, and that's great! I've done it at times, just for fun. But it clearly isn't an end-all-be-all solution. It's not something I'd want to actually work with. Especially when said vibe coder isn't skilled at using those tools, or doesn't have solid fundamentals to back them up. It's super flashy and super quick, which makes it appealing for quick prototyping, but it can lead to a false sense of security.

There are sites and apps dedicated to giving you an easy time vibe coding with LLMs, such as [v0](v0.dev), [Lovable](lovable.dev), and more. In my opinion, a lot of these generate generic sites with generic UIs (at least, if you use them as intended), and they don't stand out at all among the sea of the New Vibe Coded Age. They don't have that human touch, or exceptional UI sense, or deep understanding of user needs like an individual developer who knows the project well would.

The odd thing is how easily we forgive these vibe coded apps for being generic and unremarkable. We applaud the demo and then act surprised when the app fails under actual usage, or when technical debt becomes a [three alarm fire](https://en.wikipedia.org/wiki/Multiple-alarm_fire). I feel like vibe coding is usually theatre and not actual substance, and that the tools are being used to impress the layperson rather than to build something actually useful.

The rise of vibe coding is really confusing to me. How does one get millions of dollars in funding, or millions of dollars in contracts for an app that was built in a weekend with an LLM and some boilerplate code? How do you even justify the value of that?

None of this teaches you how to write code that scales, or how to rearchitect and then migrate a codebase that has outgrown its initial design. It doesn't teach you how to debug complex issues, or how to design systems that are maintainable and extensible.

You're supposed to know that, not the LLM. If you don't, you can learn on the job. If you know your fundamentals, LLMs can be a great tool to amplify your skills. If you don't, you're going to have a bad time.

## The Payoff

But why wouldn't you just use the best tools, the best LLMs, and vibe code your way to success?

The payoff of solid fundamentals is that you can pick up any tool, any language, any framework, and use it effectively. It's easier to adapt to new technologies, and learn new skills. You can also evaluate tools more critically, and choose the ones that actually help you rather than just following the hype.

There's a reason why everyone still uses React. Solid documentation, a strong community, and a extremely rich ecosystem of libraries, tools, and resources. So long as you know your fundamentals, and can adapt quickly, I'm sure you can pick up the basics of React (or really any other framework) within a few days and use it effectively.

If you wanted to, say, rearchitecture your backend, the ideal is to be able to jump right in, read some docs for your chosen framework, and get started. You don't want to be stuck trying to learn the basics of the language or framework while also trying to understand your existing codebase.

But with vibe coding, you may get an initial payoff, but you may struggle to adapt. You get the initial demos working, you may get press, and you may even get some VC funding. You're winning! Right? Right????

When it comes to scaling, maintaining, and evolving the codebase, you may find yourself in over your head. You may find that the tools you used don't actually fit your needs, or that you need to switch to a different tool, and you don't know how to do that effectively. You say "move to xyz framework" and suddenly the LLM fucks your whole codebase up because it doesn't understand the context, or the new framework has different paradigms that it can't understand.

Instead, if you knew what you were doing, you'd say "move to xyz framework" and give more info, like "use slices for state management, KISS, and separate concerns properly". You'd be able to guide the LLM better, and get better results.

People say to treat LLMs like junior developers. They can do a lot of the grunt work, but they need guidance, oversight, and mentorship from a skilled developer. They can't replace the skilled developer, they can only amplify their skills by following good instructions, and doing the grunt work.

## Spectacle

> Call out the phonies, reject drab, know your tools <br>
Say something good and move on

Everyone loves spectacle and flashiness. It's exciting and new! Investors tend to love seeing flashy demos, and they love to see new tools and technologies.

But spectacle can be deceiving. Investors and customers can be fooled by flashy demos and new tools, but they can also be disappointed when the product doesn't live up to the hype. They may intend to fund a product that is easy to use, reliable, and scalable, like the pitch deck may promise, but they won't get that if the product is built on shaky fundamentals.

All of this leads to a lack of focus on the actual product and its users, and more focus on the tools and spectacle.

## Is there nuance?

Yeah, definitely.

There are definitely times when explicitly using the latest tools and technologies can be beneficial, especially when messing around or prototyping. It can be fun to experiment with new tools and see what they can do! New ideas can come from new tools, and new tools can inspire new ways of thinking about problems.



## Anyways

> Call out the phonies, you are doing the real thing <br>
Reject drab, wear bright colors and play fast

You can't out-tool a lack of fundamentals. You can certainly try, and succeed in the short term, but eventually, if you don't know what the hell you're doing, no tool will ever save you.

You'll never be the best at your craft.

So, where are your tools, man?


> Were you able to follow that? No.
