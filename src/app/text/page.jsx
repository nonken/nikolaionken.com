import Link from "next/link";
import { MEMORIES } from "../engine/data.js";

export const metadata = {
  title: "Text Version",
  description: "Nikolai Onken — plain text version of all content",
};

export default function TextPage() {
  const work = MEMORIES.filter(m => m.type === "work");
  const identity = MEMORIES.filter(m => m.type === "identity");
  const root = MEMORIES.find(m => m.type === "root");

  return (
    <div className="text-page">
      <h1>{root?.label || "nikolai onken"}</h1>
      <p className="text-page__subtitle">
        {root?.desc || "Coder, builder, musician. Lover of nature, humans, and the universe."}
      </p>

      <h2>Work &amp; Projects</h2>
      <ul>
        {work.map((m) => (
          <li key={m.id}>
            <span className="text-item__label">{m.label}</span>
            {m.desc && <span className="text-item__desc"> — {m.desc}</span>}
            {m.url && (
              <a
                className="text-item__url"
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {m.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
          </li>
        ))}
      </ul>

      <h2>Identity</h2>
      <ul>
        {identity.map((m) => (
          <li key={m.id}>
            <span className="text-item__label">{m.label}</span>
          </li>
        ))}
      </ul>

      <Link href="/" className="text-page__back">&larr; back to organism</Link>
    </div>
  );
}
