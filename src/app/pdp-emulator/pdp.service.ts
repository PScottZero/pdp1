import { EventEmitter, Injectable } from '@angular/core';
import * as instruction from './instructions';
import * as helper from './helperFunctions';
import * as mask from './masks';
import { TapeConfig } from '../components/tape-list/tape-config';

const MEM_SIZE = 0o10000;
const NEG_ZERO = 0o777777;
const AC_SAVE_ADDR = 0o100;
const SENSE_SWITCH_COUNT = 6;
const PROGRAM_FLAG_COUNT = 6;
const CYCLE_COUNT = 1667;
export const DISPLAY_SIZE = 1023;

@Injectable({
  providedIn: 'root',
})
export class PDPService {
  mem: number[];
  PC: number;
  AC: number;
  IO: number;
  MB: number;
  IR: number;
  selectedAddress: number;
  testWord: number;
  overflow: boolean;
  halt: boolean;
  senseSwitches: boolean[];
  programFlags: boolean[];
  tapeName: string;
  tapeBytes: Uint8Array;
  tapeIndex: number;
  controller: number;
  hardwareMultiply: boolean;
  skipped: boolean;
  jumped: boolean;
  enableCustomStartAddr: boolean;
  customStartAddr: number;
  displayData: number[];
  consoleEmitter: EventEmitter<void>;
  displayEmitter: EventEmitter<void>;

  constructor() {
    this.consoleEmitter = new EventEmitter<void>();
    this.displayEmitter = new EventEmitter<void>();
    this.displayData = Array<number>(DISPLAY_SIZE * DISPLAY_SIZE).fill(0);
    this.reset();
    this.loadTape('snowflake_sa-100.bin');
    this.displayLoop();
  }

  step(): void {
    this.decode();
    this.MB = this.mem[this.PC];
    this.IR = (this.MB >> 13) & mask.MASK_5;
    this.consoleEmitter.emit();
  }

  start(): void {
    this.halt = false;
    this.PC = this.selectedAddress;
    requestAnimationFrame(() => this.emulationLoop());
  }

  stop(): void {
    this.halt = true;
  }

  continue(): void {
    this.halt = false;
    requestAnimationFrame(() => this.emulationLoop());
  }

  emulationLoop(): void {
    for (let _ = 0; _ < CYCLE_COUNT; _++) {
      if (!this.halt) {
        if (this.enableCustomStartAddr && this.PC == 0o10) {
          this.PC = this.customStartAddr;
          this.enableCustomStartAddr = false;
        }
        this.decode();
      }
    }
    this.MB = this.mem[this.PC];
    this.IR = (this.MB >> 13) & mask.MASK_5;
    this.consoleEmitter.emit();
    if (!this.halt) {
      requestAnimationFrame(() => this.emulationLoop());
    }
  }

  displayLoop(): void {
    this.displayEmitter.emit();
    requestAnimationFrame(() => this.displayLoop());
  }

  reset(): void {
    this.mem = Array<number>(MEM_SIZE).fill(0);
    this.PC = 0;
    this.AC = 0;
    this.IO = 0;
    this.MB = 0;
    this.IR = 0;
    this.selectedAddress = 0;
    this.testWord = 0;
    this.overflow = false;
    this.halt = true;
    this.senseSwitches = Array<boolean>(SENSE_SWITCH_COUNT).fill(false);
    this.programFlags = Array<boolean>(PROGRAM_FLAG_COUNT).fill(false);
    this.controller = 0;
    this.skipped = false;
    this.jumped = false;
    this.hardwareMultiply = true;
    this.enableCustomStartAddr = false;
    this.customStartAddr = 0;
  }

