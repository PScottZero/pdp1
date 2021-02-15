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
    new TapeConfig('Minksytron #1', 'dpys5.rim', true, 0o677721, 0o500, 0o10),
    new TapeConfig('Minksytron #2', 'dpys5.rim', true, 0o337722, 0o500, 0o10),
    new TapeConfig('Minksytron #3', 'dpys5.rim', true, 0o057665, 0o500, 0o10),
    new TapeConfig('Minksytron #4', 'dpys5.rim', true, 0o357665, 0o500, 0o10),
    new TapeConfig('Minksytron #5', 'dpys5.rim', true, 0o456647, 0o500, 0o10),
    new TapeConfig('Minksytron #6', 'dpys5.rim', true, 0o002277, 0o500, 0o10),
    new TapeConfig('Munching Squares #1', 'dpys5.rim', true, 0o6000, 0o0, 0o10),
    new TapeConfig('Munching Squares #2', 'dpys5.rim', true, 0o1000, 0o0, 0o10),
    new TapeConfig(
      'Munching Squares #3',
      'dpys5.rim',
      true,
      0o500077,
      0o0,
      0o10
    ),
    new TapeConfig(
      'Munching Squares #4',
      'dpys5.rim',
      true,
      0o570157,
      0o0,
      0o10
    ),
    new TapeConfig('Munching Squares #5', 'dpys5.rim', true, 0o6002, 0o0, 0o10),
    new TapeConfig('Snowflake', 'snowflake_sa-100.bin'),
    new TapeConfig('Snowflake (CHM Demo)', 'dpys5.rim'),
    new TapeConfig('Spacewar!', 'spacewar3.1_24-sep-62.bin', false),
  ];
  selectedTape: TapeConfig = this.tapes[2];

  constructor(private pdp: PDPService) {}

  selectTape(tapeConfig: TapeConfig): void {
    this.selectedTape = tapeConfig;
    this.pdp.loadTapeConfig(tapeConfig);
  }
}
