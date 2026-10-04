import { ChartsArt, ConnectArt, LaptopScene, OverviewArt, PrivacyArt, TeamArt } from './featureArt';

export function LandingFeatures() {
  return (
    <section
      className="landing-section landing-features"
      id="features"
      aria-labelledby="feat-title"
    >
      <div className="landing-wrap">
        <header className="landing-section__head">
          <h2 id="feat-title">Everything you need for AI-powered data analytics</h2>
          <p className="landing-lede">
            One place to connect your data, ask questions and share what you find.
          </p>
        </header>

        <div className="landing-bento">
          <article className="landing-bento__item landing-bento__item--wide landing-bento__item--blue">
            <div className="landing-bento__text">
              <h3>Ask in natural language</h3>
              <p>
                Skip the query editor. Type a question and Beleh writes the SQL, runs it and
                explains the result in plain English.
              </p>
            </div>
            <LaptopScene />
          </article>

          <article className="landing-bento__item landing-bento__item--mint">
            <ChartsArt />
            <h3>Charts that choose themselves</h3>
            <p>Bar, line, pie, heatmap and map charts, picked to fit the question you asked.</p>
          </article>

          <article className="landing-bento__item landing-bento__item--sun">
            <ConnectArt />
            <h3>Connect the data you have</h3>
            <p>CSV and Excel files, Google Sheets and SQL databases, all in one workspace.</p>
          </article>

          <article className="landing-bento__item landing-bento__item--sky">
            <OverviewArt />
            <h3>An overview on day one</h3>
            <p>
              Connect a source and Beleh opens a ready-made overview of it, so you start with
              answers.
            </p>
          </article>

          <article className="landing-bento__item landing-bento__item--cloud">
            <TeamArt />
            <h3>Workspaces for your team</h3>
            <p>
              Invite teammates and share data sources and charts so everyone sees the same numbers.
            </p>
          </article>

          <article className="landing-bento__item landing-bento__item--cloud landing-bento__item--full">
            <PrivacyArt />
            <div>
              <h3>Private by design</h3>
              <p>Separate workspaces and secure sign-in. Our privacy and data terms are public.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
