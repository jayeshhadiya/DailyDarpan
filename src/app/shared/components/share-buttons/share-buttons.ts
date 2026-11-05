import { Component, ViewEncapsulation, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { AnalyticsService } from '@core/services/analytics.service';
import { LangService } from '@i18n/lang.service';
import { linkedin, telegram, whatsapp, xLogo } from '@icon/icons';
import { Icon } from '@shared/components/icon/icon';

// "Share:" and a row of round buttons: Telegram first (where our students are), then WhatsApp, X, LinkedIn,
// the phone's own share menu (only where the browser has one) and Copy link.
// `text` is the whole message, ending with the link; `url` is the link alone.
@Component({
  selector: 'ca-share',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  template: `
  @let t = lang.t();
  <div class="flex flex-wrap items-center justify-center gap-2">
    <span class="me-1 text-sm text-gray-600 dark:text-gray-400">{{ t.shareLabel }}</span>
    @for (network of networks(); track network.name) {
      <a [href]="network.href" target="_blank" rel="noopener" (click)="track(network.method)"
        [attr.aria-label]="t.shareOn(network.name)" [attr.title]="network.name" [class]="button">
        <icon [path]="network.icon" [size]="18" iconClass="fill-current"/>
      </a>
    }
    @if (canShare()) {
      <button type="button" (click)="nativeShare()" [attr.aria-label]="t.shareMore" [attr.title]="t.shareMore" [class]="button">
        <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>
      </button>
    }
    <button type="button" (click)="copy()" [attr.aria-label]="copied() ? t.linkCopied : t.copyLink" [attr.title]="copied() ? t.linkCopied : t.copyLink"
      [class]="button + (copied() ? ' !border-green-600 !text-green-600' : '')">
      @if (copied()) {
        <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>
      } @else {
        <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
      }
    </button>
    <span class="sr-only" aria-live="polite">{{ copied() ? t.linkCopied : '' }}</span>
  </div>
  `
})
export class ShareButtons {
  text = input.required<string>();
  url = input.required<string>();
  // What is shared, for analytics: a quiz, a score, a month's PDF page or an exam notification.
  content = input<'quiz' | 'score' | 'month' | 'exam'>('quiz');
  lang = inject(LangService);
  private analytics = inject(AnalyticsService);
  button = 'flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-colors hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400';
  // The message without the link at its end, for sites that take the link separately.
  private message = computed(() => this.text().replace(this.url(), '').trim());
  networks = computed(() => {
    const url = encodeURIComponent(this.url());
    const message = encodeURIComponent(this.message());
    return [
      { name: 'Telegram', method: 'telegram', icon: telegram, href: `https://t.me/share/url?url=${url}&text=${message}` },
      { name: 'WhatsApp', method: 'whatsapp', icon: whatsapp, href: `https://wa.me/?text=${encodeURIComponent(this.text())}` },
      { name: 'X', method: 'x', icon: xLogo, href: `https://x.com/intent/post?text=${message}&url=${url}` },
      { name: 'LinkedIn', method: 'linkedin', icon: linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
    ];
  });
  // Known only in the browser, so the prerendered page leaves this button out until the app starts.
  canShare = signal(false);
  copied = signal(false);

  constructor() {
    afterNextRender(() => this.canShare.set(typeof navigator.share === 'function'));
  }

  async nativeShare(): Promise<void> {
    try {
      await navigator.share({ text: this.message(), url: this.url() });
      this.track('native');
    } catch {}
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
      this.track('copy');
    } catch {}
  }

  track(method: string): void {
    this.analytics.event('share', { method, content: this.content() });
  }
}
