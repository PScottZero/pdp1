import { Component } from '@angular/core';
import { PDPService } from '../../pdp-emulator/pdp.service';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss'],
})
export class ContentComponent {
  constructor(private pdp: PDPService) {}

  showDisplay(): boolean {
    return this.pdp.showMonitor;
  }
}
