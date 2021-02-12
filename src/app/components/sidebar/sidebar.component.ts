import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Output() shouldResize = new EventEmitter<boolean>();
  expand = false;

  hideConsole(): void {
    this.expand = false;
    this.shouldResize.emit(this.expand);
  }

  unhideConsole(): void {
    this.expand = true;
    this.shouldResize.emit(this.expand);
  }
}
