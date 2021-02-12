import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import {
  DisplayService,
  DISPLAY_SIZE,
} from '../../pdp-emulator/display.service';

@Component({
  selector: 'app-display',
  templateUrl: './display.component.html',
  styleUrls: ['./display.component.scss'],
})
export class DisplayComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  context: CanvasRenderingContext2D;
  @Input() shrinkDisplay: boolean;

  constructor(private display: DisplayService) {}

  ngOnInit(): void {
    this.context = this.canvas.nativeElement.getContext('2d');
    this.context.strokeStyle = 'transparent';
    this.display.refreshEmitter.subscribe(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this.context.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    for (let index = 0; index < DISPLAY_SIZE * DISPLAY_SIZE; index++) {
      if (this.display.data[index] > 0) {
        this.context.fillStyle = this.fillColor(this.display.data[index]);
        this.context.fillRect(
          index % DISPLAY_SIZE,
          Math.floor(index / DISPLAY_SIZE),
          2,
          2
        );
        this.display.data[index] -= 0.025;
      }
    }
  }

  fillColor(px: number): string {
    if (px > 0.9) {
      return `rgba(171, 255, 255, 1)`;
    } else {
      return `rgba(23, 94, 25, ${px})`;
    }
  }
}
