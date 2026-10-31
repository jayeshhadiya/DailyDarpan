import { Component, ViewEncapsulation, effect, inject } from '@angular/core';
import { MetaService } from '@core/services/meta.service';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';

// What the site records (Google Analytics, browser storage) and how to opt out.
@Component({
  selector: 'privacy-page',
  encapsulation: ViewEncapsulation.None,
  imports: [TelegramJoin],
  template: `
  @let t = lang.t();
  <div class="mx-auto max-w-2xl">
    <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl">{{ t.privacyTitle }}</h1>
    <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">{{ t.privacyUpdated }}</p>
    @for (section of t.privacySections(name); track $index) {
      <section class="mt-8">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ section.title }}</h2>
        <p class="mt-2 text-gray-600 dark:text-gray-400">{{ section.text }}</p>
      </section>
    }
    <div class="mt-6"><ca-telegram-join/></div>
  </div>
  `
})
export class PrivacyPage {
  lang = inject(LangService);
  name = site.name;

  constructor() {
    const meta = inject(MetaService);
    effect(() => {
      const t = this.lang.t();
      meta.setMetaTags(t.privacyTitle, t.privacyMetaDescription(site.name), ['privacy', site.name]);
    });
  }
}
