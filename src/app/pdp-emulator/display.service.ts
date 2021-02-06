import { EventEmitter, Injectable } from '@angular/core';

export const DISPLAY_SIZE = 256;

@Injectable({
  providedIn: 'root',
})
export class DisplayService {
  data: number[];
  refreshEmitter: EventEmitter<void>;

  constructor() {
    this.data = Array<number>(DISPLAY_SIZE * DISPLAY_SIZE).fill(0);
    this.refreshEmitter = new EventEmitter<void>();
    setInterval(() => this.refresh(), 10);
  }

  setXY(x: number, y: number): void {
    x = Math.floor(x / 4);
    y = Math.floor(y / 4);
    console.log(x, y);
    this.data[y * DISPLAY_SIZE + x] = 1;
  }

  refresh(): void {
    for (let index = 0; index < DISPLAY_SIZE * DISPLAY_SIZE; index++) {
      if (this.data[index] > 0) {
        this.data[index] -= 0;
      }
    }
    this.refreshEmitter.emit();
  }
}
