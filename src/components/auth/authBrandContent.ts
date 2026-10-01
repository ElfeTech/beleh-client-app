export type AuthGoogleSplitMode = 'signin' | 'signup';

/** Left-side hero image, served from /public. */
export const AUTH_HERO_IMAGE: string | null = '/login-page-viz.png';

/** Shared left column copy for sign-in and sign-up. */
export const AUTH_BRAND_PANEL = {
  eyebrow: 'Business Intelligence Platform',
  titleLine1: 'Clarity at the speed of thought',
  titleLine2: 'for modern enterprise teams.',
  description:
    'Real-time forecasting, automated anomaly detection, and unified executive reporting in one trusted workspace.',
};

export const AUTH_FORM_COPY: Record<
  AuthGoogleSplitMode,
  { title: string; subtitle: string; hint: string; buttonLabel: string }
> = {
  signin: {
    title: 'Sign in',
    subtitle:
      'Continue with your Google account to access your Beleh AI Business Intelligence dashboard.',
    hint: 'Passwordless Google Workspace Single Sign-On',
    buttonLabel: 'Continue with Google',
  },
  signup: {
    title: 'Get started',
    subtitle: 'Create your account with Google and launch your first Beleh AI workspace.',
    hint: 'Passwordless Google Workspace Single Sign-On',
    buttonLabel: 'Sign up with Google',
  },
};
