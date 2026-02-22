import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <article className="page-content projects-section">
      <h1>Nikolai Onken</h1>

      <p className="about-identity">
        Coder &middot; Builder &middot; Musician &middot; Nature lover &middot; Human
      </p>

      <p className="about-intro">
        Entrepreneur and engineer building at the intersection of finance and
        technology. Based in Amsterdam. Building software since 1997, from open
        source JavaScript frameworks to cloud IDEs to crypto infrastructure.
        Currently at{" "}
        <a href="https://asymmetric.financial/" target="_blank" rel="noopener noreferrer">Asymmetric</a> and hacking on{" "}
        <a href="https://warpmetrics.com/" target="_blank" rel="noopener noreferrer">warpmetrics.com</a> for fun.
        When not coding, making music, exploring nature, and seeking out the
        experiences that connect us all.
      </p>

      <h3>Work</h3>
      <ul className="work-list">
        <li>
          <a href="https://asymmetric.financial/" target="_blank" rel="noopener noreferrer">Asymmetric</a>{" "}
          <em>CTO &mdash; crypto-focused investment firm</em>
        </li>
        <li>
          <a href="https://warpmetrics.com/" target="_blank" rel="noopener noreferrer">WarpMetrics</a>{" "}
          <em>AI-powered coding agents</em>
        </li>
        <li>
          <a href="https://www.dailydots.com/" target="_blank" rel="noopener noreferrer">DailyDots</a>
        </li>
        <li>
          <a href="https://mintline.ai/" target="_blank" rel="noopener noreferrer">Mintline.ai</a>{" "}
          <em>AI-powered financial reconciliation</em>
        </li>
        <li>
          <a href="https://aws.amazon.com/cloud9/" target="_blank" rel="noopener noreferrer">AWS (Cloud9)</a>{" "}
          <em>Site lead, Amsterdam</em>
        </li>
        <li>
          <a href="https://c9.io" target="_blank" rel="noopener noreferrer">Cloud9 IDE</a>{" "}
          <em>
            Site lead &mdash; established the Amsterdam office. Acquired by AWS
            in 2016
          </em>
        </li>
        <li>
          <a href="https://nangu.eco/" target="_blank" rel="noopener noreferrer">Nangu.eco</a>{" "}
          <em>Co-founder</em>
        </li>
        <li>
          <a href="https://baseline.dev/" target="_blank" rel="noopener noreferrer">Baseline.dev</a>
        </li>
        <li>
          <a href="https://saasmanual.com/" target="_blank" rel="noopener noreferrer">SaaS Manual</a>{" "}
          <em>Learn how to build SaaS products from scratch</em>
        </li>
        <li>
          <a href="http://uxebu.com" target="_blank" rel="noopener noreferrer">uxebu</a>{" "}
          <em>Co-founder &mdash; web &amp; mobile development consultancy</em>
        </li>
        <li>
          BonsaiJS{" "}
          <em>Open source HTML5 graphics library</em>
        </li>
        <li>
          <a href="https://dojotoolkit.org" target="_blank" rel="noopener noreferrer">Dojo Toolkit</a>{" "}
          <em>Committer &amp; community evangelist</em>
        </li>
      </ul>
    </article>
  );
}
