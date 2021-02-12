import { Component } from '@angular/core';
import { PDPService } from 'src/app/pdp-emulator/pdp.service';
import { TapeConfig } from './tape-config';

@Component({
  selector: 'app-tape-list',
  templateUrl: './tape-list.component.html',
  styleUrls: ['./tape-list.component.scss'],
})
export class TapeListComponent {
  tapes = [
    new TapeConfig('Minksytron', 'dpys5.rim', true, 0o677721, 0o10, 0o500),
    new TapeConfig('Munching Squares', 'dpys5.rim', true, 0o6000, 0o10, 0o0),
    new TapeConfig('Snowflake', 'snowflake_sa-100.bin', true),
    new TapeConfig('Snowflake (CHM Demo)', 'dpys5.rim', true),
    new TapeConfig('Spacewar!', 'spacewar3.1_24-sep-62.bin', false),
  ];
  selectedTape: TapeConfig = this.tapes[2];

  constructor(private pdp: PDPService) {}

  selectTape(tapeConfig: TapeConfig): void {
    this.selectedTape = tapeConfig;
    this.pdp.loadTapeConfig(tapeConfig);
  }
}
