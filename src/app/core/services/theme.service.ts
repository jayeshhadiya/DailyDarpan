import { Injectable, Signal, computed, signal } from '@angular/core';
import site from '@data/site.json';
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public color = signal<string>(this.getInitialColor());
  public openColor = signal<boolean>(false)
  public getColor: Signal<string> = computed(() => this.color());
  setThemeColor(color: string){
    this.color.set(color);
    this.saveColor(color);
  }
  toggle(){
    this.openColor.set(!this.openColor());
  }
  // localStorage throws when the browser blocks site data, so failures just mean the choice isn't remembered.
  private saveColor(color: string){
    try { localStorage.setItem('color', color); } catch {}
  }
  private getInitialColor(): string {
    if (typeof window !== 'undefined') {
      try {
        const storedColor = localStorage.getItem('color');
        // Same check as the early script in index.html.
        if (storedColor && /^#[0-9a-f]{3,8}$/i.test(storedColor)) {
          return storedColor;
        }
      } catch {}
    }
    return site.mainColor
  }
}
