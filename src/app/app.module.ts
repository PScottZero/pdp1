import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { ConsoleComponent } from './components/console/console.component';
import { SwitchComponent } from './components/switch/switch.component';
import { ContentComponent } from './components/content/content.component';
import { DisplayComponent } from './components/display/display.component';
import { MenuButtonComponent } from './components/menu-button/menu-button.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ConsoleComponent,
    SwitchComponent,
    ContentComponent,
    DisplayComponent,
    MenuButtonComponent,
  ],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
