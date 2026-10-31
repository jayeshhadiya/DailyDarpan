import { Injectable, PLATFORM_ID, inject, isDevMode } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Google Analytics 4. Loads only in the browser on the live site (not during prerendering,
// `ng serve` or localhost), so test visits aren't counted. Page views, including moves between
// pages inside the app, are sent by GA4's enhanced measurement ("page changes based on browser
// history events", on by default); the events below add what page views can't show.
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private document = inject(DOCUMENT);
  private lang = inject(LangService);
  private enabled = isPlatformBrowser(inject(PLATFORM_ID)) && !isDevMode() && !!site.gaMeasurementId
    && !['localhost', '127.0.0.1'].includes(this.document.location.hostname);

  // Called once at startup by App.
  load(): void {
    if (!this.enabled) return;
    window.dataLayer = window.dataLayer || [];
    // gtag must push the `arguments` object itself, not an array.
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', site.gaMeasurementId);
    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${site.gaMeasurementId}`;
    this.document.head.appendChild(script);
  }

  // Every event also records the language the visitor is using.
  event(name: AnalyticsEvent, params: Record<string, string | number> = {}): void {
    if (!this.enabled) return;
    window.gtag('event', name, { language: this.lang.lang(), ...params });
  }
}

export type AnalyticsEvent =
  // All questions of a day answered: { quiz_date, score, total }
  | 'quiz_complete'
  // A Telegram link clicked: { placement }
  | 'telegram_join'
  // The ગુજ / EN picker used: { to }
  | 'language_switch'
  // A category chip on a month page: { category, month }
  | 'month_filter';
