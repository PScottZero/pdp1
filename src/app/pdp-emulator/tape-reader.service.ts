import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TapeReaderService {
  load(tapeName: string, pdpMemory: number[]): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `assets/tapes/${tapeName}`, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      const bytes = new Uint8Array(xhr.response);
      let readingHeader = false;
      let readingProgram = false;
      let memIndex = 0;
      for (let byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
        if (bytes[byteIndex] == 0x9a && !readingHeader && !readingProgram) {
          readingHeader = true;
        }
        if (readingHeader) {
          if ((bytes[byteIndex] & 0x80) != 0) {
            byteIndex += 5;
          } else {
            readingHeader = false;
            readingProgram = true;
          }
        }
        if (readingProgram) {
          if ((bytes[byteIndex] & 0x80) != 0) {
            let word = bytes[byteIndex] & 0o77;
            byteIndex++;
            word = (word << 6) | (bytes[byteIndex] & 0o77);
            byteIndex++;
            word = (word << 6) | (bytes[byteIndex] & 0o77);
            pdpMemory[memIndex] = word;
            memIndex++;
          }
        }
      }
    };
    xhr.send();
  }
}
