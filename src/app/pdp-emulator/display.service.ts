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

  setXY(x: number, y: number, intensity: number): void {
    x = Math.floor(x / 4);
    y = Math.floor(y / 4);
    if ((intensity & 0b100) != 0) {
      intensity = -(~intensity & 0b11) + 4;
    } else {
      intensity += 5;
    }
    this.data[y * DISPLAY_SIZE + x] = intensity / 8;
  }

  refresh(): void {
    for (let index = 0; index < DISPLAY_SIZE * DISPLAY_SIZE; index++) {
      if (this.data[index] > 0) {
        this.data[index] -= 0.02;
      }
    }
    this.refreshEmitter.emit();
  }
}
