import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import './AuthGatewayTransition.css';

export type AuthGatewayPhase = 'signin' | 'authorized';

const PHASE_COPY: Record<
  AuthGatewayPhase,
  { statusLabel: string; title: string; description: string; pills: string[] }
> = {
  signin: {
    statusLabel: 'Workspace gateway exchange',
    title: 'Authenticating access',
    description:
      'Verifying your identity with Google and preparing a secure connection to your workspace environment.',
    pills: [
      'opening secure gateway...',
      'validating identity token...',
      'negotiating workspace session...',
    ],
  },
  authorized: {
    statusLabel: 'Workspace gateway exchange',
    title: 'Access authorized',
    description:
      'Creating high-fidelity sandbox session configurations and validating workspace records security.',
    pills: [
      'authorizing access policies...',
      'loading workspace context...',
      'finalizing secure session...',
    ],
  },
};

export interface AuthGatewayTransitionProps {
  phase?: AuthGatewayPhase;
}

export function AuthGatewayTransition({ phase = 'signin' }: AuthGatewayTransitionProps) {
  const copy = PHASE_COPY[phase];
  const [pillIndex, setPillIndex] = useState(0);

  useEffect(() => {
    setPillIndex(0);
    const id = window.setInterval(() => {
      setPillIndex((i) => (i + 1) % copy.pills.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [copy.pills.length, phase]);

  return (
    <div className="auth-gateway-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="auth-gateway-card">
        <div className="auth-gateway-spinner-wrap" aria-hidden>
          <svg className="auth-gateway-spinner" viewBox="0 0 88 88">
            <circle className="auth-gateway-spinner__track" cx="44" cy="44" r="38" />
            <circle className="auth-gateway-spinner__arc-dark" cx="44" cy="44" r="38" />
            <circle className="auth-gateway-spinner__arc-accent" cx="44" cy="44" r="38" />
          </svg>
          <div className="auth-gateway-lock">
            <Lock size={26} strokeWidth={2} />
          </div>
        </div>

        <p className="auth-gateway-status-row">
          <span className="auth-gateway-status-row__dot" aria-hidden />
          {copy.statusLabel}
        </p>

        <h1 className="auth-gateway-title">{copy.title}</h1>

        <p className="auth-gateway-description">{copy.description}</p>

        <div className="auth-gateway-pill">{copy.pills[pillIndex]}</div>
      </div>
    </div>
  );
}
