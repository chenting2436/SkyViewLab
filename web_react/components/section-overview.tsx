import { PageGuideAssistant } from '@/components/page-guide-assistant';
import { SectionShowcase } from '@/components/section-showcase';
import { SiteFooter } from '@/components/site-footer';
import { type SectionKey } from '@/lib/platform-data';

export function SectionOverview({ sectionKey }: { sectionKey: SectionKey }) {
  return (
    <div className="site-shell section-showcase-shell">
      <main className="section-showcase-main">
        <SectionShowcase sectionKey={sectionKey} />
      </main>
      <SiteFooter />
      <PageGuideAssistant sectionKey={sectionKey} />
    </div>
  );
}
