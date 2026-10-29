'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLottie } from 'lottie-react';
import { Minus, Send, X } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import {
  answerPageGuide,
  createPageGuideWelcome,
  getPageGuideQuickPrompts,
  getPageGuideSectionLabel,
  type PageGuideMessage,
} from '@/lib/page-guide';
import type { SectionKey } from '@/lib/platform-data';
import botAnimation from '@/assets/lottie/page-guide-bot.json';

const FAB_SIZE = 64;
const PANEL_WIDTH = 360;
const STORAGE_KEY = 'skyview-page-guide-fab-pos';

function PageGuideBotIcon() {
  const { View } = useLottie({
    animationData: botAnimation,
    loop: true,
    autoplay: true,
  });
  return <div className="page-guide-fab-lottie">{View}</div>;
}

type FabPosition = { x: number; y: number };

function defaultPosition(): FabPosition {
  if (typeof window === 'undefined') {
    return { x: 24, y: 24 };
  }
  return {
    x: Math.max(16, window.innerWidth - FAB_SIZE - 24),
    y: Math.max(16, window.innerHeight - FAB_SIZE - 24),
  };
}

function clampPosition(position: FabPosition): FabPosition {
  if (typeof window === 'undefined') return position;
  const maxX = Math.max(8, window.innerWidth - FAB_SIZE - 8);
  const maxY = Math.max(8, window.innerHeight - FAB_SIZE - 8);
  return {
    x: Math.min(maxX, Math.max(8, position.x)),
    y: Math.min(maxY, Math.max(8, position.y)),
  };
}

function readStoredPosition(sectionKey: SectionKey): FabPosition | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${sectionKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FabPosition;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return clampPosition(parsed);
  } catch {
    return null;
  }
}

function storePosition(sectionKey: SectionKey, position: FabPosition) {
  try {
    window.localStorage.setItem(`${STORAGE_KEY}:${sectionKey}`, JSON.stringify(position));
  } catch {
    // Ignore quota / private mode failures.
  }
}

function panelStyle(position: FabPosition) {
  if (typeof window === 'undefined') {
    return { right: 24, bottom: 96 };
  }
  const left = Math.min(position.x, Math.max(12, window.innerWidth - PANEL_WIDTH - 12));
  const spaceBelow = window.innerHeight - position.y - FAB_SIZE;
  const preferAbove = position.y > 420;
  if (preferAbove) {
    return {
      left,
      bottom: Math.max(12, spaceBelow + FAB_SIZE + 12),
    };
  }
  return {
    left,
    top: Math.min(position.y + FAB_SIZE + 12, window.innerHeight - 120),
  };
}

export function PageGuideAssistant({ sectionKey }: { sectionKey: SectionKey }) {
  const { locale, text } = useLanguage();
  const label = getPageGuideSectionLabel(sectionKey, locale);
  const prompts = getPageGuideQuickPrompts(sectionKey, locale);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<PageGuideMessage[]>(() => [
    createPageGuideWelcome(sectionKey, 'zh'),
  ]);
  const [position, setPosition] = useState<FabPosition>({ x: 24, y: 24 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([createPageGuideWelcome(sectionKey, locale)]);
    setInput('');
    setOpen(false);
    setMinimized(false);
    const stored = readStoredPosition(sectionKey);
    setPosition(stored ?? defaultPosition());
    setReady(true);
  }, [sectionKey, locale]);

  useEffect(() => {
    const onResize = () => setPosition((current) => clampPosition(current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open || minimized) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, minimized]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    const reply = answerPageGuide(sectionKey, trimmed, locale);
    setMessages((current) => [...current, { role: 'user', content: trimmed }, reply]);
    setInput('');
    setOpen(true);
    setMinimized(false);
  }

  function onFabPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
  }

  function onFabPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && dx * dx + dy * dy < 25) return;
    drag.moved = true;
    setPosition(clampPosition({ x: drag.originX + dx, y: drag.originY + dy }));
  }

  function endFabPointer(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released.
    }
    if (drag.moved) {
      setPosition((current) => {
        const next = clampPosition(current);
        storePosition(sectionKey, next);
        return next;
      });
      return;
    }
    setOpen(true);
    setMinimized(false);
  }

  if (!ready) return null;

  return (
    <div className="page-guide-root" aria-live="polite">
      {open && !minimized && (
        <section
          className="page-guide-panel"
          style={panelStyle(position)}
          aria-label={text(`本页导引 · ${label}`, `Page guide · ${label}`)}
        >
          <header className="page-guide-panel-header">
            <div>
              <strong>{text(`本页导引 · ${label}`, `Page guide · ${label}`)}</strong>
              <small>
                {text('页面用途说明与功能推荐', 'Page purpose and tool recommendations')}
              </small>
            </div>
            <div className="page-guide-panel-actions">
              <button
                type="button"
                aria-label={text('最小化', 'Minimize')}
                onClick={() => setMinimized(true)}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                aria-label={text('关闭', 'Close')}
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="page-guide-prompts">
            {prompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => ask(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="page-guide-messages" ref={listRef}>
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} data-role={message.role}>
                <p>{message.content}</p>
                {message.links && message.links.length > 0 && (
                  <div className="page-guide-links">
                    {message.links.map((link) => (
                      <Link key={link.slug} href={`/tools/${link.slug}`}>
                        {text(`打开 ${link.title}`, `Open ${link.title}`)}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          <form
            className="page-guide-composer"
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={text(
                '例如：我想查文献点哪个？',
                'e.g. Which tool for literature search?',
              )}
              aria-label={text('向本页导引提问', 'Ask the page guide')}
            />
            <button type="submit" aria-label={text('发送', 'Send')}>
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="page-guide-fab"
        style={{ left: position.x, top: position.y }}
        aria-label={text('本页导引助手', 'Page guide assistant')}
        title={text('本页导引助手（可拖动）', 'Page guide assistant (draggable)')}
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={endFabPointer}
        onPointerCancel={endFabPointer}
      >
        <PageGuideBotIcon />
        {open && minimized && <span className="page-guide-fab-badge" />}
      </button>
    </div>
  );
}
