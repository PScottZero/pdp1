import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { ConsoleComponent } from './components/console/console.component';
import { DisplayComponent } from './components/display/display.component';

@NgModule({
  declarations: [
    AppComponent,
    ConsoleComponent,
    DisplayComponent,
  ],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
