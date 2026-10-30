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
  private saveColor(color: string){
    localStorage.setItem('color', color);
  }
  private getInitialColor(): string {
    if (typeof window !== 'undefined') {
      const storedColor = localStorage.getItem('color');
      if(storedColor){
        return storedColor;
      }
    }
    return site.mainColor
  }
}
