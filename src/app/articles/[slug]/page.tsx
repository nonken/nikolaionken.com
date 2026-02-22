import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i}>
          <p>{line.slice(2)}</p>
        </blockquote>
      );
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(<li key={i}>{lines[i].replace(/^\d+\.\s/, "")}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`}>{listItems}</ol>);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph - collect consecutive non-empty lines
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("## ") &&
      !lines[i].startsWith("> ") &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    const text = paragraphLines.join(" ");
    // Parse markdown links
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    const rendered = parts.map((part, j) => {
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a key={j} href={linkMatch[2]}>
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
    elements.push(<p key={`p-${i}`}>{rendered}</p>);
  }

  return elements;
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

      <div className="post-content">{renderContent(post.content)}</div>

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
