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
    this.pdp.showMonitor = !this.pdp.showMonitor;
  }

  showMonitor(): boolean {
    return this.pdp.showMonitor;
  }

  getImage(): string {
    return this.pdp.showMonitor ? 'display_icon' : 'console_icon';
  }
}
