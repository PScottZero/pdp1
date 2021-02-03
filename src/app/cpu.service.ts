import { Injectable } from '@angular/core';

const MEM_SIZE = 0o10000;
const MASK_18 = 0o777777;
const MASK_17 = 0o377777;
const MASK_12 = 0o7777;
const MASK_6 = 0o77;
const MASK_5 = 0o37;
const MASK_1 = 0b1;
const POS_ZERO = 0o000000;
const NEG_ZERO = 0o777777;

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

  decode() {
    const instruction = this.mem[this.PC];
    const opcode = (instruction >> 12) & MASK_6;
    const Y = instruction & MASK_12;

    switch (opcode) {
      // Add
      // add Y
      case 0o40: {
        this.add(this.read(Y));
        break;
      }

      // Subtract
      // sub Y
      case 0o42: {
        this.subtract(this.read(Y));
        break;
      }

      // Multiply
      // mul Y
      case 0o54: {
        this.multiply(this.read(Y));
        break;
      }

      // Divide
      // div Y
      case 0o56: {
      }
    }
  }

  read(addr: number) {
    return this.mem[addr & MASK_12] & MASK_18;
  }

  write(addr: number, value: number) {
    this.mem[addr & MASK_12] = value & MASK_18;
  }

  add(value: number) {
    let result = this.AC + value;
    result += (result >> 18) & MASK_1;
    this.overflow =
      (this.isPositive(this.AC) &&
        this.isPositive(value) &&
        !this.isPositive(result)) ||
      (!this.isPositive(this.AC) &&
        !this.isPositive(value) &&
        this.isPositive(result));
    this.AC = result & MASK_18;
    if (this.AC == NEG_ZERO) {
      this.AC = POS_ZERO;
    }
  }

  subtract(value: number) {
    if (!(value == POS_ZERO && this.AC == NEG_ZERO)) {
      this.add(~value & MASK_18);
    }
  }

  multiply(value: number) {
    let result = this.AC * value;
    let hi = this.rightShift(result, 17) & MASK_17;
    let lo = result & MASK_17;
    let sign = this.rightShift(result, 34) & MASK_1;
    this.AC = (sign << 17) | hi;
    this.IO = (lo << 1) | sign;
  }

  isPositive(value: number) {
    return ((value >> 17) & MASK_1) == 0;
  }

  rightShift(value: number, shift: number): number {
    return Math.floor(value / Math.pow(2, shift));
  }
}
