import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import site from '@data/site.json';
import { LangService } from '@i18n/lang.service';
import { telegram } from '@icon/icons';
import { Icon } from '@shared/components/icon/icon';

// Small Telegram button fixed to the bottom-left corner on every page (scroll-to-top uses the right).
// Icon only on phones, with a label from the md breakpoint. Hidden while `telegramUrl` is empty.
@Component({
  selector: 'telegram-float',
  imports: [Icon],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (url) {
    <a [href]="url" target="_blank" rel="noopener" [attr.aria-label]="lang.t().joinChannelAria"
      class="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-[#229ED9] p-3 font-medium text-white shadow-lg transition-colors hover:bg-[#1b8cc2] md:px-4 md:py-2.5 print:hidden">
      <icon [path]="icon" [size]="24" color="#fff"/>
      <span class="hidden text-sm md:inline">{{ lang.t().joinTelegramShort }}</span>
    </a>
  }
  `
})
export class TelegramFloat {
  lang = inject(LangService);
  url = site.telegramUrl;
  icon = telegram;
}
