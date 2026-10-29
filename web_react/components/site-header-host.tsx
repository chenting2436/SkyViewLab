'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';

function isDarkShellPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/research') ||
    pathname.startsWith('/engineering') ||
    pathname.startsWith('/teaching')
  );
}

function shouldHideHeader(pathname: string) {
  return pathname.startsWith('/login') || pathname.startsWith('/auth');
}

/** Keeps the header mounted across page navigations to avoid flicker. */
export function SiteHeaderHost() {
  const pathname = usePathname();
  if (shouldHideHeader(pathname)) return null;

  const dark = isDarkShellPath(pathname);
  return (
    <div className={dark ? 'site-header-host section-showcase-shell' : 'site-header-host'}>
      <SiteHeader />
    </div>
  );
}
