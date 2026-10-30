import { Component, ViewEncapsulation, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MetaService } from '@core/services/meta.service';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { TelegramJoin } from '@shared/components/telegram-join/telegram-join';

@Component({
  selector: 'about-page',
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, TelegramJoin],
  template: `
  @let t = lang.t();
  <div class="mx-auto max-w-2xl">
    <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl">{{ t.aboutTitle(name) }}</h1>
    <p class="mt-3 text-lg text-gray-600 dark:text-gray-400">{{ t.tagline }}</p>

    @for (section of t.aboutSections(name); track $index) {
      <section class="mt-10">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ section.title }}</h2>
        <p class="mt-2 text-gray-600 dark:text-gray-400">{{ section.text }}</p>
      </section>
    }

    <section id="contact" class="mt-10">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ t.mistakeTitle }}</h2>
      <p class="mt-2 text-gray-600 dark:text-gray-400">{{ t.mistakeText }}{{ telegramUrl ? t.mistakeTelegram : t.mistakeNoTelegram }}</p>
      <div class="mt-4"><ca-telegram-join/></div>
    </section>

    <p class="mt-12 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 text-sm text-gray-600 dark:text-gray-400">
      <span class="font-semibold">{{ t.disclaimerLabel }}</span> {{ t.disclaimer(name) }}
    </p>

    <a [routerLink]="lang.path('/')" class="mt-10 inline-block rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600">{{ t.startToday }}</a>
  </div>
  `
})
export class AboutPage {
  lang = inject(LangService);
  name = site.name;
  telegramUrl = site.telegramUrl;

  constructor() {
    const meta = inject(MetaService);
    effect(() => {
      const t = this.lang.t();
      meta.setMetaTags(t.aboutTitle(site.name), t.aboutMetaDescription(site.name), ['about', site.name, 'current affairs quiz', 'કરન્ટ અફેર્સ']);
    });
  }
}