  decode(): void {
    let word = this.mem[this.PC];
    const opcode = (word >> 12) & mask.MASK_OPCODE;
    const shiftOpcode = (word >> 9) & mask.MASK_9;
    const indirect = ((word >> 12) & mask.MASK_1) != 0;
    const Y = word & mask.MASK_12;
    const currPC = this.PC;
    let shouldSkip = false;

    switch (opcode) {
      // Add
      // add Y
      case instruction.ADD:
        this.add(this.read(Y, indirect));
        this.incPC();
        break;

      // Subtract
      // sub Y
      case instruction.SUB:
        this.subtract(this.read(Y, indirect));
        this.incPC();
        break;

      // Multiply
      // mul Y
      case instruction.MUL:
        this.multiply(this.read(Y, indirect));
        this.incPC();
        break;

      // Divide
      // div Y
      case instruction.DIV:
        this.skipped = true;
        this.divide(this.read(Y, indirect));
        this.incPC();
        break;

      // Index
      // idx Y
      case instruction.IDX:
        this.index(Y, indirect);
        this.incPC();
        break;

      // Index and Skip if Positive
      // isp Y
      case instruction.ISP:
        this.index(Y, indirect);
        if (helper.isPositive(this.AC)) {
          this.skipped = true;
          this.incPC();
        }
        this.incPC();
        break;

      // Logical AND
      // and Y
      case instruction.AND:
        this.setAC(this.AC & this.read(Y, indirect));
        this.incPC();
        break;

      // Exclusive OR
      // xor Y
      case instruction.XOR:
        this.setAC(this.AC ^ this.read(Y, indirect));
        this.incPC();
        break;

      // Inclusive OR
      // ior Y
      case instruction.IOR:
        this.setAC(this.AC | this.read(Y, indirect));
        this.incPC();
        break;

      // Load Accumulator
      // lac Y
      case instruction.LAC:
        this.setAC(this.read(Y, indirect));
        this.incPC();
        break;

      // Deposit Accumulator
      // dac Y
      case instruction.DAC:
        this.write(Y, this.AC, indirect);
        this.incPC();
        break;

      // Deposit Address Part
      // dap Y
      case instruction.DAP:
        this.writeAddr(Y, this.AC, indirect);
        this.incPC();
        break;

      // Deposit Instruction Part
      // dip Y
      case instruction.DIP:
        this.writeInstr(Y, this.AC, indirect);
        this.incPC();
        break;

      // Load In-Out Register
      // lio Y
      case instruction.LIO:
        this.setIO(this.read(Y, indirect));
        this.incPC();
        break;

      // Deposit In-Out Register
      // dio Y
      case instruction.DIO:
        this.write(Y, this.IO, indirect);
        this.incPC();
        break;

      // Deposit Zero in Memory
      // dzm Y
      case instruction.DZM:
        this.write(Y, 0, indirect);
        this.incPC();
        break;

      // Execute
      // xct Y
      case instruction.XCT:
        this.jumped = false;
        this.skipped = false;
        do {
          if ((word & 0o10000) == 0) {
            this.setPC(word & mask.MASK_12);
          } else {
            word = this.read(word & mask.MASK_12, false);
          }
        } while ((word & 0o10000) != 0);
        this.decode();
        if (!this.jumped) {
          this.setPC(currPC);
          if (this.skipped) {
            this.incPC();
          }
          this.incPC();
        }
        break;

      // Jump
      // jmp Y
      case instruction.JMP:
        this.jump(Y, indirect);
        break;

      // Jump and Save Program Counter
      // jsp Y
      case instruction.JSP:
        this.incPC();
        this.setAC(this.PC | (helper.boolToBit(this.overflow) << 17));
        this.jump(Y, indirect);
        break;

      // Call Subroutine
      // cal Y
      //
      // Jump and Deposit Accumulator
      // jda Y
      case instruction.CAL_JDA:
        this.jumped = true;
        this.write(indirect ? Y : AC_SAVE_ADDR, this.AC, false);
        this.incPC();
        this.setAC(this.PC | (helper.boolToBit(this.overflow) << 17));
        this.setPC(indirect ? Y + 1 : AC_SAVE_ADDR + 1);
        break;

      // Skip if Accumulator and Y differ
      // sad Y
      case instruction.SAD:
        if (this.read(Y, indirect) != this.AC) {
          this.skipped = true;
          this.incPC();
        }
        this.incPC();
        break;

      // Skip if Accumulator and Y are the same
      // sas Y
      case instruction.SAS:
        if (this.read(Y, indirect) == this.AC) {
          this.skipped = true;
          this.incPC();
        }
        this.incPC();
        break;

      // Load Accumulator with N
      // law N
      case instruction.LAW:
        this.setAC(Y);
        if (indirect) {
          this.setAC(~this.AC);
        }
        this.incPC();
        break;

      // Shift Group
      // sft
      case instruction.SHIFT_GROUP:
        switch (shiftOpcode) {
          // Rotate Accumulator Right
          // rar N
          case instruction.RAR:
            this.setAC(this.rotateRight(this.AC, helper.onesCount(word)));
            break;

          // Rotate Accumulator Left
          // ral N
          case instruction.RAL:
            this.setAC(this.rotateLeft(this.AC, helper.onesCount(word)));
            break;

          // Shift Accumulator Right
          // sar N
          case instruction.SAR:
            this.setAC(this.shiftRight(this.AC, helper.onesCount(word)));
            break;

          // Shift Accumulator Left
          // sal N
          case instruction.SAL:
            this.setAC(this.shiftLeft(this.AC, helper.onesCount(word)));
            break;

          // Rotate In-Out Register Right
          // rir N
          case instruction.RIR:
            this.setIO(this.rotateRight(this.IO, helper.onesCount(word)));
            break;

          // Rotate In-Out Register Left
          // ril N
          case instruction.RIL:
            this.setIO(this.rotateLeft(this.IO, helper.onesCount(word)));
            break;

          // Shift In-Out Register Right
          // sir N
          case instruction.SIR:
            this.setIO(this.shiftRight(this.IO, helper.onesCount(word)));
            break;

          // Shift In-Out Register Left
          // sil N
          case instruction.SIL:
            this.setIO(this.shiftLeft(this.IO, helper.onesCount(word)));
            break;

          // Rotate AC and IO Right
          // rcr N
          case instruction.RCR:
            this.rotateACIORight(helper.onesCount(word));
            break;

          // Rotate AC and IO Left
          // rcl N
          case instruction.RCL:
            this.rotateACIOLeft(helper.onesCount(word));
            break;

          // Shift AC and IO Right
          // scr N
          case instruction.SCR:
            this.shiftACIORight(helper.onesCount(word));
            break;

          // Shift AC and IO Left
          // scl N
          case instruction.SCL:
            this.shiftACIOLeft(helper.onesCount(word));
            break;

          default:
            console.log(`Instruction Not Implemented: ${word.toString(8)}`);
            break;
        }
        this.incPC();
        break;

      // Skip Group
      // skp
      case instruction.SKIP_GROUP:
        shouldSkip = false;

        // Skip on ZERO Accumulator
        // sza
        if (Y & instruction.SZA) {
          shouldSkip ||= this.AC == 0;
        }

        // Skip on Plus Accumulator
        // spa
        if (Y & instruction.SPA) {
          shouldSkip ||= helper.isPositive(this.AC);
        }

        // Skip on Minus Accumulator
        // sma
        if (Y & instruction.SMA) {
          shouldSkip ||= !helper.isPositive(this.AC);
        }

        // Skip on ZERO Overflow
        // szo
        if (Y & instruction.SZO) {
          shouldSkip ||= !this.overflow;
          this.overflow = false;
        }

        // Skip on Plus In-Out Register
        // spi
        if (Y & instruction.SPI) {
          shouldSkip ||= helper.isPositive(this.IO);
        }

        if (instruction.SZS_RANGE.includes(Y & mask.SZS_MASK)) {
          // Skip on ZERO Switch
          // szs
          shouldSkip ||= this.senseSwitchSkip(Y);
        }

        if (instruction.SZF_RANGE.includes(Y & mask.MASK_3)) {
          // Skip on ZERO Program Flag
          // szf
          shouldSkip ||= this.programFlagSkip(Y);
        }

        if ((shouldSkip && !indirect) || (!shouldSkip && indirect)) {
          this.skipped = true;
          this.incPC();
        }
        this.incPC();
        break;

      // Operate Group
      // opr
      case instruction.OPERATE_GROUP:
        // Halt
        // hlt
        if (Y == instruction.HLT) {
          this.halt = true;
        }

        // Clear Accumulator
        // cla
        if (Y & instruction.CLA) {
          this.setAC(0);
        }

        // Clear In-Out Register
        // cli
        if (Y & instruction.CLI) {
          this.setIO(0);
        }

        // Load Accumulator with Program Counter
        // lap
        if (Y & instruction.LAP) {
          this.AC |= this.PC;
          this.AC |= helper.boolToBit(this.overflow) << 17;
        }

        // Load Accumulator from Test Word
        // lat
        if (Y & instruction.LAT) {
          this.AC |= this.testWord;
        }

        // Complement Accumulator
        // cma
        if (Y & instruction.CMA) {
          this.setAC(~this.AC);
        }

        if (instruction.CLF_STF_RANGE.includes(Y & mask.MASK_3)) {
          if (Y & 0o10) {
            // Set Selected Program Flag
            // stf
            this.setProgramFlag(Y);
          } else {
            // Clear Selected Program Flag
            // clf
            this.clearProgramFlag(Y);
          }
        }
        this.incPC();
        break;

      case instruction.IOT:
        switch (Y & mask.MASK_6) {
          // I/O Wait
          // ioh (iot i)
          case instruction.IO_WAIT:
            break;

          // Spacewar Controller
          // iot 11
          case instruction.SW_CONTROLLER:
            this.IO = this.controller;
            break;

          // Display One Point
          // dpy
          case instruction.DPY:
            this.displayPoint();
            break;

          // Read Perforated Tape, Binary
          // rpb
          case instruction.RPB:
            this.setIO(this.readTapeWord());
            break;

          default:
            console.log(`Instruction Not Implemented: ${word.toString(8)}`);
            break;
        }
        this.incPC();
        break;

      default:
        console.log(`Instruction Not Implemented: ${word.toString(8)}`);
        this.incPC();
        break;
    }
  }

