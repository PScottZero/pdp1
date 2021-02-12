import { EventEmitter, Injectable } from '@angular/core';
import * as instruction from './instructions';
import * as helper from './helperFunctions';
import * as mask from './masks';
import { CLF_RANGE, STF_RANGE } from './instructions';
import { DisplayService } from './display.service';
import { TapeConfig } from '../components/tape-list/tape-config';

const MEM_SIZE = 0o10000;
const NEG_ZERO = 0o777777;
const AC_SAVE_ADDR = 0o100;
const SENSE_SWITCH_COUNT = 6;
const PROGRAM_FLAG_COUNT = 6;
const CYCLE_COUNT = 1667;

@Injectable({
  providedIn: 'root',
})
export class PDPService {
  mem: number[]; // 4096 18-bit words
  PC: number; // Program Counter (12-bit)
  AC: number; // Accumulator (18-bit)
  IO: number; // In-Out Register (18-bit)
  MB: number; // Memory Buffer (18-bit)
  IR: number; // Instruction Register (5-bit)
  selectedAddress: number;
  testWord: number;
  overflow: boolean;
  halt: boolean;
  senseSwitches: boolean[];
  programFlags: boolean[];
  tapeBytes: Uint8Array;
  tapeIndex: number;
  controller: number;
  hardwareMultiply: boolean;
  skipped: boolean;
  jumped: boolean;
  updateEmitter: EventEmitter<void>;

  enableCustomStartAddr: boolean;
  customStartAddr: number;
  expectedStartAddr: number;

  constructor(private display: DisplayService) {
    this.updateEmitter = new EventEmitter<void>();
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
    this.expectedStartAddr = 0;
    this.load('snowflake_sa-100.bin');
  }

  stepRun(): void {
    for (let _ = 0; _ < CYCLE_COUNT; _++) {
      if (!this.halt) {
        if (this.enableCustomStartAddr && this.PC == this.expectedStartAddr) {
          this.PC = this.customStartAddr;
        }
        this.decode();
      }
    }
    this.MB = this.mem[this.PC];
    this.IR = (this.MB >> 13) & mask.MASK_5;
    this.updateEmitter.emit();
    if (!this.halt) {
      requestAnimationFrame(() => this.stepRun());
    }
  }

  step(): void {
    this.decode();
    this.MB = this.mem[this.PC];
    this.IR = (this.MB >> 13) & mask.MASK_5;
    this.updateEmitter.emit();
  }

  start(): void {
    this.halt = false;
    this.PC = this.selectedAddress;
    requestAnimationFrame(() => this.stepRun());
  }

  stop(): void {
    this.halt = true;
  }

