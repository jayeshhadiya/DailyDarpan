import { Component, ViewEncapsulation, inject, input } from '@angular/core';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { telegram } from '@icon/icons';
import { Icon } from '@shared/components/icon/icon';

// "Join on Telegram" call to action. Renders nothing until `telegramUrl` is set
// in src/app/data/site.json. `card` is the full community section, `button` just the button.
@Component({
  selector: 'ca-telegram-join',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  template: `
  @let t = lang.t();
  @if (url) {
    @if (variant() === 'card') {
      <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2AABEE] to-[#1a7fb8] p-6 text-white sm:p-8" aria-labelledby="telegram-community">
        <!-- Large faded logo in the corner, decoration only. -->
        <icon [path]="icon" [size]="220" color="#fff" class="pointer-events-none absolute -right-12 -top-10 opacity-10" aria-hidden="true"/>
        <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div class="flex-1">
            <p class="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              <icon [path]="icon" [size]="14" color="#fff"/> {{ t.freeCommunity }}
            </p>
            <h2 id="telegram-community" class="mt-3 text-2xl font-bold tracking-tight">{{ t.communityTitle(name) }}</h2>
            <p class="mt-2 text-sm text-white/85">{{ t.communityText }}</p>
            <ul class="mt-4 flex flex-col gap-2 text-sm">
              @for (benefit of t.benefits; track benefit) {
                <li class="flex items-start gap-2">
                  <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clip-rule="evenodd"/></svg>
                  {{ benefit }}
                </li>
              }
            </ul>
          </div>
          <div class="flex flex-col items-center gap-2 sm:w-56">
            <a [href]="url" target="_blank" rel="noopener"
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#1a7fb8] shadow-lg transition-transform hover:scale-[1.03]">
              <icon [path]="icon" [size]="20" color="#229ED9"/> {{ t.joinHandle(handle) }}
            </a>
            <p class="text-xs text-white/80">{{ t.freeLeave }}</p>
          </div>
        </div>
      </section>
    } @else {
      <a [href]="url" target="_blank" rel="noopener" [class]="buttonClass">
        <icon [path]="icon" [size]="16" color="#fff"/> {{ t.joinTelegram }}
      </a>
    }
  }
  `
})
export class TelegramJoin {
  variant = input<'card' | 'button'>('button');
  url = site.telegramUrl;
  name = site.name;
  // "@DailyDarpan" from "https://t.me/DailyDarpan".
  handle = '@' + site.telegramUrl.split('/').pop();
  lang = inject(LangService);
  icon = telegram;
  buttonClass = 'inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#229ED9] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1b8cc2]';
}
