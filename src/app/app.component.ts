import { Component, HostListener } from '@angular/core';
import { PDPService } from './pdp-emulator/pdp.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'pdp1';
  showSidebar = false;

  constructor(private pdp: PDPService) {}

  @HostListener('window:keydown', ['$event'])
  setControllerInput(event: KeyboardEvent): void {
    this.buttonPress(event.key);
  }

  @HostListener('window:keyup', ['$event'])
  unsetControllerInput(event: KeyboardEvent): void {
    this.buttonRelease(event.key);
  }

  setSidebarVisible(visible: boolean): void {
    this.showSidebar = visible;
  }

  showMobileControls(): boolean {
    return window.innerWidth < 768 && this.pdp.tapeName == 'Spacewar!';
  }

  buttonPress(buttonValue: string): void {
    switch (buttonValue.toLowerCase()) {
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

  buttonRelease(buttonValue: string): void {
    switch (buttonValue.toLowerCase()) {
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
