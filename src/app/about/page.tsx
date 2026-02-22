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
        When not coding, making music, exploring nature, and seeking out the
        experiences that connect us all.
      </p>

      <h3>Work</h3>
      <ul className="work-list">
        <li>
          <a href="https://www.dailydots.com/">DailyDots</a>
        </li>
        <li>
          <a href="https://asymmetric.financial/">Asymmetric</a>{" "}
          <em>CTO &mdash; crypto-focused investment firm</em>
        </li>
        <li>
          <a href="https://mintline.ai/">Mintline.ai</a>{" "}
          <em>AI-powered financial reconciliation</em>
        </li>
        <li>
          <a href="https://aws.amazon.com/cloud9/">Cloud9 IDE &rarr; AWS</a>{" "}
          <em>
            VP Engineering, led the Amsterdam office. Cloud9 was acquired by AWS
            in 2016
          </em>
        </li>
        <li>
          <a href="https://nangu.eco/">Nangu.eco</a>{" "}
          <em>Co-founder</em>
        </li>
        <li>
          <a href="https://baseline.dev/">Baseline.dev</a>
        </li>
        <li>
          <a href="https://saasmanual.com/">SaaS Manual</a>{" "}
          <em>Learn how to build SaaS products from scratch</em>
        </li>
        <li>
          <a href="http://uxebu.com">uxebu</a>{" "}
          <em>Co-founder &mdash; web &amp; mobile development consultancy</em>
        </li>
        <li>
          <a href="http://www.bonsaijs.org">BonsaiJS</a>{" "}
          <em>Open source HTML5 graphics library</em>
        </li>
        <li>
          <a href="https://dojotoolkit.org">Dojo Toolkit</a>{" "}
          <em>Committer &amp; community evangelist</em>
        </li>
      </ul>
    </article>
  );
}
