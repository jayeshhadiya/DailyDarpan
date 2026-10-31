import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// What the visitor has done, kept in this browser only (localStorage, never sent anywhere):
// answers chosen per quiz, so a reload or a later visit keeps them; the score of every finished quiz;
// and the days they finished a quiz on, for the streak.
// Everything starts empty, during prerendering and in the browser, and load() fills it in after
// the first render, so the page the browser first draws matches the prerendered HTML.
interface Saved {
  // Chosen option per question: answers['2026-10-31'][2] = 1.
  answers: Record<string, Record<number, number>>;
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

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private saved = signal<Saved>(empty());

  readonly results = computed(() => this.saved().results);
  readonly finishedCount = computed(() => Object.keys(this.saved().results).length);
  // Days in a row, up to today, with a finished quiz. A streak still counts until the end of the
  // next day, so it doesn't show 0 in the morning before today's quiz is done.
  readonly streak = computed(() => {
    const played = new Set(this.saved().played);
    const day = new Date();
    if (!played.has(localDay(day))) day.setDate(day.getDate() - 1);
    let count = 0;
    while (played.has(localDay(day))) {
      count++;
      day.setDate(day.getDate() - 1);
    }
    return count;
  });
  readonly playedToday = computed(() => this.saved().played.includes(localDay(new Date())));

  // Called once by App after the first render.
  load(): void {
    if (!this.isBrowser) return;
    try {
      const data = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (data && typeof data === 'object') this.saved.set({ ...empty(), ...data });
    } catch {}
  }

  answer(date: string, index: number): number | undefined {
    return this.saved().answers[date]?.[index];
  }

  setAnswer(date: string, index: number, option: number): void {
    this.update(s => ({ ...s, answers: { ...s.answers, [date]: { ...s.answers[date], [index]: option } } }));
  }

  // Records a finished quiz: its score and today's date for the streak.
  finish(date: string, score: number, total: number): void {
    const today = localDay(new Date());
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

  private update(change: (saved: Saved) => Saved): void {
    this.saved.update(change);
    if (!this.isBrowser) return;
    // Throws when the browser blocks site data; progress then lasts until the page is closed.
    try { localStorage.setItem(KEY, JSON.stringify(this.saved())); } catch {}
  }
}
