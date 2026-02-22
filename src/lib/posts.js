export const posts = [
  {
    slug: "cloud-privacy-will-be-the-new-organic-food",
    title: "Cloud privacy will be the new organic food",
    date: "2013-07-26",
    categories: ["prism", "privacy"],
    draft: true,
    content: `When franchising was started by Howard Johnson in the 1930's, no-one could predict what impact this would have on the food industry. Now forward a couple of years`,
    description:
      "When franchising was started by Howard Johnson in the 1930's, no-one could predict what impact this would have on the food industry.",
  },
  {
    slug: "what-encryption-really-means",
    title: "What encrypting your content really means",
    date: "2013-07-20",
    categories: ["prism", "privacy", "encryption"],
    draft: true,
    content: `Current affairs around how government agencies (really, anyone with right access) are using the internet as a
tool to invade our privacy are troublesome to day the least.

The discussions triggered are of very fundamental nature and require all of us to go down to the bottom of all of this,
and ultimately say yes or no to what I would call a basic human right - privacy.

So whatever your opinion is, in this discussion, shut down diplomacy, and apply your oppinion to anyone, anywhere and anytime - no exception!

## How technical laziness and "I have nothing to hide" play well together

One of the most often mentioned phrases amongst people I speak to about this is following:

    I've nothing to hide, so whats the big deal?

I would make a bet, that each and every one of us will have something she doesn't want everybody to know. Phil Zimmermann, the inventor of the PGP encryption [wrote about exactly this topic in 1995](http://www.spectacle.org/795/byzim.html) and for me personally a very convincing argument is the one that you wouldn't let police search your home without warrant - would you? Think about this and take time to do so, maybe you can come up with other reasons straight away, maybe it requires some though.

Lets dig into this a bit deeper and look at how we tend to approach the 'nothing to hide' part of this:

## The beauty of privacy

Thinking about all the special moments we have, as humans, do you really want anyone to have access to those, anywhere, anytime?
Special moments with your loved ones, you remember for exactly the fact that they were not shared with anyone?

Think about the beauty of being able to decide to continue a discussion in private.

In similar lines, think about how you sometimes work better when no-one disturbs you // Research on team / vs. working alone

There is an inherent beauty of having a choice of when you want to share something whith whomever, wherever.
And this beauty is something we have to embrace, protect and defend.

Stating that you have nothing to hide, is a lazy, not well thought off cop-out and opens doors wide open
to destroying something we humans are capable of doing - being free to decide who we share our thoughts with.

## Technology has made us lazy

We have become very lazy when it becomes to valuing our own personal beings.
The social media buzz is making us blind
Facebook, Google, Apple and others have made it amazingly easy to share content,
to make use of the amazing technology we have at our hands.

Honest and real data security for their users really has

[Andrea Phillips](https://medium.com/writers-on-writing/336300490cbb)

[Cryptoparty Handbook](http://cryptoparty.is/files/cryptoparty-handbook-2013-07-10/cryptoparty-handbook-2013-07-10.pdf)

## Developers are lazy

I would argue, that developers are inherently of lazy nature (at least I would classify myself lazy in that context). We are driven by building things, solve the unsolvable and once having solved a particular problem, moving onto the next one.

    Privacy is a very annoying and unattractive topic to startups

Think about this for a while. You have an idea for an amazing new online service, the next big thing. You build it, prototype, launch. You have user accounts, are working on amazing features and the last thing you really want to work on is

1. Implementing that someone can actually delete his account
2. When you implement it, that you really delete ALL data.

This is a hard problem - imagine a simple commenting function, where you see who commented on something. Do you want to delete all comments and therefor loose your platforms value? Do you want to keep the comment and use an anonymous?

## Opportunities

Changing how we communicate is a massive opportunity and extremely hard.
Think of how we all really hate email, but still it is there and lots of
startups are trying change the status quo.`,
    description:
      "Current affairs around how government agencies are using the internet as a tool to invade our privacy are troublesome to day the least.",
  },
];

export function getPostBySlug(slug) {
  return posts.find((p) => p.slug === slug);
}

export function getAllPosts() {
  return [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPublishedPosts() {
  return getAllPosts().filter((p) => !p.draft);
}
