import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Articles",
};

export default function ArticlesPage() {
  const posts = getAllPosts();

  const postsByYear: Record<string, typeof posts> = {};
  for (const post of posts) {
    const year = new Date(post.date).getFullYear().toString();
    if (!postsByYear[year]) {
      postsByYear[year] = [];
    }
    postsByYear[year].push(post);
  }

  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <div className="headline-wrap">
        <h1>Articles</h1>
        <p className="tagline">A List of Posts</p>
      </div>

      {years.map((year) => (
        <div key={year}>
          <h3 className="article-list year-heading">{year}</h3>
          <ul className="article-list">
            {postsByYear[year].map((post) => (
              <li key={post.slug}>
                <h2>
                  <Link href={`/articles/${post.slug}`}>{post.title}</Link>
                </h2>
                <p>
                  {post.description ||
                    post.content.substring(0, 120).replace(/\s+/g, " ") + "..."}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
