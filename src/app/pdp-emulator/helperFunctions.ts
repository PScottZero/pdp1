import * as mask from './masks';

export function isPositive(value: number): boolean {
  return sign(value) == 0;
}

export function rightShift(value: number, shift: number): number {
  return Math.floor(value / Math.pow(2, shift));
}

export function leftShift(value: number, shift: number): number {
  return value * Math.pow(2, shift);
}

export function magnitude(value: number): number {
  if (isPositive(value)) {
    return value;
  } else {
    return ~value & mask.MASK_17;
  }
}

export function sign(value: number): number {
  return (value >> 17) & mask.MASK_1;
}

export function onesCount(value: number): number {
  let count = 0;
  for (let _ = 0; _ < 9; _++) {
    if (value % 2 == 1) {
      count++;
    }
    value >>= 1;
  }
  return count;
}

export function boolToBit(bool: boolean): number {
  return bool ? 1 : 0;
}