  read(addr: number, indirect: boolean): number {
    if (indirect) {
      const word = this.read(addr, false);
      const newAddr = word & mask.MASK_12;
      const indirectAgain = ((word >> 12) & mask.MASK_1) != 0;
      return this.read(newAddr, indirectAgain);
    } else {
      return this.mem[addr & mask.MASK_12] & mask.MASK_18;
    }
  }

  write(addr: number, value: number, indirect: boolean): void {
    if (indirect) {
      const word = this.read(addr, false);
      const newAddr = word & mask.MASK_12;
      const indirectAgain = ((word >> 12) & mask.MASK_1) != 0;
      this.write(newAddr, value, indirectAgain);
    } else {
      this.mem[addr & mask.MASK_12] = value & mask.MASK_18;
    }
  }

  writeInstr(addr: number, value: number, indirect: boolean): void {
    if (indirect) {
      const word = this.read(addr, false);
      const newAddr = word & mask.MASK_12;
      const indirectAgain = ((word >> 12) & mask.MASK_1) != 0;
      this.writeInstr(newAddr, value, indirectAgain);
    } else {
      this.mem[addr & mask.MASK_12] &= mask.CLR_INSTR;
      this.mem[addr & mask.MASK_12] |= value & mask.INSTR_MASK;
    }
  }

