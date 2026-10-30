import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Icon } from '@shared/components/icon/icon';
import { chevronUp } from '@icon/icons';
import { onScrollChange } from '@core/utils/scroll-change';
import { LangService } from '@i18n/lang.service';
@Component({
  selector: 'scroll-to-top',
  template: `
  <div class="scroll-to-top fixed bottom-4 right-4 transition-all delay-200 ease-in-out z-50"
  [ngClass]="windowScrolled() ? 'show-scrollTop opacity-100 visible' : 'opacity-0 invisible'">
    <button [attr.aria-label]="lang.t().scrollTop" type="button" class="bg-primary p-3 rounded-full" (click)="scrollToTop()">
      <icon
        [path]="chevronUpIcon"
        [size]="25"
        viewBox="0 0 512 512"
        iconClass="fill-white"
      />
    </button>
  </div>
  `,
  imports: [NgClass, Icon],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollToTop {
  windowScrolled = signal(false);
  public chevronUpIcon = chevronUp
  private document: Document = inject(DOCUMENT);
  lang = inject(LangService);

  constructor() {
    onScrollChange(() => this.document.documentElement.scrollTop > 100, scrolled => this.windowScrolled.set(scrolled));
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
