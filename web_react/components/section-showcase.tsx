'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { translateText } from '@/lib/i18n';
import {
  getSectionIntent,
  getSectionWorkbenches,
  getWorkbench,
  type SectionKey,
  type Workbench,
} from '@/lib/platform-data';

function resolveTools(sectionKey: SectionKey, slugs: string[]): Workbench[] {
  return slugs
    .map((slug) => getWorkbench(slug))
    .filter((item): item is Workbench => Boolean(item && item.section === sectionKey));
}

function SectionShowcaseInner({ sectionKey }: { sectionKey: SectionKey }) {
  const searchParams = useSearchParams();
  const intentParam = searchParams.get('intent');
  const { locale, text } = useLanguage();
  // No intent in URL → all tools in this section.
  const activeIntent = useMemo(
    () => getSectionIntent(sectionKey, intentParam),
    [sectionKey, intentParam],
  );
  const tools = useMemo(() => {
    if (activeIntent.id === 'all') {
      return getSectionWorkbenches(sectionKey);
    }
    return resolveTools(sectionKey, activeIntent.slugs);
  }, [activeIntent, sectionKey]);
  const intentLabel = translateText(activeIntent.label, locale);

  return (
    <div className="section-showcase">
      <div
        className="section-showcase-stream"
        aria-label={
          locale === 'zh' ? `${intentLabel}功能列表` : `${intentLabel} tools`
        }
      >
        {tools.map((tool, index) => {
          const imageLeft = index % 2 === 0;
          return (
            <article
              key={tool.slug}
              className={`section-feature ${imageLeft ? 'image-left' : 'image-right'}`}
              id={`tool-${tool.slug}`}
            >
              <div className="section-feature-media">
                <Image
                  src={tool.image}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 46vw"
                  className="section-feature-image"
                />
              </div>
              <div className="section-feature-copy">
                <h2>{translateText(tool.title, locale)}</h2>
                <p>{translateText(tool.description, locale)}</p>
                <Link className="section-feature-cta" href={`/tools/${tool.slug}`}>
                  {text('打开工具', 'Open tool')}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function SectionShowcase({ sectionKey }: { sectionKey: SectionKey }) {
  return (
    <Suspense fallback={<div className="section-showcase-loading page-width">正在加载…</div>}>
      <SectionShowcaseInner sectionKey={sectionKey} />
    </Suspense>
  );
}