  writeAddr(addr: number, value: number, indirect: boolean): void {
    if (indirect) {
      const word = this.read(addr, false);
      const newAddr = word & mask.MASK_12;
      const indirectAgain = ((word >> 12) & mask.MASK_1) != 0;
      this.writeAddr(newAddr, value, indirectAgain);
    } else {
      this.mem[addr & mask.MASK_12] &= mask.CLR_Y;
      this.mem[addr & mask.MASK_12] |= value & mask.MASK_12;
    }
  }

  jump(addr: number, indirect: boolean): void {
    this.jumped = true;
    if (indirect) {
      const word = this.read(addr, false);
      const newAddr = word & mask.MASK_12;
      const indirectAgain = ((word >> 12) & mask.MASK_1) != 0;
      this.jump(newAddr, indirectAgain);
    } else {
      this.setPC(addr);
    }
  }

  add(value: number): void {
    const oldAC = this.AC;
    let result = this.AC + value;
    result += (result >> 18) & mask.MASK_1;
    this.setAC(result);
    if (this.AC == NEG_ZERO) {
      this.AC = 0;
    }
    if (helper.overflow(oldAC, value, this.AC)) {
      this.overflow = true;
    }
  }

  subtract(value: number): void {
    this.add(~value & mask.MASK_18);
  }

