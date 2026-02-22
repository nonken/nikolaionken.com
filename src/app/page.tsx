import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";

export default function Home() {
  const recentPosts = getPublishedPosts().slice(0, 5);

  return (
    <>
      <section className="hero">
        <span className="hero-greeting">Hello, I&apos;m</span>
        <h1>Nikolai Onken</h1>
        <p className="hero-description">
          Coder, builder, musician. I love nature, humans, the universe, our
          earth, and the richness of human experiences. Currently CTO at{" "}
          <a href="https://asymmetric.financial/">Asymmetric</a> and building{" "}
          <a href="https://mintline.ai/">Mintline.ai</a>.
        </p>
        <div className="identity-pillars">
          <span className="pillar">Coder</span>
          <span className="pillar">Builder</span>
          <span className="pillar">Musician</span>
          <span className="pillar">Nature</span>
          <span className="pillar">Humans</span>
          <span className="pillar">Universe</span>
        </div>
      </section>

      {recentPosts.length > 0 && (
        <>
          <hr className="section-divider" />
          <span className="section-label">Recent Writing</span>
          <ul className="article-list">
            {recentPosts.map((post) => (
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
          <Link href="/articles" className="view-all">
            View all articles
          </Link>
        </>
      )}
    </>
  );
}
