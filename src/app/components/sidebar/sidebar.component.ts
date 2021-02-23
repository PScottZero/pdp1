import { Component, Output, EventEmitter } from '@angular/core';
import { IconButton } from '../icon-button/IconButton';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Output() shouldResize = new EventEmitter<boolean>();
  expand = false;

  buttons = [
    new IconButton(
      'manual.svg',
      'http://www.bitsavers.org/pdf/dec/pdp1/F15D_PDP1_Handbook_Oct63.pdf',
      '#444'
    ),
    new IconButton('about_me.svg', 'http://pjs4.com', '#444'),
    new IconButton('github.svg', 'https://github.com/PScottZero/pdp1', '#444'),
  ];

  hideConsole(): void {
    this.expand = false;
    this.shouldResize.emit(this.expand);
  }

  unhideConsole(): void {
    this.expand = true;
    this.shouldResize.emit(this.expand);
  }
}
