import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_META: Record<string, { title: string; noindex?: boolean }> = {
  '/dashboard': { title: 'Dashboard — AdDhoom Studio', noindex: true },
  '/dashboard/generate': { title: 'Ad Generator — AdDhoom Studio', noindex: true },
  '/dashboard/studio': { title: 'Studio — AdDhoom Studio', noindex: true },
  '/dashboard/ad-history': { title: 'Ad History — AdDhoom Studio', noindex: true },
  '/dashboard/video': { title: 'Video Ads — AdDhoom Studio', noindex: true },
  '/dashboard/calendar': { title: 'Content Calendar — AdDhoom Studio', noindex: true },
  '/dashboard/chat': { title: 'DhoomAi Chat — AdDhoom Studio', noindex: true },
  '/dashboard/competitors': { title: 'Competitor Intel — AdDhoom Studio', noindex: true },
  '/dashboard/doctor': { title: 'Account Doctor — AdDhoom Studio', noindex: true },
  '/dashboard/projects': { title: 'Projects — AdDhoom Studio', noindex: true },
  '/dashboard/dhoom-score': { title: 'Dhoom Score — AdDhoom Studio', noindex: true },
  '/dashboard/analytics': { title: 'Analytics — AdDhoom Studio', noindex: true },
  '/dashboard/credits': { title: 'Credits — AdDhoom Studio', noindex: true },
  '/dashboard/workspaces': { title: 'Workspaces — AdDhoom Studio', noindex: true },
  '/dashboard/settings': { title: 'Settings — AdDhoom Studio', noindex: true },
  '/auth': { title: 'Sign In — AdDhoom Studio', noindex: true },
  '/onboarding': { title: 'Get Started — AdDhoom Studio', noindex: true },
  '/reset-password': { title: 'Reset Password — AdDhoom Studio', noindex: true },
  '/': { title: 'AdDhoom Studio — AI Ad Studio for Sellers' },
};

/**
 * Sets document.title and manages robots meta tag based on the current route.
 */
const usePageMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Match exact or closest parent path
    const meta = PAGE_META[pathname] ||
      Object.entries(PAGE_META)
        .filter(([p]) => pathname.startsWith(p) && p !== '/')
        .sort((a, b) => b[0].length - a[0].length)[0]?.[1];

    if (meta) {
      document.title = meta.title;
    }

    // Handle noindex
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (meta?.noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, nofollow';
    } else if (robotsMeta) {
      robotsMeta.remove();
    }
  }, [pathname]);
};

export default usePageMeta;
