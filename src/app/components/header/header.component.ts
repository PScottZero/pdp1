import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  showSidebar: boolean;

  ngOnInit(): void {
    this.showSidebar = false;
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }
}
