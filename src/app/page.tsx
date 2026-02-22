import Image from "next/image";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";

export default function Home() {
  const recentPosts = getPublishedPosts().slice(0, 5);

  return (
    <>
      <div className="author-bio">
        <Image
          src="/bio-photo.jpg"
          alt="Nikolai Onken"
          width={80}
          height={80}
        />
        <div>
          <span className="author-name">Nikolai Onken</span>
          <p className="author-tagline">
            Entrepreneur &amp; engineer. CTO at{" "}
            <a href="https://asymmetric.financial/">Asymmetric</a>. Building{" "}
            <a href="https://mintline.ai/">Mintline.ai</a>. Previously VP
            Engineering at{" "}
            <a href="https://aws.amazon.com/cloud9/">Cloud9 / AWS</a>.
          </p>
        </div>
      </div>

      {recentPosts.length > 0 ? (
        <>
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
      ) : (
        <p>No articles yet.</p>
      )}
    </>
  );
}
