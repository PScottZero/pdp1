import { Injectable } from '@angular/core';
import * as constant from './cpu.constants';
import * as instruction from './cpu.instructions';

@Injectable({
  providedIn: 'root',
})
export class CPUService {
  mem: number[]; // 4096 18-bit words
  PC: number; // Program Counter (12-bit)
  MA: number; // Memory Address Register (12-bit)
  IR: number; // Instruction Register (5-bit)
  MB: number; // Memory Buffer Register (18-bit)
  AC: number; // Accumulator (18-bit)
  IO: number; // In-Out Register (18-bit)
  overflow: boolean;
  senseSwitches: boolean[];
  programFlags: boolean[];

  constructor() {
    this.mem = Array<number>(constant.MEM_SIZE).fill(0);
    this.senseSwitches = Array<boolean>(constant.SENSE_SWITCH_COUNT).fill(
      false
    );
    this.programFlags = Array<boolean>(constant.PROGRAM_FLAG_COUNT).fill(false);
  }

  decode(): void {
    const word = this.mem[this.PC];
    const opcode = (word >> 12) & constant.MASK_OPCODE;
    const shiftOpcode = (word >> 9) & constant.MASK_9;
    const indirect = (word >> 12) & constant.MASK_1;
    const Y = word & constant.MASK_12;

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
        if (this.isPositive(this.AC)) {
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
        this.writeInstr(Y, constant.POS_ZERO);
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
        this.setAC(this.PC | (this.overflowAsBit() << 17));
        this.setPC(Y);
        break;

      case instruction.CAL_JDA:
        if (!indirect) {
          // Call Subroutine
          // cal Y
          this.write(constant.AC_SAVE_ADDR, this.AC);
          this.incPC();
          this.setAC(this.PC | (this.overflowAsBit() << 17));
          this.setPC(constant.SUB_ADDR);
        } else {
          // Jump and Deposit Accumulator
          // jda Y
          this.write(Y, this.AC);
          this.incPC();
          this.setAC(this.PC | (this.overflowAsBit() << 17));
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
            this.setAC(this.rotateRight(this.AC, this.onesCount(word)));
            break;

          // Rotate Accumulator Left
          // ral N
          case instruction.RAL:
            this.setAC(this.rotateLeft(this.AC, this.onesCount(word)));
            break;

          // Shift Accumulator Right
          // sar N
          case instruction.SAR:
            this.setAC(this.shiftRight(this.AC, this.onesCount(word)));
            break;

          // Shift Accumulator Left
          // sal N
          case instruction.SAL:
            this.setAC(this.shiftLeft(this.AC, this.onesCount(word)));
            break;

          // Rotate In-Out Register Right
          // rir N
          case instruction.RIR:
            this.setIO(this.rotateRight(this.IO, this.onesCount(word)));
            break;

          // Rotate In-Out Register Left
          // ril N
          case instruction.RIL:
            this.setIO(this.rotateLeft(this.IO, this.onesCount(word)));
            break;

          // Shift In-Out Register Right
          // sir N
          case instruction.SIR:
            this.setIO(this.shiftLeft(this.IO, this.onesCount(word)));
            break;

          // Shift In-Out Register Left
          // sil N
          case instruction.SIL:
            this.setIO(this.shiftLeft(this.IO, this.onesCount(word)));
            break;

          // Rotate AC and IO Right
          // rcr N
          case instruction.RCR:
            this.rotateACIORight(this.onesCount(word));
            break;

          // Rotate AC and IO Left
          // rcl N
          case instruction.RCL:
            this.rotateACIOLeft(this.onesCount(word));
            break;

          // Shift AC and IO Right
          // scr N
          case instruction.SCR:
            this.shiftACIORight(this.onesCount(word));
            break;

          // Shift AC and IO Left
          // scl N
          case instruction.SCL:
            this.shiftACIOLeft(this.onesCount(word));
            break;

          default:
            console.log(`Instruction Not Implemented: ${word}`);
            break;
        }
        this.incPC();
        break;

      // Skip Group
      // skp
      case instruction.SKIP_GROUP:
        switch (Y) {
          // Skip on ZERO Accumulator
          // sza
          case instruction.SZA:
            if (this.AC == 0) {
              this.incPC();
            }
            break;

          // Skip on Plus Accumulator
          // spa
          case instruction.SPA:
            if (this.isPositive(this.AC)) {
              this.incPC();
            }
            break;

          // Skip on Minus Accumulator
          // sma
          case instruction.SMA:
            if (!this.isPositive(this.AC)) {
              this.incPC();
            }
            break;

          // Skip on ZERO Overflow
          // szo
          case instruction.SZO:
            if (!this.overflow) {
              this.incPC();
            }
            this.overflow = false;
            break;

          // Skip on Plus In-Out Register
          // spi
          case instruction.SPI:
            if (this.isPositive(this.IO)) {
              this.incPC();
            }
            break;

          default:
            if (Y <= 7) {
              if (Y <= 6 && !this.programFlags[Y]) {
                this.incPC();
              } else {
                let allFlags = false;
                this.programFlags.forEach(
                  (flagValue) => (allFlags ||= flagValue)
                );
                if (!allFlags) {
                  this.incPC();
                }
              }
            } else {
              const switchIndex = (Y >> 3) & constant.MASK_1;
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
            break;
        }
        this.incPC();
        break;

      default:
        console.log(`Instruction Not Implemented: ${word}`);
        break;
    }
  }

  read(addr: number): number {
    return this.mem[addr & constant.MASK_12] & constant.MASK_18;
  }

  write(addr: number, value: number): void {
    this.mem[addr & constant.MASK_12] = value & constant.MASK_18;
  }

  writeInstr(addr: number, value: number): void {
    this.mem[addr & constant.MASK_12] &= constant.CLR_INSTR;
    this.mem[addr & constant.MASK_12] |= value & constant.INSTR_MASK;
  }

  writeY(addr: number, value: number): void {
    this.mem[addr & constant.MASK_12] &= constant.CLR_Y;
    this.mem[addr & constant.MASK_12] |= value & constant.MASK_12;
  }

  add(value: number): void {
    let result = this.AC + value;
    result += (result >> 18) & constant.MASK_1;
    this.overflow =
      (this.isPositive(this.AC) &&
        this.isPositive(value) &&
        !this.isPositive(result)) ||
      (!this.isPositive(this.AC) &&
        !this.isPositive(value) &&
        this.isPositive(result));
    this.setAC(result);
    if (this.AC == constant.NEG_ZERO) {
      this.AC = constant.POS_ZERO;
    }
  }

  subtract(value: number): void {
    if (!(value == constant.POS_ZERO && this.AC == constant.NEG_ZERO)) {
      this.add(~value & constant.MASK_18);
    }
  }

  multiply(value: number): void {
    let magnitude = this.magnitude(this.AC) * this.magnitude(value);
    const sign = this.sign(this.AC) ^ this.sign(value);
    if (sign == 1) {
      magnitude = ~magnitude;
    }
    this.setAC(this.rightShift(magnitude, 17));
    this.setIO(((magnitude & constant.MASK_17) << 1) | sign);
    if (this.AC == constant.NEG_ZERO && this.IO == constant.NEG_ZERO) {
      this.setAC(constant.POS_ZERO);
      this.setIO(constant.POS_ZERO);
    }
  }

  divide(value: number): void {
    if (this.magnitude(this.AC) < this.magnitude(value)) {
      let dividend =
        this.leftShift(this.AC & constant.MASK_17, 17) |
        ((this.IO >> 1) & constant.MASK_17);
      if (!this.isPositive(this.AC)) {
        dividend = ~dividend & constant.MASK_34;
      }
      let magnitude = dividend / this.magnitude(value);
      let remainder = dividend % this.magnitude(value);
      const sign = this.sign(this.AC) ^ this.sign(value);
      if (sign == 1) {
        magnitude = ~magnitude;
      }
      if (this.sign(this.AC) == 1) {
        remainder = ~remainder;
      }
      this.setAC(magnitude);
      this.setIO(remainder);
      if (this.AC == constant.NEG_ZERO) {
        this.setAC(constant.POS_ZERO);
      }
      if (this.IO == constant.NEG_ZERO) {
        this.setIO(constant.POS_ZERO);
      }
      this.incPC();
    }
  }

  rotateRight(value: number, count: number): number {
    for (let _ = 0; _ < count; _++) {
      const bit0 = value & constant.MASK_1;
      value = (bit0 << 17) | ((value >> 1) & constant.MASK_17);
    }
    return value;
  }

  rotateACIORight(count: number): void {
    for (let _ = 0; _ < count; _++) {
      const AC0 = this.AC & constant.MASK_1;
      const IO0 = this.IO & constant.MASK_1;
      this.setAC((IO0 << 17) | ((this.AC >> 1) & constant.MASK_17));
      this.setIO((AC0 << 17) | ((this.IO >> 1) & constant.MASK_17));
    }
  }

  rotateLeft(value: number, count: number): number {
    for (let _ = 0; _ < count; _++) {
      const bit7 = (value >> 17) & constant.MASK_1;
      value = ((value << 1) & constant.MASK_18) | bit7;
    }
    return value;
  }

  rotateACIOLeft(count: number): void {
    for (let _ = 0; _ < count; _++) {
      const AC7 = (this.AC >> 17) & constant.MASK_1;
      const IO7 = (this.IO >> 17) & constant.MASK_1;
      this.setAC(((this.AC << 1) & constant.MASK_18) | IO7);
      this.setIO(((this.IO << 1) & constant.MASK_18) | AC7);
    }
  }

  shiftRight(value: number, count: number): number {
    for (let _ = 0; _ < count; _++) {
      const sign = this.sign(value);
      value = (sign << 17) | ((value >> 1) & constant.MASK_17);
    }
    return value;
  }

  shiftACIORight(count: number): void {
    for (let _ = 0; _ < count; _++) {
      const sign = this.sign(this.AC);
      const AC0 = this.AC & constant.MASK_1;
      this.setAC((sign << 17) | ((this.AC >> 1) & constant.MASK_17));
      this.setIO((AC0 << 17) | ((this.IO >> 1) & constant.MASK_17));
    }
  }

  shiftLeft(value: number, count: number): number {
    return (value << count) & constant.MASK_18;
  }

  shiftACIOLeft(count: number): void {
    for (let _ = 0; _ < count; _++) {
      const IO7 = (this.IO >> 17) & constant.MASK_1;
      this.setAC(((this.AC << 1) & constant.MASK_18) | IO7);
      this.setIO((this.IO << 1) & constant.MASK_18);
    }
  }

  incY(Y: number): void {
    this.setAC(this.read(Y) + 1);
    if (this.AC == constant.NEG_ZERO) {
      this.setAC(constant.POS_ZERO);
    }
    this.write(this.AC, Y);
  }

  isPositive(value: number): boolean {
    return this.sign(value) == 0;
  }

  rightShift(value: number, shift: number): number {
    return Math.floor(value / Math.pow(2, shift));
  }

  leftShift(value: number, shift: number): number {
    return value * Math.pow(2, shift);
  }

  magnitude(value: number): number {
    if (this.isPositive(value)) {
      return value;
    } else {
      return ~value & constant.MASK_17;
    }
  }

  sign(value: number): number {
    return (value >> 17) & constant.MASK_1;
  }

  incPC(): void {
    this.setPC(this.PC + 1);
  }

  setAC(value: number): void {
    this.AC = value & constant.MASK_18;
  }

  setIO(value: number): void {
    this.IO = value & constant.MASK_18;
  }

  setPC(value: number): void {
    this.PC = value & constant.MASK_12;
  }

  overflowAsBit(): number {
    return this.overflow ? 1 : 0;
  }

  onesCount(value: number): number {
    let count = 0;
    for (let _ = 0; _ < 9; _++) {
      if (value % 2 == 1) {
        count++;
      }
      value >>= 1;
    }
    return count;
  }
}
