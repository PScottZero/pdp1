import { EventEmitter, Injectable } from '@angular/core';
import * as instruction from './instructions';
import * as helper from './helperFunctions';
import * as mask from './masks';
import { CLF_RANGE, STF_RANGE } from './instructions';
import { SPACEWAR } from './spacewar';
import { DisplayService } from './display.service';

const MEM_SIZE = 0o10000;
const NEG_ZERO = 0o777777;
const AC_SAVE_ADDR = 0o100;
const SUB_ADDR = 0o101;
const SENSE_SWITCH_COUNT = 6;
const PROGRAM_FLAG_COUNT = 6;

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
  showDisplay: boolean;
  updateEmitter: EventEmitter<void>;
  runProcess: NodeJS.Timeout;

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
    this.showDisplay = false;
    this.load();
  }

  step(): void {
    this.decode();
    this.MB = this.mem[this.PC];
    this.IR = (this.MB >> 13) & mask.MASK_5;
  }

  start(): void {
    clearInterval(this.runProcess);
    this.halt = false;
    this.PC = this.selectedAddress;
    this.runProcess = setInterval(() => {
      this.step();
      if (this.halt) {
        clearInterval(this.runProcess);
      }
      this.updateEmitter.emit();
    }, 1);
  }

  stop(): void {
    clearInterval(this.runProcess);
    this.halt = true;
    this.updateEmitter.emit();
  }

  continue(): void {
    if (this.halt) {
      this.runProcess = setInterval(() => {
        this.step();
        this.updateEmitter.emit();
      }, 1);
    }
  }

  load(): void {
    let memIndex = 0;
    for (const word of SPACEWAR) {
      this.mem[memIndex] = word;
      memIndex++;
    }
    this.PC = 4;
    this.MB = this.mem[this.PC];
    this.IR = (this.MB >> 13) & mask.MASK_5;
  }

  decode(): void {
    this.MB = this.mem[this.PC];
    const opcode = (this.MB >> 12) & mask.MASK_OPCODE;
    this.IR = (opcode >> 1) & mask.MASK_5;
    const shiftOpcode = (this.MB >> 9) & mask.MASK_9;
    const indirect = (this.MB >> 12) & mask.MASK_1;
    const Y = this.MB & mask.MASK_12;

    switch (opcode) {
      // Add
      // add Y
      case instruction.ADD:
        this.add(this.read(Y));
        this.incPC();
        break;

      // Subtract
      // sub Y
      case instruction.SUB:
        this.subtract(this.read(Y));
        this.incPC();
        break;

      // Multiply
      // mul Y
      case instruction.MUL:
        this.multiply(this.read(Y));
        this.incPC();
        break;

      // Divide
      // div Y
      case instruction.DIV:
        this.divide(this.read(Y));
        this.incPC();
        break;

      // Index
      // idx Y
      case instruction.IDX:
        this.incY(Y);
        this.incPC();
        break;

      // Index and Skip if Positive
      // isp Y
      case instruction.ISP:
        this.incY(Y);
        if (helper.isPositive(this.AC)) {
          this.incPC();
        }
        this.incPC();
        break;

      // Logical AND
      // and Y
      case instruction.AND:
        this.setAC(this.AC & this.read(Y));
        this.incPC();
        break;

      // Exclusive OR
      // xor Y
      case instruction.XOR:
        this.setAC(this.AC ^ this.read(Y));
        this.incPC();
        break;

      // Inclusive OR
      // ior Y
      case instruction.IOR:
        this.setAC(this.AC | this.read(Y));
        this.incPC();
        break;

      // Load Accumulator
      // lac Y
      case instruction.LAC:
        this.setAC(this.read(Y));
        this.incPC();
        break;

      // Deposit Accumulator
      // dac Y
      case instruction.DAC:
        this.write(Y, this.AC);
        this.incPC();
        break;

      // Deposit Address Part
      // dap Y
      case instruction.DAP:
        this.writeY(Y, this.AC);
        this.incPC();
        break;

      // Deposit Instruction Part
      // dip Y
      case instruction.DIP:
        this.writeInstr(Y, this.AC);
        this.incPC();
        break;

      // Load In-Out Register
      // lio Y
      case instruction.LIO:
        this.setIO(this.read(Y));
        this.incPC();
        break;

      // Deposit In-Out Register
      // dio Y
      case instruction.DIO:
        this.write(Y, this.IO);
        this.incPC();
        break;

      // Deposit Zero in Memory
      // dzm Y
      case instruction.DZM:
        this.writeInstr(Y, 0);
        this.incPC();
        break;

      // Execute
      // xct Y
      case instruction.XCT:
        // TODO: Implement Execute
        break;

      // Jump
      // jmp Y
      case instruction.JMP:
        this.setPC(Y);
        break;

      // Jump and Save Program Counter
      // jsp Y
      case instruction.JSP:
        this.incPC();
        this.setAC(this.PC | (helper.boolToBit(this.overflow) << 17));
        this.setPC(Y);
        break;

      case instruction.CAL_JDA:
        if (!indirect) {
          // Call Subroutine
          // cal Y
          this.write(AC_SAVE_ADDR, this.AC);
          this.incPC();
          this.setAC(this.PC | (helper.boolToBit(this.overflow) << 17));
          this.setPC(SUB_ADDR);
        } else {
          // Jump and Deposit Accumulator
          // jda Y
          this.write(Y, this.AC);
          this.incPC();
          this.setAC(this.PC | (helper.boolToBit(this.overflow) << 17));
          this.setPC(Y);
        }
        break;

      // Skip if Accumulator and Y differ
      // sad Y
      case instruction.SAD:
        if (Y != this.AC) {
          this.incPC();
        }
        this.incPC();
        break;

      // Skip if Accumulator and Y are the same
      // sas Y
      case instruction.SAS:
        if (Y == this.AC) {
          this.incPC();
        }
        this.incPC();
        break;

      // Load Accumulator with N
      // law N
      case instruction.LAW:
        this.setAC(Y);
        if (indirect) {
          this.AC = ~this.AC;
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
            this.setAC(this.rotateRight(this.AC, helper.onesCount(this.MB)));
            break;

          // Rotate Accumulator Left
          // ral N
          case instruction.RAL:
            this.setAC(this.rotateLeft(this.AC, helper.onesCount(this.MB)));
            break;

          // Shift Accumulator Right
          // sar N
          case instruction.SAR:
            this.setAC(this.shiftRight(this.AC, helper.onesCount(this.MB)));
            break;

          // Shift Accumulator Left
          // sal N
          case instruction.SAL:
            this.setAC(this.shiftLeft(this.AC, helper.onesCount(this.MB)));
            break;

          // Rotate In-Out Register Right
          // rir N
          case instruction.RIR:
            this.setIO(this.rotateRight(this.IO, helper.onesCount(this.MB)));
            break;

          // Rotate In-Out Register Left
          // ril N
          case instruction.RIL:
            this.setIO(this.rotateLeft(this.IO, helper.onesCount(this.MB)));
            break;

          // Shift In-Out Register Right
          // sir N
          case instruction.SIR:
            this.setIO(this.shiftLeft(this.IO, helper.onesCount(this.MB)));
            break;

          // Shift In-Out Register Left
          // sil N
          case instruction.SIL:
            this.setIO(this.shiftLeft(this.IO, helper.onesCount(this.MB)));
            break;

          // Rotate AC and IO Right
          // rcr N
          case instruction.RCR:
            this.rotateACIORight(helper.onesCount(this.MB));
            break;

          // Rotate AC and IO Left
          // rcl N
          case instruction.RCL:
            this.rotateACIOLeft(helper.onesCount(this.MB));
            break;

          // Shift AC and IO Right
          // scr N
          case instruction.SCR:
            this.shiftACIORight(helper.onesCount(this.MB));
            break;

          // Shift AC and IO Left
          // scl N
          case instruction.SCL:
            this.shiftACIOLeft(helper.onesCount(this.MB));
            break;

          default:
            console.log(`Instruction Not Implemented: ${this.MB.toString(8)}`);
            break;
        }
        this.incPC();
        break;

      // Skip Group
      // skp
      case instruction.SKIP_GROUP:
        // Skip on ZERO Accumulator
        // sza
        if ((Y & instruction.SZA) != 0) {
          if (this.AC == 0) {
            this.incPC();
          }
        }

        // Skip on Plus Accumulator
        // spa
        if ((Y & instruction.SPA) != 0) {
          if (helper.isPositive(this.AC)) {
            this.incPC();
          }
        }

        // Skip on Minus Accumulator
        // sma
        if ((Y & instruction.SMA) != 0) {
          if (!helper.isPositive(this.AC)) {
            this.incPC();
          }
        }

        // Skip on ZERO Overflow
        // szo
        if ((Y & instruction.SZO) != 0) {
          if (!this.overflow) {
            this.incPC();
          }
          this.overflow = false;
        }

        // Skip on Plus In-Out Register
        // spi
        if ((Y & instruction.SPI) != 0) {
          if (helper.isPositive(this.IO)) {
            this.incPC();
          }
        }

        if (instruction.SZS_RANGE.includes(Y & mask.SZS_MASK)) {
          // Skip on ZERO Switch
          // szs
          this.senseSwitchSkip(Y);
        } else if (instruction.SZF_RANGE.includes(Y & mask.MASK_3)) {
          // Skip on ZERO Program Flag
          // szf
          this.programFlagSkip(Y);
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
        switch (Y) {
          case instruction.TYI:
            // TODO: Implement TYI
            break;

          case instruction.DPY:
            this.setDisplayCoords();
            break;

          default:
            console.log(`Instruction Not Implemented: ${this.MB.toString(8)}`);
            break;
        }
        this.incPC();
        break;

      default:
        console.log(`Instruction Not Implemented: ${this.MB.toString(8)}`);
        this.incPC();
        break;
    }
  }

  read(addr: number): number {
    return this.mem[addr & mask.MASK_12] & mask.MASK_18;
  }

  write(addr: number, value: number): void {
    this.mem[addr & mask.MASK_12] = value & mask.MASK_18;
  }

  writeInstr(addr: number, value: number): void {
    this.mem[addr & mask.MASK_12] &= mask.CLR_INSTR;
    this.mem[addr & mask.MASK_12] |= value & mask.INSTR_MASK;
  }

  writeY(addr: number, value: number): void {
    this.mem[addr & mask.MASK_12] &= mask.CLR_Y;
    this.mem[addr & mask.MASK_12] |= value & mask.MASK_12;
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
    if (!(value == 0 && this.AC == NEG_ZERO)) {
      this.add(~value & mask.MASK_18);
    }
  }

  multiply(value: number): void {
    let magnitude = helper.magnitude(this.AC) * helper.magnitude(value);
    const sign = helper.sign(this.AC) ^ helper.sign(value);
    if (sign == 1) {
      magnitude = ~magnitude;
    }
    this.setAC(helper.rightShift(magnitude, 17));
    this.setIO(((magnitude & mask.MASK_17) << 1) | sign);
    if (this.AC == NEG_ZERO && this.IO == NEG_ZERO) {
      this.setAC(0);
      this.setIO(0);
    }
  }

  divide(value: number): void {
    if (helper.magnitude(this.AC) < helper.magnitude(value)) {
      let dividend =
        helper.leftShift(this.AC & mask.MASK_17, 17) |
        ((this.IO >> 1) & mask.MASK_17);
      if (!helper.isPositive(this.AC)) {
        dividend = ~dividend & mask.MASK_34;
      }
      let magnitude = dividend / helper.magnitude(value);
      let remainder = dividend % helper.magnitude(value);
      const sign = helper.sign(this.AC) ^ helper.sign(value);
      if (sign == 1) {
        magnitude = ~magnitude;
      }
      if (helper.sign(this.AC) == 1) {
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

  incY(Y: number): void {
    this.setAC(this.read(Y) + 1);
    if (this.AC == NEG_ZERO) {
      this.setAC(0);
    }
    this.write(this.AC, Y);
  }

  programFlagSkip(Y: number): void {
    if (Y <= 6 && !this.programFlags[Y]) {
      this.incPC();
    } else {
      let allFlags = false;
      this.programFlags.forEach((flagValue) => (allFlags ||= flagValue));
      if (!allFlags) {
        this.incPC();
      }
    }
  }

  senseSwitchSkip(Y: number): void {
    const switchIndex = (Y >> 3) & mask.MASK_1;
    if (switchIndex <= 6 && !this.senseSwitches[switchIndex]) {
      this.incPC();
    } else {
      let allSwitches = false;
      this.senseSwitches.forEach(
        (switchValue) => (allSwitches ||= switchValue)
      );
      if (!allSwitches) {
        this.incPC();
      }
    }
  }

  setProgramFlag(Y: number): void {
    const switchIndex = Y & mask.MASK_3;
    if (switchIndex <= 6) {
      this.senseSwitches[switchIndex] = true;
    } else {
      for (let index = 0; index < this.senseSwitches.length; index++) {
        this.senseSwitches[index] = true;
      }
    }
  }

  clearProgramFlag(Y: number): void {
    if (Y <= 6) {
      this.senseSwitches[Y] = false;
    } else {
      for (let index = 0; index < this.senseSwitches.length; index++) {
        this.senseSwitches[index] = false;
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

  setDisplayCoords(): void {
    let x = this.AC & mask.MASK_9;
    let y = this.IO & mask.MASK_9;
    if (((x >> 9) & mask.MASK_1) == 1) {
      x = 511 - (~x & mask.MASK_9);
    } else {
      x += 512;
    }
    if (((y >> 9) & mask.MASK_1) == 1) {
      y = 511 - (~y & mask.MASK_9);
    } else {
      y += 512;
    }
    y = 1024 - y;
    this.display.setXY(x, y);
  }
}
