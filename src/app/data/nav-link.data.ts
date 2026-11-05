import { latestQuizPath, months } from '@content/content';

export interface NavLink {
  // Key of the link text in STRINGS.
  label: 'navHome' | 'navToday' | 'navMonthly' | 'navExams' | 'navAbout';
  // English (default) path; LangService.path() adds /gu for Gujarati.
  path: string;
}

// "Latest quiz" and "This month" always point at the newest content.
const navLinkData: NavLink[] = [
  { label: 'navHome', path: '/' },
  ...(latestQuizPath !== '/' ? [{ label: 'navToday' as const, path: latestQuizPath }] : []),
  ...(months[0] ? [{ label: 'navMonthly' as const, path: `/current-affairs/month/${months[0].key}` }] : []),
  { label: 'navExams', path: '/exams' },
  { label: 'navAbout', path: '/about' },
];

export default navLinkData;
