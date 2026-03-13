import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
  if (typeof window === 'undefined') return;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    persistence: 'localStorage',
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.opt_out_capturing();
      }
      initialized = true;
    },
  });
  initialized = true;
}

export function identifyUser(
  userId: string,
  properties: {
    email?: string;
    plan?: string;
    subscribed?: boolean;
    created_at?: string;
  }
) {
  if (!initialized) return;
  posthog.identify(userId, properties);
}

export function trackEvent(
  event: string,
  properties?: Record<string, any>
) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function resetUser() {
  if (!initialized) return;
  posthog.reset();
}
