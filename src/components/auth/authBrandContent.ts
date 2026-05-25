import { History, Layers, Rocket, ShieldCheck, Upload, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
export type AuthGoogleSplitMode = 'signin' | 'signup';

export type AuthBrandFeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type AuthBrandPanelCopy = {
  kicker: string;
  titleLine1: string;
  titleAccent: string;
  titlePrefix?: string;
  description: string;
  featureCards: AuthBrandFeatureCard[];
};

export const AUTH_BRAND_PANEL: Record<AuthGoogleSplitMode, AuthBrandPanelCopy> = {
  signin: {
    kicker: 'NEXT-GENERATION DATABASE ANALYTICS WORKSPACE',
    titleLine1: 'Welcome Back',
    titlePrefix: 'to ',
    titleAccent: 'Beleh Workspace',
    description:
      'Pick up where you left off. Your workspaces, recent chats, and connected data sources are ready — ask a question and get answers in seconds.',
    featureCards: [
      {
        icon: History,
        title: 'Resume Recent Chats',
        description:
          'Jump back into the threads and analyses you were working on without rebuilding context.',
      },
      {
        icon: Layers,
        title: 'Your Workspaces Await',
        description:
          'Switch between teams and data environments with the same secure, isolated workspace model.',
      },
      {
        icon: Zap,
        title: 'Instant Answers',
        description:
          'Plain-English questions still compile to fast insights — no SQL or dashboard rebuild required.',
      },
    ],
  },
  signup: {
    kicker: 'ALPHA ACCESS — NEW WORKSPACE MEMBERS',
    titleLine1: 'Get Started with',
    titlePrefix: undefined,
    titleAccent: 'Beleh Workspace',
    description:
      'Join the alpha and turn questions into charts in minutes. Connect spreadsheets or databases, chat in plain English, and explore your data without legacy BI overhead.',
    featureCards: [
      {
        icon: Rocket,
        title: 'Free Alpha Access',
        description:
          'Start on the free tier — no credit card required while we refine the product with early users.',
      },
      {
        icon: Upload,
        title: 'Connect Data Fast',
        description:
          'Upload CSV or Excel, or link a database. Schema discovery runs automatically in the background.',
      },
      {
        icon: ShieldCheck,
        title: 'Built for Teams',
        description:
          'Isolated workspaces, secure sign-in, and enterprise-minded controls from day one.',
      },
    ],
  },
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
