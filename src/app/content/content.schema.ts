export interface CurrentAffairsQuestion {
  question: string;
  options: string[];
  // Index into `options` of the correct answer (the same for every language).
  answer: number;
  // Short fact shown after answering.
  explanation?: string;
  // English name; translated for display by LangService.category().
  category?: string;
  // Gujarati text. Options must be in the same order as the English ones.
  gu?: QuestionText;
}

export interface QuestionText {
  question: string;
  options: string[];
  explanation?: string;
}

export interface CurrentAffairsDay {
  // YYYY-MM-DD, same as the file name in content/days.
  date: string;
  questions: CurrentAffairsQuestion[];
  // Where the facts came from, shown under the quiz.
  sources?: { name: string; url: string }[];
}

// What the home page and calendar need about a day, without its questions.
export interface DaySummary {
  date: string;
  count: number;
  // Most common first.
  categories: string[];
}

export interface CurrentAffairsMonth {
  // YYYY-MM, used in the /current-affairs/month/YYYY-MM address. LangService.monthLabel() names it.
  key: string;
  // Newest first.
  days: DaySummary[];
}
