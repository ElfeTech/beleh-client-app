import { Check, X } from 'lucide-react';
import { WaitingScene } from './illustrations';

const BEFORE = [
  'Wait days for a report that is already out of date',
  'Rebuild a dashboard every time the question changes',
  'Depend on the one person who knows SQL',
];

const AFTER = [
  'Ask in plain English and see the answer in seconds',
  'Follow up in the same chat until the picture is clear',
  'Let everyone on the team explore the numbers',
];

export function LandingProblem() {
  return (
    <section className="landing-section landing-problem" aria-labelledby="problem-title">
      <div className="landing-wrap landing-split">
        <div className="landing-split__art">
          <WaitingScene
            className="landing-art"
            title="A manager surrounded by spreadsheets while the clock ticks, waiting for a report"
          />
        </div>
        <div className="landing-split__copy">
          <h2 id="problem-title">Business analytics shouldn&apos;t mean waiting in a queue</h2>
          <p className="landing-lede">
            Most teams already have the data. What they lack is someone free to dig through it. A
            simple question turns into a ticket, a spreadsheet and a meeting, and by the time the
            report lands the decision has been made.
          </p>
          <div className="landing-compare">
            <div className="landing-compare__col landing-compare__col--before">
              <h3>Without Beleh</h3>
              <ul>
                {BEFORE.map((item) => (
                  <li key={item}>
                    <X size={16} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="landing-compare__col landing-compare__col--after">
              <h3>With Beleh</h3>
              <ul>
                {AFTER.map((item) => (
                  <li key={item}>
                    <Check size={16} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
