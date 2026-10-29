'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { navItems } from '@/lib/navigation';
import { translateText } from '@/lib/i18n';
import {
  getSectionIntents,
  getWorkbench,
  type SectionKey,
} from '@/lib/platform-data';
import { authApi } from '@/services/api/auth';
import type { User } from '@/types/api';

const sectionHrefs: Record<string, SectionKey> = {
  '/research': 'research',
  '/engineering': 'engineering',
  '/teaching': 'teaching',
};

let cachedAuthUser: User | null | undefined;

function truncateLabel(label: string, maxChars: number) {
  const chars = Array.from(label);
  if (chars.length <= maxChars) return label;
  return `${chars.slice(0, maxChars).join('')}…`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, text } = useLanguage();
  const darkShell =
    pathname === '/' ||
    pathname.startsWith('/research') ||
    pathname.startsWith('/engineering') ||
    pathname.startsWith('/teaching');
  const brandLogoSrc = darkShell
    ? '/assets/images/skyviewlab-logo-on-dark.png'
    : '/assets/images/skyviewlab-logo.png';
  const toolMatch = pathname.match(/^\/tools\/([^/]+)/);
  const activeWorkbench = toolMatch ? getWorkbench(toolMatch[1]) : undefined;
  const activeSectionHref = activeWorkbench ? `/${activeWorkbench.section}` : undefined;
  const exitFullLabel =
    locale === 'zh'
      ? `退出${activeWorkbench?.title ?? ''}`
      : `Exit ${activeWorkbench?.title ?? ''}`;
  const exitVisibleLabel = activeWorkbench
    ? locale === 'zh'
      ? `退出${truncateLabel(activeWorkbench.title, 8)}`
      : `Exit ${truncateLabel(activeWorkbench.title, 14)}`
    : '';

  const [user, setUser] = useState<User | null>(() => cachedAuthUser ?? null);
  const [authReady, setAuthReady] = useState(() => cachedAuthUser !== undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openSectionMenu, setOpenSectionMenu] = useState<SectionKey | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const sectionMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openSectionIntentMenu(sectionKey: SectionKey) {
    if (sectionMenuCloseTimer.current) {
      clearTimeout(sectionMenuCloseTimer.current);
      sectionMenuCloseTimer.current = null;
    }
    setOpenSectionMenu(sectionKey);
  }

  function scheduleCloseSectionIntentMenu() {
    if (sectionMenuCloseTimer.current) {
      clearTimeout(sectionMenuCloseTimer.current);
    }
    sectionMenuCloseTimer.current = setTimeout(() => {
      setOpenSectionMenu(null);
      sectionMenuCloseTimer.current = null;
    }, 120);
  }

  function closeSectionIntentMenuNow() {
    if (sectionMenuCloseTimer.current) {
      clearTimeout(sectionMenuCloseTimer.current);
      sectionMenuCloseTimer.current = null;
    }
    setOpenSectionMenu(null);
  }

  useEffect(() => {
    let active = true;
    authApi
      .currentUser()
      .then((currentUser) => {
        cachedAuthUser = currentUser;
        if (active) setUser(currentUser);
      })
      .catch(() => {
        cachedAuthUser = null;
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    closeSectionIntentMenuNow();
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (sectionMenuCloseTimer.current) {
        clearTimeout(sectionMenuCloseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen && !openSectionMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (navRef.current?.contains(target)) return;
      setMenuOpen(false);
      closeSectionIntentMenuNow();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        closeSectionIntentMenuNow();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, openSectionMenu]);

  function isNavActive(href: string) {
    if (pathname === href || pathname.startsWith(`${href}?`)) return true;
    return Boolean(activeSectionHref && href === activeSectionHref);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
      cachedAuthUser = null;
      setUser(null);
      setMenuOpen(false);
      router.replace('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-brand-group">
          {activeWorkbench && (
            <Link
              className="header-workbench-exit"
              href={activeSectionHref!}
              aria-label={exitFullLabel}
              title={exitFullLabel}
            >
              <LogOut size={16} aria-hidden="true" />
              <span data-no-translate>{exitVisibleLabel}</span>
            </Link>
          )}
          <Link href="/" aria-label={text('SkyViewLab 首页', 'SkyViewLab home')}>
            <Image
              className="brand-logo"
              src={brandLogoSrc}
              alt="SkyViewLab"
              width={328}
              height={80}
              priority
            />
          </Link>
        </div>

        <nav className="desktop-nav" ref={navRef} aria-label={text('主导航', 'Main navigation')}>
          {navItems.map((item) => {
            const sectionKey = sectionHrefs[item.href];
            if (!sectionKey) {
              return (
                <Link
                  className="nav-link"
                  data-active={isNavActive(item.href)}
                  href={item.href}
                  key={item.href}
                >
                  {locale === 'zh' ? item.label : item.labelEn}
                </Link>
              );
            }

            const intents = getSectionIntents(sectionKey);
            const open = openSectionMenu === sectionKey;
            return (
              <div
                className="nav-section-item"
                key={item.href}
                onMouseEnter={() => openSectionIntentMenu(sectionKey)}
                onMouseLeave={scheduleCloseSectionIntentMenu}
              >
                <div className="nav-section-trigger-wrap">
                  <Link
                    className="nav-link nav-section-home"
                    data-active={isNavActive(item.href)}
                    href={item.href}
                    onClick={closeSectionIntentMenuNow}
                  >
                    {locale === 'zh' ? item.label : item.labelEn}
                  </Link>
                  <button
                    type="button"
                    className="nav-section-chevron"
                    data-active={isNavActive(item.href)}
                    aria-label={`${locale === 'zh' ? item.label : item.labelEn}意图菜单`}
                    aria-expanded={open}
                    aria-haspopup="true"
                    onClick={() =>
                      open
                        ? closeSectionIntentMenuNow()
                        : openSectionIntentMenu(sectionKey)
                    }
                  >
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                </div>
                {open && (
                  <div className="nav-intent-menu" role="menu">
                    <div className="nav-intent-menu-panel">
                      <div className="nav-intent-menu-grid">
                        {intents.map((intent) => (
                          <Link
                            key={intent.id}
                            role="menuitem"
                            className="nav-intent-link"
                            href={`${item.href}?intent=${intent.id}`}
                            onClick={closeSectionIntentMenuNow}
                          >
                            <strong>{translateText(intent.label, locale)}</strong>
                            <span>{translateText(intent.description, locale)}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="nav-actions">
          <button
            className="language-toggle"
            type="button"
            data-no-translate
            aria-label={locale === 'zh' ? '切换到英文' : 'Switch to Chinese'}
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          >
            <span>EN / 中文</span>
          </button>

          {authReady && !user && (
            <Link className="header-button header-login" href="/login">
              <UserRound size={18} aria-hidden="true" />
              {text('登录', 'Sign in')}
            </Link>
          )}

          {authReady && user && (
            <div className="header-user-menu" ref={menuRef}>
              <button
                type="button"
                className="header-user-trigger"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="header-user-avatar" aria-hidden="true">
                  <UserRound size={16} />
                </span>
                <span className="header-user-name" data-no-translate>
                  {user.displayName}
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              {menuOpen && (
                <div className="header-user-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loggingOut}
                    onClick={() => void logout()}
                  >
                    <LogOut size={15} aria-hidden="true" />
                    <span>{loggingOut ? text('正在退出…', 'Signing out…') : text('退出登录', 'Sign out')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <details className="mobile-nav">
            <summary aria-label={text('打开导航菜单', 'Open navigation menu')}>
              <span className="menu-glyph" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </summary>
            <nav className="mobile-menu" aria-label={text('移动端导航', 'Mobile navigation')}>
              {navItems.map((item) => {
                const sectionKey = sectionHrefs[item.href];
                if (!sectionKey) {
                  return (
                    <Link
                      className="nav-link"
                      data-active={isNavActive(item.href)}
                      href={item.href}
                      key={item.href}
                    >
                      {locale === 'zh' ? item.label : item.labelEn}
                    </Link>
                  );
                }
                return (
                  <div className="mobile-section-group" key={item.href}>
                    <Link className="nav-link" data-active={isNavActive(item.href)} href={item.href}>
                      {locale === 'zh' ? item.label : item.labelEn}
                    </Link>
                    {getSectionIntents(sectionKey).map((intent) => (
                      <Link
                        key={intent.id}
                        className="nav-link mobile-intent-link"
                        href={`${item.href}?intent=${intent.id}`}
                      >
                        {translateText(intent.label, locale)}
                      </Link>
                    ))}
                  </div>
                );
              })}
              {authReady && !user && (
                <Link className="nav-link" href="/login">
                  {text('登录', 'Sign in')}
                </Link>
              )}
              {authReady && user && (
                <>
                  <span className="nav-link header-mobile-user" data-no-translate>
                    {user.displayName}
                  </span>
                  <button
                    type="button"
                    className="nav-link header-mobile-logout"
                    disabled={loggingOut}
                    onClick={() => void logout()}
                  >
                    {loggingOut ? text('正在退出…', 'Signing out…') : text('退出登录', 'Sign out')}
                  </button>
                </>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
