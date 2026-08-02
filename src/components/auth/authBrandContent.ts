import { Download, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AuthGoogleSplitMode = 'signin' | 'signup';

export type AuthBrandFeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type AuthBrandPanelCopy = {
  titleLine1: string;
  titleAccent: string;
  description: string;
  featureCards: AuthBrandFeatureCard[];
};

/** Shared left column for sign-in and sign-up. */
export const AUTH_BRAND_PANEL: AuthBrandPanelCopy = {
  titleLine1: "Give your team's data",
  titleAccent: 'a seat at the table.',
  description:
    'Connect your data, invite your team, and start asking questions in plain English , with the access controls and security posture your IT team expects.',
  featureCards: [
    {
      icon: Sparkles,
      title: 'Enterprise-grade security',
      description:
        'SOC 2-ready architecture, SSO/SAML, and role-based access control from day one.',
    },
    {
      icon: Download,
      title: 'Connect any data source',
      description:
        'Databases, spreadsheets, and warehouses , schema discovery runs automatically in the background.',
    },
    {
      icon: Users,
      title: 'Built for teams',
      description:
        'Isolated workspaces, granular permissions, and audit-ready logs for every member.',
    },
  ],
};

export const AUTH_FORM_COPY: Record<
  AuthGoogleSplitMode,
  { title: string; subtitle: string; hint: string; buttonLabel: string }
> = {
  signin: {
    title: 'welcome',
    subtitle: 'Log in to your account to continue',
    hint: 'A Google sign-in window will open when you continue.',
    buttonLabel: 'Continue with Google',
  },
  signup: {
    title: 'get started',
    subtitle: 'Create your account and launch your first workspace',
    hint: 'A Google sign-up window will open when you continue.',
    buttonLabel: 'Sign up with Google',
  },
};