  multiply(value: number): void {
    if (this.hardwareMultiply) {
      const sign = helper.sign(this.AC) ^ helper.sign(value);
      const magnitude = helper.abs(this.AC) * helper.abs(value);
      this.setAC(helper.rightShift(magnitude, 17));
      this.setIO((magnitude << 1) & mask.MASK_18);
      if (sign) {
        this.setAC(~this.AC);
        this.setIO(~this.IO);
      }
      if (this.AC == NEG_ZERO && this.IO == NEG_ZERO) {
        this.setAC(0);
        this.setIO(0);
      }
    } else {
      const overflow = this.overflow;
      if (this.IO & mask.MASK_1) {
        this.add(value);
      }
      this.rotateACIORight(1);
      this.AC &= mask.MASK_17;
      this.overflow = overflow;
    }
  }

  divide(value: number): void {
    if (this.hardwareMultiply) {
      if (helper.abs(this.AC) < helper.abs(value)) {
        if (helper.sign(this.AC)) {
          this.setAC(~this.AC);
          this.setIO(~this.IO);
        }
        const dividend =
          helper.leftShift(this.AC & mask.MASK_17, 17) |
          ((this.IO >> 1) & mask.MASK_17);
        let magnitude = Math.floor(dividend / helper.abs(value));
        let remainder = dividend % helper.abs(value);
        const sign = helper.sign(this.AC) ^ helper.sign(value);
        if (sign) {
          magnitude = ~magnitude;
        }
        if (helper.sign(this.AC)) {
          remainder = ~remainder;
        }
        this.setAC(magnitude);
        this.setIO(remainder);
        if (this.AC == NEG_ZERO) {
          this.setAC(0);
        }
        if (this.IO == NEG_ZERO) {
          this.setIO(0);
        }
        this.incPC();
      } else {
        this.overflow = true;
      }
    } else {
      const overflow = this.overflow;
      this.rotateACIOLeft(1);
      this.IO ^= mask.MASK_1;
      if (this.IO & mask.MASK_1) {
        this.subtract(value);
      } else {
        this.add(value + 1);
      }
      if (this.AC == NEG_ZERO) {
        this.AC = 0;
      }
      this.overflow = overflow;
    }
  }

  rotateRight(value: number, count: number): number {
    for (let _ = 0; _ < count; _++) {
      const bit0 = value & mask.MASK_1;
      value = (bit0 << 17) | ((value >> 1) & mask.MASK_17);
    }
    return value;
  }

  rotateACIORight(count: number): void {
    for (let _ = 0; _ < count; _++) {
      const AC0 = this.AC & mask.MASK_1;
      const IO0 = this.IO & mask.MASK_1;
      this.setAC((IO0 << 17) | ((this.AC >> 1) & mask.MASK_17));
      this.setIO((AC0 << 17) | ((this.IO >> 1) & mask.MASK_17));
    }
  }

  rotateLeft(value: number, count: number): number {
    for (let _ = 0; _ < count; _++) {
      const bit7 = (value >> 17) & mask.MASK_1;
      value = ((value << 1) & mask.MASK_18) | bit7;
    }
    return value;
  }

  rotateACIOLeft(count: number): void {
    for (let _ = 0; _ < count; _++) {
      const AC7 = (this.AC >> 17) & mask.MASK_1;
      const IO7 = (this.IO >> 17) & mask.MASK_1;
      this.setAC(((this.AC << 1) & mask.MASK_18) | IO7);
      this.setIO(((this.IO << 1) & mask.MASK_18) | AC7);
    }
  }

  shiftRight(value: number, count: number): number {
    for (let _ = 0; _ < count; _++) {
      const sign = helper.sign(value);
      value = (sign << 17) | ((value >> 1) & mask.MASK_17);
    }
    return value;
  }

  shiftACIORight(count: number): void {
    for (let _ = 0; _ < count; _++) {
      const sign = helper.sign(this.AC);
      const AC0 = this.AC & mask.MASK_1;
      this.setAC((sign << 17) | ((this.AC >> 1) & mask.MASK_17));
      this.setIO((AC0 << 17) | ((this.IO >> 1) & mask.MASK_17));
    }
  }

  shiftLeft(value: number, count: number): number {
    return (value << count) & mask.MASK_18;
  }

  shiftACIOLeft(count: number): void {
    for (let _ = 0; _ < count; _++) {
      const IO7 = (this.IO >> 17) & mask.MASK_1;
      this.setAC(((this.AC << 1) & mask.MASK_18) | IO7);
      this.setIO((this.IO << 1) & mask.MASK_18);
    }
  }

