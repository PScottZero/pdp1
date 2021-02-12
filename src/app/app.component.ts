import { Component, HostListener } from '@angular/core';
import { PDPService } from './pdp-emulator/pdp.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'pdp1';

  constructor(private pdp: PDPService) {}

  @HostListener('window:keydown', ['$event'])
  setControllerInput(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'w':
        this.pdp.controller |= 0o1;
        break;
      case 's':
        this.pdp.controller |= 0o2;
        break;
      case 'a':
        this.pdp.controller |= 0o4;
        break;
      case 'd':
        this.pdp.controller |= 0o10;
        break;
      case 'i':
        this.pdp.controller |= 0o40000;
        break;
      case 'k':
        this.pdp.controller |= 0o100000;
        break;
      case 'j':
        this.pdp.controller |= 0o200000;
        break;
      case 'l':
        this.pdp.controller |= 0o400000;
        break;
    }
  }

  @HostListener('window:keyup', ['$event'])
  unsetControllerInput(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'w':
        this.pdp.controller &= ~0o1;
        break;
      case 's':
        this.pdp.controller &= ~0o2;
        break;
      case 'a':
        this.pdp.controller &= ~0o4;
        break;
      case 'd':
        this.pdp.controller &= ~0o10;
        break;
      case 'i':
        this.pdp.controller &= ~0o40000;
        break;
      case 'k':
        this.pdp.controller &= ~0o100000;
        break;
      case 'j':
        this.pdp.controller &= ~0o200000;
        break;
      case 'l':
        this.pdp.controller &= ~0o400000;
        break;
    }
  }
}
