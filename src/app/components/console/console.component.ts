import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PDPService } from '../../pdp-emulator/pdp.service';
import * as helper from '../../pdp-emulator/helperFunctions';

const LIGHT_RADIUS = 30;
const SEPARATION = 79;

@Component({
  selector: 'app-console',
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.scss'],
})
export class ConsoleComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  context: CanvasRenderingContext2D;
  singleStep: boolean;
  bottomSwitchStates: boolean[];
  addressSwitches: number[][];
  testWordSwitches: number[][];
  senseSwitches: number[][];
  bottomSwitches: number[][];
  singleStepSwitch: number[];
  switchImage: HTMLImageElement;
  largeSwitchImage: HTMLImageElement;

  constructor(private pdp: PDPService) {}

  ngOnInit(): void {
    this.context = this.canvas.nativeElement.getContext('2d');
    this.context.strokeStyle = 'transparent';
    this.bottomSwitchStates = Array<boolean>(5).fill(false);
    this.singleStep = false;
    this.switchImage = new Image();
    this.switchImage.src = 'assets/images/switch.svg';
    this.largeSwitchImage = new Image();
    this.largeSwitchImage.src = 'assets/images/switch_large.svg';
    this.switchImage.onload = () => this.drawState();
    this.largeSwitchImage.onload = () => this.drawState();
  }

  switchPressed(event: MouseEvent): void {
    const scale =
      this.canvas.nativeElement.width /
      this.canvas.nativeElement.getBoundingClientRect().width;
    const x =
      (event.pageX - this.canvas.nativeElement.getBoundingClientRect().x) *
      scale;
    const y =
      (event.pageY - this.canvas.nativeElement.getBoundingClientRect().y) *
      scale;
    this.addressSwitches.forEach((value, index) => {
      if (this.inSwitchRange(x, y, value)) {
        this.pdp.selectedAddress ^=
          1 << (this.addressSwitches.length - index - 1);
      }
    });
    this.testWordSwitches.forEach((value, index) => {
      if (this.inSwitchRange(x, y, value)) {
        this.pdp.testWord ^= 1 << (this.testWordSwitches.length - index - 1);
      }
    });
    this.senseSwitches.forEach((value, index) => {
      if (this.inSwitchRange(x, y, value)) {
        this.pdp.senseSwitches[index] = !this.pdp.senseSwitches[index];
      }
    });
    if (this.inSwitchRange(x, y, this.singleStepSwitch)) {
      this.singleStep = !this.singleStep;
      this.pdp.decode();
      this.pdp.MB = this.pdp.mem[this.pdp.PC];
    }
    this.bottomSwitches.forEach((value, index) => {
      if (this.inLargeSwitchRange(x, y, value)) {
        this.bottomSwitchStates[index] = !this.bottomSwitchStates[index];
        this.performBottomSwitchAction(index);
      }
    });
    this.drawState();
  }

  performBottomSwitchAction(index: number): void {
    switch (index) {
      case 3:
        this.pdp.PC = this.pdp.selectedAddress;
        this.pdp.MB = this.pdp.mem[this.pdp.PC];
        break;
      case 4:
        this.pdp.PC = this.pdp.selectedAddress;
        this.pdp.mem[this.pdp.PC] = this.pdp.testWord;
        this.pdp.MB = this.pdp.mem[this.pdp.PC];
        break;
      default:
        break;
    }
  }

  switchReleased(): void {
    this.singleStep = false;
    this.bottomSwitchStates = Array<boolean>(5).fill(false);
    this.drawState();
  }

  drawState(): void {
    this.context.clearRect(
      0,
      0,
      this.canvas.nativeElement.width,
      this.canvas.nativeElement.height
    );

    // lights
    this.drawLightRowCol(407, 296, this.pdp.PC, 16, true);
    this.drawLightRowCol(407, 454, this.pdp.PC, 16, true);
    this.drawLightRowCol(249, 612, this.pdp.MB, 18, true);
    this.drawLightRowCol(249, 770, this.pdp.AC, 18, true);
    this.drawLightRowCol(249, 928, this.pdp.IO, 18, true);
    this.drawLightRowCol(
      2301,
      651,
      this.boolArrayToNumber(this.pdp.senseSwitches),
      6,
      true
    );
    this.drawLightRowCol(
      2301,
      967,
      this.boolArrayToNumber(this.pdp.programFlags),
      6,
      true
    );
    this.drawLightRowCol(2301, 1203, this.pdp.IR, 5, true);
    this.drawLightRowCol(1840, 296, this.statusColAsNumber(), 13, false);
    this.drawLightRowCol(2301, 296, this.powerAndStepAsNumber(), 3, false);

    // switches
    this.drawSwitch(249, 1086, false, false, false);
    this.addressSwitches = this.drawSwitchRow(
      407,
      1086,
      this.pdp.selectedAddress,
      16,
      false
    );
    this.addressSwitches = this.addressSwitches.slice(4);
    this.testWordSwitches = this.drawSwitchRow(
      249,
      1244,
      this.pdp.testWord,
      18,
      false
    );
    this.drawSwitch(2422, 296, true, true, false);
    this.drawSwitch(2422, 375, false, true, false);
    this.singleStepSwitch = this.drawSwitch(
      2422,
      454,
      this.singleStep,
      true,
      false
    );
    this.senseSwitches = this.drawSwitchRow(
      2301,
      770,
      this.boolArrayToNumber(this.pdp.senseSwitches),
      6,
      false
    );
    this.bottomSwitches = this.drawSwitchRow(
      328,
      1648,
      this.boolArrayToNumber(this.bottomSwitchStates) << 1,
      6,
      true
    );
    this.bottomSwitches.pop();
    this.drawSwitchRow(2216, 1648, 0o0, 2, true);
  }

  drawSwitchRow(
    x: number,
    y: number,
    value: number,
    size: number,
    large: boolean
  ): number[][] {
    const positions: number[][] = [];
    const separation = large ? SEPARATION * 3 : SEPARATION;
    for (let index = 0; index < size; index++) {
      positions.push(
        this.drawSwitch(
          x + index * separation,
          y,
          !!((value >> (size - index - 1)) & 1),
          false,
          large
        )
      );
    }
    return positions;
  }

  drawLightRowCol(
    x: number,
    y: number,
    value: number,
    size: number,
    row: boolean
  ): void {
    for (let index = 0; index < size; index++) {
      this.drawLight(
        row ? x + index * SEPARATION : x,
        row ? y : y + index * SEPARATION,
        !!((value >> (size - index - 1)) & 1)
      );
    }
  }

  drawLight(x: number, y: number, isOn: boolean): void {
    this.context.fillStyle = isOn ? '#ffc400' : '#c1c2a1';
    this.context.beginPath();
    this.context.arc(x, y, LIGHT_RADIUS, 0, 2 * Math.PI);
    this.context.fill();
    this.context.stroke();
  }

  drawSwitch(
    x: number,
    y: number,
    isUp: boolean,
    rotate: boolean,
    large: boolean
  ): number[] {
    let rotation = 0;
    rotation += !isUp ? Math.PI : 0;
    rotation -= rotate ? Math.PI / 2 : 0;
    const offset = large ? -80 : -70;
    const size = large ? 160 : 140;
    const image = large ? this.largeSwitchImage : this.switchImage;
    this.context.save();
    this.context.setTransform(1, 0, 0, 1, x, y);
    this.context.rotate(rotation);
    this.context.drawImage(image, offset, offset, size, size);
    this.context.restore();
    return [x, y];
  }

  statusColAsNumber(): number {
    let status = 0;
    status |= helper.boolToBit(!this.pdp.halt) << 12;
    status |= helper.boolToBit(this.pdp.overflow) << 6;
    return status;
  }

  powerAndStepAsNumber(): number {
    return this.singleStep ? 0b101 : 0b100;
  }

  boolArrayToNumber(boolArray: boolean[]): number {
    let value = 0;
    for (let index = 0; index < boolArray.length; index++) {
      value |= boolArray[index] ? 1 << (boolArray.length - index - 1) : 0;
    }
    return value;
  }

  inSwitchRange(x: number, y: number, switchPosition: number[]): boolean {
    return (
      x <= switchPosition[0] + 30 &&
      x >= switchPosition[0] - 30 &&
      y <= switchPosition[1] + 30 &&
      y >= switchPosition[1] - 30
    );
  }

  inLargeSwitchRange(x: number, y: number, switchPosition: number[]): boolean {
    return (
      x <= switchPosition[0] + 40 &&
      x >= switchPosition[0] - 40 &&
      y <= switchPosition[1] + 40 &&
      y >= switchPosition[1] - 40
    );
  }
}
