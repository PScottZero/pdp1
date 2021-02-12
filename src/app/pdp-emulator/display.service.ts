import { EventEmitter, Injectable } from '@angular/core';
import * as mask from './masks';

export const DISPLAY_SIZE = 1024;

@Injectable({
  providedIn: 'root',
})
export class DisplayService {
  data: number[];
  refreshEmitter: EventEmitter<void>;

  constructor() {
    this.data = Array<number>(DISPLAY_SIZE * DISPLAY_SIZE).fill(0);
    this.refreshEmitter = new EventEmitter<void>();
    requestAnimationFrame(() => this.step());
  }

  step(): void {
    this.refreshEmitter.emit();
    requestAnimationFrame(() => this.step());
  }

  setPixel(AC: number, IO: number): void {
    let x = (AC >> 8) & mask.MASK_10;
    let y = (IO >> 8) & mask.MASK_10;

    if (((x >> 9) & mask.MASK_1) == 1) {
      x = 511 - (~x & mask.MASK_9);
    } else {
      x += 511;
    }
    if (((y >> 9) & mask.MASK_1) == 1) {
      y = 511 + (~y & mask.MASK_9);
    } else {
      y = 511 - y;
    }
    this.data[y * DISPLAY_SIZE + x] = 1;
  }
}
