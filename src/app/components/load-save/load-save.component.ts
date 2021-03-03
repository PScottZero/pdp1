import { Component, OnInit } from '@angular/core';
import { PDPService } from 'src/app/pdp-emulator/pdp.service';

@Component({
  selector: 'app-load-save',
  templateUrl: './load-save.component.html',
  styleUrls: ['./load-save.component.scss'],
})
export class LoadSaveComponent implements OnInit {
  loadTapeElement: HTMLInputElement;
  loadMemoryElement: HTMLInputElement;

  constructor(private pdp: PDPService) {}

  ngOnInit(): void {
    this.loadTapeElement = document.getElementById(
      'load-tape-input'
    ) as HTMLInputElement;
    this.loadMemoryElement = document.getElementById(
      'load-memory-input'
    ) as HTMLInputElement;
  }

  loadTape(): void {
    const file = this.loadTapeElement.files[0];
    const fileReader = new FileReader();
    this.pdp.reset();
    fileReader.onload = () =>
      this.pdp.parseTape(fileReader.result as ArrayBuffer);
    fileReader.readAsArrayBuffer(file);
  }

  loadMemory(): void {
    const file = this.loadMemoryElement.files[0];
    const fileReader = new FileReader();
    this.pdp.reset();
    fileReader.onload = () => {
      this.pdp.mem = JSON.parse(fileReader.result as string) as number[];
      this.pdp.consoleEmitter.emit();
    };
    fileReader.readAsText(file);
  }

  saveMemory(): void {
    const memArray = JSON.stringify(this.pdp.mem);
    const anchor = document.createElement('a');
    document.body.appendChild(anchor);
    anchor.setAttribute('style', 'display: none;');
    const url = window.URL.createObjectURL(
      new Blob([memArray], { type: 'octet/stream' })
    );
    anchor.setAttribute('href', url);
    anchor.setAttribute('download', 'pdp1-memory.json');
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  clearMemory(): void {
    this.pdp.reset();
  }
}
