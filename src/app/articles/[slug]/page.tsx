import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article>
      <div className="headline-wrap">
        <h1>{post.title}</h1>
      </div>
      <p className="post-meta">{formattedDate}</p>

      {post.draft && (
        <p className="draft-notice">
          <em>This is a draft post.</em>
        </p>
      )}

      <div className="post-content">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      <footer className="post-footer">
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
        <p>
          <strong>{post.title}</strong> was published on{" "}
          <time dateTime={post.date}>{formattedDate}</time> by{" "}
          <Link href="/about">Nikolai Onken</Link>.
        </p>
      </footer>
    </article>
  );
}
