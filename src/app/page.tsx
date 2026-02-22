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
