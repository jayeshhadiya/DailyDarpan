import { Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ResolveFn } from '@angular/router';
import { Lang, STRINGS } from '@i18n/strings';

// The language being shown. English pages live at /…, Gujarati pages at /gu/…;
// the route tree sets the language through langResolver before any page renders.
@Injectable({
  providedIn: 'root'
})
export class LangService {
  private document = inject(DOCUMENT);
  readonly lang = signal<Lang>('en');
  // UI text for the current language.
  readonly t = computed(() => STRINGS[this.lang()]);
  // Locale id for Angular's date pipe ('gu' is registered in app.config.ts).
  readonly locale = computed(() => this.lang() === 'gu' ? 'gu' : 'en-US');

  set(lang: Lang): void {
    this.lang.set(lang);
    this.document.documentElement.lang = lang;
  }

  // An app path ('/', '/about', '/current-affairs/…') in the current language.
  path(path: string, lang: Lang = this.lang()): string {
    if (lang === 'en') return path;
    return path === '/' ? '/gu' : `/gu${path}`;
  }

  // The same address in another language, keeping query string and fragment.
  switchUrl(url: string, lang: Lang): string {
    let enUrl = url.replace(/^\/gu(?=[/?#]|$)/, '');
    if (!enUrl.startsWith('/')) enUrl = '/' + enUrl;
    if (lang === 'en') return enUrl;
    // The home page ('/', '/?…', '/#…') sits directly at /gu; every other path gets the prefix.
    return '/gu' + (/^\/([?#]|$)/.test(enUrl) ? enUrl.slice(1) : enUrl);
  }

  // "October 2026" or "ઑક્ટોબર 2026" from "2026-10".
  monthLabel(key: string): string {
    return new Date(`${key}-01`).toLocaleDateString(this.lang() === 'gu' ? 'gu-IN' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  category(name: string): string {
    return (this.t().categories as Record<string, string>)[name] ?? name;
  }
}

export const langResolver = (lang: Lang): ResolveFn<Lang> => () => {
  inject(LangService).set(lang);
  return lang;
};
