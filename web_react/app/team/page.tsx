import type { Metadata } from 'next';
import { TeamDirectory } from '@/components/team-directory';

export const metadata: Metadata = { title: '团队主页' };

export default function TeamPage() {
  return (
    <div className="site-shell subpage-shell team-page-shell">
      <main className="page-width team-page-main">
        <TeamDirectory />
      </main>
    </div>
  );
}
