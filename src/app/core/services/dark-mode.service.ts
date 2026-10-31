import { Injectable, Signal, computed, signal } from '@angular/core';
@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  public state = signal<boolean>(this.getInitialDarkModeState());
  public isDark: Signal<boolean> = computed(() => this.state());

  toggleDarkMode() {
    this.state.set(!this.state())
    this.saveDarkModeState();
  }

  private getInitialDarkModeState(): boolean {
    if (typeof window !== 'undefined') {
      // localStorage throws when the browser blocks site data; fall back to the system setting.
      let storedTheme: string | null = null;
      try { storedTheme = localStorage.getItem('theme'); } catch {}
      if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        return true;
      }
    }
    return false;
  }

  private saveDarkModeState() {
    try { localStorage.setItem('theme', this.state() ? 'dark' : 'light'); } catch {}
  }
}
