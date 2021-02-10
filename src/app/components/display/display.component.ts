import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
      this.context.fillStyle = this.fillColor(this.display.data[index]);
      this.context.fillRect(
        index % DISPLAY_SIZE,
        Math.floor(index / DISPLAY_SIZE),
        1,
        1
      );
    }
  }

  fillColor(px: number): string {
    const intensity = px / 255;
    const startR = 148;
    const startG = 230;
    const startB = 255;
    const endR = 92;
    const endG = 255;
    const endB = 103;
    const red = startR - (startR - endR) * intensity;
    const green = startG - (startG - endG) * intensity;
    const blue = startB - (startB - endB) * intensity;
    return `rgba(${red}, ${green}, ${blue}, ${px})`;
  }
}
