// An exam notification, one file in content/exams/<id>.json (see README: Add an exam notification).
// scripts/build-exams.mjs checks every file against these rules before the site is built.

// The text a visitor reads. Every section is optional; a missing one is simply not shown.
export interface ExamText {
  // "GSSSB Food Safety Officer Recruitment 2026"
  title: string;
  // Full name of the recruiting body.
  organization?: string;
  // Two or three sentences: who is hiring, for what, how many posts, the last date.
  summary?: string;
  posts?: { name: string; vacancies?: string; payScale?: string }[];
  importantDates?: { event: string; date: string }[];
  education?: string[];
  ageLimit?: string;
  ageRelaxation?: { category: string; relaxation: string }[];
  fees?: { category: string; amount: string }[];
  salary?: string;
  selectionProcess?: string[];
  examPattern?: { paper: string; subjects?: string; questions?: string; marks?: string; duration?: string }[];
  examNotes?: string[];
  syllabus?: { topic: string; details?: string }[];
  howToApply?: string[];
}

export interface ExamNotification extends ExamText {
  // Same as the file name; the page is at /exams/<id>.
  id: string;
  // Short name of the recruiting body, shown on the card: "GSSSB", "GPSC", "UPSC".
  board: string;
  advtNo?: string;
  // YYYY-MM-DD the notification came out (the list is newest first).
  published: string;
  // YYYY-MM-DD, online application opens / closes.
  startDate?: string;
  lastDate?: string;
  totalVacancies?: number;
  // The official notification PDF and the page to apply on.
  notificationUrl: string;
  applyUrl?: string;
  // Gujarati text. A section left out here is shown in English on Gujarati pages.
  gu?: Partial<ExamText>;
}

// What the list page needs, without the details.
export interface ExamSummary {
  id: string;
  board: string;
  published: string;
  lastDate?: string;
  totalVacancies?: number;
  title: string;
  titleGu?: string;
}
