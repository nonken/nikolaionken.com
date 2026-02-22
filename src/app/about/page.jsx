export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <article className="page-content projects-section">
      <h3>Current</h3>
      <p>
        <a href="http://www.pixelplant.com/cm/non">PixelPlant</a>{" "}
        <em>CEO, co-founder</em>
        <br />
        <a href="http://www.bonsaijs.org">BonsaiJS</a>{" "}
        <em>HTML5 graphics</em>
        <br />
        <a href="http://uxebu.com">uxebu</a> <em>co-founder</em>
      </p>

      <h3>Previous</h3>
      <p>
        <a href="http://www.dojocampus.org">Dojo Campus</a> |{" "}
        <a href="http://www.dojotoolkit.org">Dojo Toolkit</a>
        <br />
        <a href="http://www.rndmgnrtn.com">RNDMGNRTN</a>{" "}
        <em>computer sounds</em>
        <br />
        <a href="http://chordinversion.com">chordinversion.com</a>{" "}
        <em>Guitar chords</em>
        <br />
        <a href="http://cva.ahk.nl">Conservatory of Amsterdam</a>{" "}
        <em>Teaching music theory to BA students</em>
      </p>
    </article>
  );
}
