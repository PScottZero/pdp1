import { Component } from '@angular/core';
import { PDPService } from '../../pdp-emulator/pdp.service';

@Component({
  selector: 'app-switch',
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.scss'],
})
export class SwitchComponent {
  constructor(private pdp: PDPService) {}

  toggleSlider(): void {
    this.pdp.showDisplay = !this.pdp.showDisplay;
  }

  showMonitor(): boolean {
    return this.pdp.showDisplay;
  }

  getImage(): string {
    return this.pdp.showDisplay ? 'display_icon' : 'console_icon';
  }
}
