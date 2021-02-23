import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-mobile-controls',
  templateUrl: './mobile-controls.component.html',
  styleUrls: ['./mobile-controls.component.scss'],
})
export class MobileControlsComponent {
  @Output() buttonPress: EventEmitter<string> = new EventEmitter<string>();
  @Output() buttonRelease: EventEmitter<string> = new EventEmitter<string>();

  press(buttonValue: string): void {
    this.buttonPress.emit(buttonValue);
  }

  release(buttonValue: string): void {
    this.buttonRelease.emit(buttonValue);
  }
}
