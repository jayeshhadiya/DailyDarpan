import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

// What the visitor has done, kept in this browser only (localStorage, never sent anywhere):
// answers chosen per quiz, so a reload or a later visit keeps them; the score of every finished quiz;
// and the days they finished a quiz on, for the streak.
// Everything starts empty, during prerendering and in the browser, and load() fills it in after
// the first render, so the page the browser first draws matches the prerendered HTML.
interface Saved {
  // Chosen option per question, keyed by questionId() (not by position, so editing a day
  // doesn't move answers onto other questions): answers['2026-10-31']['k3x9a1'] = 1.
  answers: Record<string, Record<string, number>>;
  // Score of each finished quiz.
  results: Record<string, { score: number; total: number }>;
  // The visitor's own calendar days (YYYY-MM-DD, local time) on which they finished any quiz, oldest first.
  played: string[];
}

const KEY = 'progress';
const empty = (): Saved => ({ answers: {}, results: {}, played: [] });

// YYYY-MM-DD of a moment in the visitor's own time zone.
const localDay = (time: Date) =>
  `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

// Keeps only the parts of saved data that have the right shape, so an old format, a hand edit or a
// half-written value can never break a page. Anything else is dropped.
function clean(data: unknown): Saved {
  const saved = empty();
  if (!isRecord(data)) return saved;
  if (isRecord(data['answers'])) {
    for (const [date, day] of Object.entries(data['answers'])) {
      if (!isRecord(day)) continue;
      const picks = Object.entries(day).filter(([, option]) => isCount(option));
      if (picks.length) saved.answers[date] = Object.fromEntries(picks) as Record<string, number>;
    }
  }
  if (isRecord(data['results'])) {
    for (const [date, result] of Object.entries(data['results'])) {
      if (isRecord(result) && isCount(result['score']) && isCount(result['total'])) {
        saved.results[date] = { score: result['score'], total: result['total'] };
      }
    }
  }
  if (Array.isArray(data['played'])) {
    saved.played = data['played'].filter((day): day is string => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day));
  }
  return saved;
}

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private document = inject(DOCUMENT);
  private saved = signal<Saved>(empty());
  // The visitor's date, refreshed when they come back to the tab, so a page left open overnight
  // doesn't keep showing yesterday's streak.
  private today = signal(localDay(new Date()));

  readonly results = computed(() => this.saved().results);
  readonly finishedCount = computed(() => Object.keys(this.saved().results).length);
  // Days in a row, up to today, with a finished quiz. A streak still counts until the end of the
  // next day, so it doesn't show 0 in the morning before today's quiz is done.
  readonly streak = computed(() => {
    const played = new Set(this.saved().played);
    const [year, month, date] = this.today().split('-').map(Number);
    const day = new Date(year, month - 1, date);
    if (!played.has(localDay(day))) day.setDate(day.getDate() - 1);
    let count = 0;
    while (played.has(localDay(day))) {
      count++;
      day.setDate(day.getDate() - 1);
    }
    return count;
  });
  readonly playedToday = computed(() => this.saved().played.includes(this.today()));

  // Called once by App after the first render.
  load(): void {
    if (!this.isBrowser) return;
    this.refreshToday();
    const refresh = () => this.refreshToday();
    this.document.addEventListener('visibilitychange', refresh);
    this.document.defaultView?.addEventListener('focus', refresh);
    try {
      this.saved.set(clean(JSON.parse(localStorage.getItem(KEY) ?? 'null')));
    } catch {}
  }

  answer(date: string, id: string): number | undefined {
    return this.saved().answers[date]?.[id];
  }

  setAnswer(date: string, id: string, option: number): void {
    this.update(s => ({ ...s, answers: { ...s.answers, [date]: { ...s.answers[date], [id]: option } } }));
  }

  // Records a finished quiz: its score and today's date for the streak.
  finish(date: string, score: number, total: number): void {
    this.refreshToday();
    const today = this.today();
    this.update(s => ({
      ...s,
      results: { ...s.results, [date]: { score, total } },
      // A year is plenty for any streak.
      played: s.played.includes(today) ? s.played : [...s.played, today].slice(-400),
    }));
  }

  // "Reset" on a quiz: its answers go, but its last score and the streak stay.
  clearAnswers(date: string): void {
    this.update(s => {
      const { [date]: _, ...answers } = s.answers;
      return { ...s, answers };
    });
  }

  private refreshToday(): void {
    this.today.set(localDay(new Date()));
  }

  private update(change: (saved: Saved) => Saved): void {
    this.saved.update(change);
    if (!this.isBrowser) return;
    // Throws when the browser blocks site data; progress then lasts until the page is closed.
    try { localStorage.setItem(KEY, JSON.stringify(this.saved())); } catch {}
  }
}