  continue(): void {
    this.halt = false;
    requestAnimationFrame(() => this.stepRun());
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
        this.incY(Y, indirect);
        this.incPC();
        break;

      // Index and Skip if Positive
      // isp Y
      case instruction.ISP:
        this.incY(Y, indirect);
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
            word = this.read(Y, false);
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
            this.setIO(this.shiftLeft(this.IO, helper.onesCount(word)));
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
        if ((Y & instruction.SZA) != 0) {
          shouldSkip ||= helper.cond(this.AC == 0, indirect);
        }

        // Skip on Plus Accumulator
        // spa
        if ((Y & instruction.SPA) != 0) {
          shouldSkip ||= helper.cond(helper.isPositive(this.AC), indirect);
        }

        // Skip on Minus Accumulator
        // sma
        if ((Y & instruction.SMA) != 0) {
          shouldSkip ||= helper.cond(!helper.isPositive(this.AC), indirect);
        }

        // Skip on ZERO Overflow
        // szo
        if ((Y & instruction.SZO) != 0) {
          shouldSkip ||= helper.cond(!this.overflow, indirect);
          this.overflow = false;
        }

        // Skip on Plus In-Out Register
        // spi
        if ((Y & instruction.SPI) != 0) {
          shouldSkip ||= helper.cond(helper.isPositive(this.IO), indirect);
        }

        if (instruction.SZS_RANGE.includes(Y & mask.SZS_MASK)) {
          // Skip on ZERO Switch
          // szs
          shouldSkip ||= this.senseSwitchSkip(Y, indirect);
        } else if (instruction.SZF_RANGE.includes(Y & mask.MASK_3)) {
          // Skip on ZERO Program Flag
          // szf
          shouldSkip ||= this.programFlagSkip(Y, indirect);
        }

        if (shouldSkip) {
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
        // CLA
        if ((Y & instruction.CLA) != 0) {
          this.setAC(0);
        }

        // Clear In-Out Register
        // CLI
        if ((Y & instruction.CLI) != 0) {
          this.setIO(0);
        }

        // Load Accumulator with Program Counter
        // LAP
        if ((Y & instruction.LAP) != 0) {
          this.AC |= this.PC;
          this.AC |= helper.boolToBit(this.overflow) << 17;
        }

        // Load Accumulator from Test Word
        // LAT
        if ((Y & instruction.LAT) != 0) {
          this.AC |= this.testWord;
        }

        // Complement Accumulator
        // CMA
        if ((Y & instruction.CMA) != 0) {
          this.setAC(~this.AC);
        }

        if (CLF_RANGE.includes(Y & mask.MASK_4)) {
          // Clear Selected Program Flag
          // clf
          this.clearProgramFlag(Y);
        } else if (STF_RANGE.includes(Y & mask.MASK_4)) {
          // Set Selected Program Flag
          // stf
          this.setProgramFlag(Y);
        }
        this.incPC();
        break;

      case instruction.IOT:
        switch (Y & mask.MASK_6) {
          case instruction.IO_WAIT:
            break;

          case instruction.SW_CONTROLLER:
            this.IO = this.controller;
            break;

          case instruction.DPY:
            this.display.setPixel(this.AC, this.IO);
            break;

          // Read Perforated Tape, Binary
          // rpb
          case instruction.RPB:
            this.setIO(this.readWord());
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
    let result = this.AC + value;
    result += (result >> 18) & mask.MASK_1;
    this.overflow =
      (helper.isPositive(this.AC) &&
        helper.isPositive(value) &&
        !helper.isPositive(result)) ||
      (!helper.isPositive(this.AC) &&
        !helper.isPositive(value) &&
        helper.isPositive(result));
    this.setAC(result);
    if (this.AC == NEG_ZERO) {
      this.AC = 0;
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
      if (this.IO & 1) {
        this.add(value);
      }
      this.rotateACIORight(1);
      this.AC &= mask.MASK_17;
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
      this.rotateACIOLeft(1);
      this.IO = (this.IO & 0o777776) | (~helper.sign(this.AC) & mask.MASK_1);
      if (this.IO & 1) {
        this.subtract(value);
      } else {
        this.add(value + 1);
      }
      if (this.AC == NEG_ZERO) {
        this.AC = 0;
      }
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

  incY(Y: number, indirect: boolean): void {
    this.setAC(this.read(Y, indirect) + 1);
    if (this.AC == NEG_ZERO) {
      this.setAC(0);
    }
    this.write(Y, this.AC, indirect);
  }

  programFlagSkip(Y: number, indirect: boolean): boolean {
    if (Y <= 6) {
      return helper.cond(!this.programFlags[Y], indirect);
    } else {
      let allFlags = false;
      this.programFlags.forEach((flagValue) => (allFlags ||= flagValue));
      return helper.cond(!allFlags, indirect);
    }
  }

  senseSwitchSkip(Y: number, indirect: boolean): boolean {
    const switchIndex = (Y >> 3) & mask.MASK_1;
    if (switchIndex <= 6) {
      return helper.cond(!this.senseSwitches[switchIndex], indirect);
    } else {
      let allSwitches = false;
      this.senseSwitches.forEach(
        (switchValue) => (allSwitches ||= switchValue)
      );
      return helper.cond(!allSwitches, indirect);
    }
  }

  setProgramFlag(Y: number): void {
    const switchIndex = Y & mask.MASK_3;
    if (switchIndex <= 6) {
      this.programFlags[switchIndex] = true;
    } else {
      for (let index = 0; index < this.programFlags.length; index++) {
        this.programFlags[index] = true;
      }
    }
  }

  clearProgramFlag(Y: number): void {
    if (Y <= 6) {
      this.programFlags[Y] = false;
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

  load(tapeName: string): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `assets/tapes/${tapeName}`, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      this.tapeIndex = 0;
      this.tapeBytes = new Uint8Array(xhr.response);
      while (this.tapeIndex < this.tapeBytes.length) {
        if ((this.tapeBytes[this.tapeIndex] & 0x80) != 0) {
          const instruction = this.readWord();
          if ((instruction & 0o770000) == 0o320000) {
            this.mem[instruction & 0o7777] = this.readWord();
          } else if ((instruction & 0o770000) == 0o600000) {
            this.setPC(instruction & 0o7777);
            break;
          }
        } else {
          this.tapeIndex++;
        }
      }
      this.continue();
    };
    xhr.send();
  }

  readWord(): number {
    let word = 0;
    let count = 0;
    while (count < 3 && this.tapeIndex < this.tapeBytes.length) {
      if ((this.tapeBytes[this.tapeIndex] & 0x80) != 0) {
        word = (word << 6) | (this.tapeBytes[this.tapeIndex++] & 0o77);
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
    this.hardwareMultiply = tapeConfig.hardwareMultiply;
    this.testWord = tapeConfig.testWord != undefined ? tapeConfig.testWord : 0;
    this.enableCustomStartAddr =
      tapeConfig.alternateAddress != undefined ? true : false;
    this.expectedStartAddr =
      tapeConfig.startAddress != undefined ? tapeConfig.startAddress : 0;
    this.customStartAddr =
      tapeConfig.alternateAddress != undefined
        ? tapeConfig.alternateAddress
        : 0;
    this.halt = true;
    this.load(tapeConfig.fileName);
  }
}