  index(Y: number, indirect: boolean): void {
    this.setAC(this.read(Y, indirect) + 1);
    if (this.AC == NEG_ZERO) {
      this.setAC(0);
    }
    this.write(Y, this.AC, indirect);
  }

  programFlagSkip(Y: number): boolean {
    Y &= mask.MASK_3;
    if (Y <= 6) {
      return !this.programFlags[Y - 1];
    } else {
      let allFlags = false;
      this.programFlags.forEach((flagValue) => (allFlags ||= flagValue));
      return !allFlags;
    }
  }

  senseSwitchSkip(Y: number): boolean {
    Y = (Y >> 3) & mask.MASK_3;
    if (Y <= 6) {
      return !this.senseSwitches[Y - 1];
    } else {
      let allSwitches = false;
      this.senseSwitches.forEach(
        (switchValue) => (allSwitches ||= switchValue)
      );
      return !allSwitches;
    }
  }

  setProgramFlag(Y: number): void {
    Y &= mask.MASK_3;
    if (Y <= 6) {
      this.programFlags[Y - 1] = true;
    } else {
      for (let index = 0; index < this.programFlags.length; index++) {
        this.programFlags[index] = true;
      }
    }
  }

  clearProgramFlag(Y: number): void {
    Y &= mask.MASK_3;
    if (Y <= 6) {
      this.programFlags[Y - 1] = false;
    } else {
      for (let index = 0; index < this.programFlags.length; index++) {
        this.programFlags[index] = false;
      }
    }
  }

  setAC(value: number): void {
    this.AC = value & mask.MASK_18;
  }

  setIO(value: number): void {
    this.IO = value & mask.MASK_18;
  }

  setPC(value: number): void {
    this.PC = value & mask.MASK_12;
  }

  incPC(): void {
    this.setPC(this.PC + 1);
  }

  displayPoint(): void {
    let x = (this.AC >> 8) & mask.MASK_10;
    let y = (this.IO >> 8) & mask.MASK_10;

    if (((x >> 9) & mask.MASK_1) == 1) {
      x = 511 - (~x & mask.MASK_9);
    } else {
      x += 511;
    }
    if (((y >> 9) & mask.MASK_1) == 1) {
      y = 511 + (~y & mask.MASK_9);
    } else {
      y = 511 - y;
    }
    this.displayData[y * DISPLAY_SIZE + x] = 1;
  }

  loadTape(tapeName: string): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `assets/tapes/${tapeName}`, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => this.parseTape(xhr.response);
    xhr.send();
  }

  parseTape(buffer: ArrayBuffer): void {
    this.tapeIndex = 0;
    this.tapeBytes = new Uint8Array(buffer);
    while (this.tapeIndex < this.tapeBytes.length) {
      if ((this.tapeBytes[this.tapeIndex] & 0x80) != 0) {
        const instr = this.readTapeWord();
        if ((instr & mask.INSTR_MASK) == instruction.TAPE_STORE) {
          this.mem[instr & mask.MASK_12] = this.readTapeWord();
        } else if ((instr & mask.INSTR_MASK) == instruction.TAPE_JUMP) {
          this.setPC(instr & mask.MASK_12);
          break;
        }
      } else {
        this.tapeIndex++;
      }
    }
    this.continue();
  }

  readTapeWord(): number {
    let word = 0;
    let count = 0;
    while (count < 3 && this.tapeIndex < this.tapeBytes.length) {
      if ((this.tapeBytes[this.tapeIndex] & mask.TAPE_MASK) != 0) {
        word = (word << 6) | (this.tapeBytes[this.tapeIndex++] & mask.MASK_6);
        count++;
      } else {
        this.tapeIndex++;
      }
    }
    if (this.tapeIndex >= this.tapeBytes.length) {
      this.halt = true;
    }
    return word;
  }

  loadTapeConfig(tapeConfig: TapeConfig): void {
    this.reset();
    this.tapeName = tapeConfig.name;
    this.hardwareMultiply = tapeConfig.hardwareMultiply;
    this.testWord = tapeConfig.testWord;
    this.enableCustomStartAddr = tapeConfig.startAddress != -1;
    this.customStartAddr = tapeConfig.startAddress;
    this.loadTape(tapeConfig.fileName);
  }
}
