import { DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Listens to window scroll and calls `update` only when `read()` returns a new value,
// so scrolling doesn't re-render on every frame. Call from a constructor; the listener
// is removed when the component is destroyed.
export function onScrollChange<T>(read: () => T, update: (value: T) => void): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
  let last: T | undefined;
  const listener = () => {
    const value = read();
    if (value !== last) {
      last = value;
      update(value);
    }
  };
  window.addEventListener('scroll', listener, { passive: true });
  inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', listener));
}
