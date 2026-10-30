import { Component, ViewEncapsulation, inject } from '@angular/core';
import { LangService } from '@i18n/lang.service';

// Shown on the current affairs pages until daily uploads start.
// When they do, delete this component and its <ca-demo-notice/> tags (search the pages folder).
@Component({
  selector: 'ca-demo-notice',
  encapsulation: ViewEncapsulation.None,
  template: `
  @let t = lang.t();
  <div role="note" class="mb-8 flex gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-left">
    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-amber-950" aria-hidden="true">!</span>
    <p class="text-sm text-amber-900 dark:text-amber-100">
      <span class="font-semibold">{{ t.noteLabel }}</span> {{ t.demoBefore }}<span class="font-semibold">{{ t.demoDate }}</span>{{ t.demoAfter }}
    </p>
  </div>
  `
})
export class DemoNotice {
  lang = inject(LangService);
}
