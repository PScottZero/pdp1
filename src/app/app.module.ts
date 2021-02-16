import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { ConsoleComponent } from './components/console/console.component';
import { DisplayComponent } from './components/display/display.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TapeListComponent } from './components/tape-list/tape-list.component';
import { LoadSaveComponent } from './components/load-save/load-save.component';

@NgModule({
  declarations: [
    AppComponent,
    ConsoleComponent,
    DisplayComponent,
    SidebarComponent,
    TapeListComponent,
    LoadSaveComponent,
  ],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
