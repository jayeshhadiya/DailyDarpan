import { latestDay, months } from '@content/content';

export interface NavLink {
  // Key of the link text in STRINGS.
  label: 'navHome' | 'navToday' | 'navMonthly' | 'navAbout';
  // Gujarati (default) path; LangService.path() adds /en for English.
  path: string;
}

// "Today" and "This month" always point at the newest content.
const navLinkData: NavLink[] = [
  { label: 'navHome', path: '/' },
  ...(latestDay ? [{ label: 'navToday' as const, path: `/current-affairs/${latestDay.date}` }] : []),
  ...(months[0] ? [{ label: 'navMonthly' as const, path: `/current-affairs/month/${months[0].key}` }] : []),
  { label: 'navAbout', path: '/about' },
];

export default navLinkData;
