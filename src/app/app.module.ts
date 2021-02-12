import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { ConsoleComponent } from './components/console/console.component';
import { ContentComponent } from './components/content/content.component';
import { DisplayComponent } from './components/display/display.component';
import { MenuButtonComponent } from './components/menu-button/menu-button.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ConsoleComponent,
    ContentComponent,
    DisplayComponent,
    MenuButtonComponent,
    SidebarComponent,
  ],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
