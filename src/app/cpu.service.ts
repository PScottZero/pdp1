import { Injectable } from '@angular/core';
import { mainNgcc } from '@angular/compiler-cli/ngcc/src/main';

const MEM_SIZE = 0o10000;
const MASK_34 = 0o177777777777;
const MASK_18 = 0o777777;
const MASK_17 = 0o377777;
const MASK_12 = 0o7777;
const MASK_6 = 0o77;
const MASK_1 = 0b1;
const POS_ZERO = 0o000000;
const NEG_ZERO = 0o777777;
const CLR_Y = 0o770000;
const CLR_INSTR = 0o007777;
const INSTR_MASK = 0o770000;
const AC_SAVE_ADDR = 0o144;
const SUB_ADDR = 0o145;

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

  constructor() {
    this.mem = Array<number>(MEM_SIZE).fill(0);
  }

  decode(): void {
    const instruction = this.mem[this.PC];
    const opcode = (instruction >> 12) & MASK_6;
    const Y = instruction & MASK_12;

    switch (opcode) {
      // Add
      // add Y
      case 0o40:
        this.add(this.read(Y));
        break;

      // Subtract
      // sub Y
      case 0o42:
        this.subtract(this.read(Y));
        break;

      // Multiply
      // mul Y
      case 0o54:
        this.multiply(this.read(Y));
        break;

      // Divide
      // div Y
      case 0o56:
        this.divide(this.read(Y));
        break;

      // Index
      // idx Y
      case 0o44:
        this.incY(Y);
        break;

      // Index and Skip if Positive
      // isp Y
      case 0o46:
        this.incY(Y);
        if (this.isPositive(this.AC)) {
          this.incPC();
        }
        break;

      // Logical AND
      // and Y
      case 0o02:
        this.setAC(this.AC & this.read(Y));
        break;

      // Exclusive OR
      // xor Y
      case 0o06:
        this.setAC(this.AC ^ this.read(Y));
        break;

      // Inclusive OR
      // ior Y
      case 0o04:
        this.setAC(this.AC | this.read(Y));
        break;

      // Load Accumulator
      // lac Y
      case 0o20:
        this.setAC(this.read(Y));
        break;

      // Deposit Accumulator
      // dac Y
      case 0o24:
        this.write(Y, this.AC);
        break;

      // Deposit Address Part
      // dap Y
      case 0o26:
        this.writeY(Y, this.AC);
        break;

      // Deposit Instruction Part
      // dip Y
      case 0o30:
        this.writeInstr(Y, this.AC);
        break;

      // Load In-Out Register
      // lio Y
      case 0o22:
        this.setIO(this.read(Y));
        break;

      // Deposit In-Out Register
      // dio Y
      case 0o32:
        this.write(Y, this.IO);
        break;

      // Deposit Zero in Memory
      // dzm Y
      case 0o34:
        this.writeInstr(Y, POS_ZERO);
        break;

      // Execute
      // xct Y
      case 0o10:
        // TODO: Implement Execute
        break;

      // Execute (Indirect)
      // xct Y
      case 0o11:
        // TODO: Implement Execute (Indirect)
        break;

      // Jump
      // jmp Y
      case 0o60:
        this.setPC(Y - 1);
        break;

      // Jump and Save Program Counter
      // jsp Y
      case 0o62:
        this.setAC(this.PC | (this.overflowAsBit() << 17));
        this.setPC(Y - 1);
        break;

      // Call Subroutine
      // cal Y
      case 0o16:
        this.write(AC_SAVE_ADDR, this.AC);
        this.setAC(this.PC | (this.overflowAsBit() << 17));
        this.setPC(Y - 1);
        break;

      // Jump and Deposit Accumulator
      // jda Y
      case 0o17:
        this.write(Y, this.AC);
        this.setAC(this.PC | (this.overflowAsBit() << 17));
        this.setPC(Y);
        break;

      // Skip if Accumulator and Y differ
      // sad Y
      case 0o50:
        if (Y != this.AC) {
          this.incPC();
        }
        break;

      // Skip if Accumulator and Y are the same
      // sas Y
      case 0o52:
        if (Y == this.AC) {
          this.incPC();
        }
        break;
    }
  }

  read(addr: number): number {
    return this.mem[addr & MASK_12] & MASK_18;
  }

  write(addr: number, value: number): void {
    this.mem[addr & MASK_12] = value & MASK_18;
  }

  writeInstr(addr: number, value: number): void {
    this.mem[addr & MASK_12] &= CLR_INSTR;
    this.mem[addr & MASK_12] |= value & INSTR_MASK;
  }

  writeY(addr: number, value: number): void {
    this.mem[addr & MASK_12] &= CLR_Y;
    this.mem[addr & MASK_12] |= value & MASK_12;
  }

  add(value: number): void {
    let result = this.AC + value;
    result += (result >> 18) & MASK_1;
    this.overflow =
      (this.isPositive(this.AC) &&
        this.isPositive(value) &&
        !this.isPositive(result)) ||
      (!this.isPositive(this.AC) &&
        !this.isPositive(value) &&
        this.isPositive(result));
    this.setAC(result);
    if (this.AC == NEG_ZERO) {
      this.AC = POS_ZERO;
    }
  }

  subtract(value: number): void {
    if (!(value == POS_ZERO && this.AC == NEG_ZERO)) {
      this.add(~value & MASK_18);
    }
  }

  multiply(value: number): void {
    let magnitude = this.magnitude(this.AC) * this.magnitude(value);
    const sign = this.sign(this.AC) ^ this.sign(value);
    if (sign == 1) {
      magnitude = ~magnitude;
    }
    this.setAC(this.rightShift(magnitude, 17));
    this.setIO(((magnitude & MASK_17) << 1) | sign);
    if (this.AC == NEG_ZERO && this.IO == NEG_ZERO) {
      this.setAC(POS_ZERO);
      this.setIO(POS_ZERO);
    }
  }

  divide(value: number): void {
    if (this.magnitude(this.AC) < this.magnitude(value)) {
      let dividend =
        this.leftShift(this.AC & MASK_17, 17) | ((this.IO >> 1) & MASK_17);
      if (!this.isPositive(this.AC)) {
        dividend = ~dividend & MASK_34;
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
      if (this.AC == NEG_ZERO) {
        this.setAC(POS_ZERO);
      }
      if (this.IO == NEG_ZERO) {
        this.setIO(POS_ZERO);
      }
      this.incPC();
    }
  }

  incY(Y: number): void {
    this.setAC(this.read(Y) + 1);
    if (this.AC == NEG_ZERO) {
      this.setAC(POS_ZERO);
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
      return ~value & MASK_17;
    }
  }

  sign(value: number): number {
    return (value >> 17) & MASK_1;
  }

  incPC(): void {
    this.setPC(this.PC + 1);
  }

  setAC(value: number): void {
    this.AC = value & MASK_18;
  }

  setIO(value: number): void {
    this.IO = value & MASK_18;
  }

  setPC(value: number): void {
    this.PC = value & MASK_12;
  }

  overflowAsBit(): number {
    return this.overflow ? 1 : 0;
  }
}
