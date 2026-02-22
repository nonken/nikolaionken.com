export default function Home() {
  return (
    <>
      <section className="hero">
        <span className="hero-greeting">Hello, I&apos;m</span>
        <h1>Nikolai Onken</h1>
        <hr className="hero-rule" />
        <p className="hero-description">
          Coder, builder, musician. I love nature, humans, the universe, our
          earth, and the richness of human experiences. Currently CTO at{" "}
          <a href="https://asymmetric.financial/" target="_blank" rel="noopener noreferrer">Asymmetric</a> and hacking on{" "}
          <a href="https://warpmetrics.com/" target="_blank" rel="noopener noreferrer">warpmetrics.com</a> to automate all the things.
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
    </>
  );
}
