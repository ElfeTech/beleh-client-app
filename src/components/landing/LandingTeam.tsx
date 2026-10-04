import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { TeamScene } from './illustrations';

const POINTS = [
  'One workspace for every data source and conversation',
  'Invite teammates to see the same charts and analyses',
  'Everyone works from the same live numbers',
];

export function LandingTeam() {
  const navigate = useNavigate();
  return (
    <section className="landing-section landing-team" aria-labelledby="team-title">
      <div className="landing-wrap landing-split landing-split--reverse">
        <div className="landing-split__copy">
          <h2 id="team-title">Business intelligence the whole team can use</h2>
          <p className="landing-lede">
            Meetings go faster when everyone is looking at the same chart. Beleh gives your team one
            shared place to ask, explore and agree on what the data says.
          </p>
          <ul className="landing-checks">
            {POINTS.map((p) => (
              <li key={p}>
                <Check size={18} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="landing-btn landing-btn-primary landing-btn-lg"
            onClick={() => navigate('/signup')}
          >
            Create your workspace
          </button>
        </div>
        <div className="landing-split__art">
          <TeamScene
            className="landing-art"
            title="Four colleagues gathered around a large screen showing a shared Beleh dashboard"
          />
        </div>
      </div>
    </section>
  );
}
