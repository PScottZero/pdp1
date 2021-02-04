// ========== MEMORY REFERENCE INSTRUCTIONS ==========

// Arithmetic Instructions
export const ADD = 0o40;
export const SUB = 0o42;
export const MUL = 0o54;
export const DIV = 0o56;
export const IDX = 0o44;
export const ISP = 0o46;

// Logical Instructions
export const AND = 0o02;
export const XOR = 0o06;
export const IOR = 0o04;

// General Instructions
export const LAC = 0o20;
export const DAC = 0o24;
export const DAP = 0o26;
export const DIP = 0o30;
export const LIO = 0o22;
export const DIO = 0o32;
export const DZM = 0o34;
export const XCT = 0o10;
export const JMP = 0o60;
export const JSP = 0o62;
export const CAL_JDA = 0o16; // CAL = 0o16, JDA = 0o17
export const SAD = 0o50;
export const SAS = 0o52;

// ========== AUGMENTED INSTRUCTIONS ==========
export const LAW = 0o70;

// Shift Group
export const SHIFT_GROUP = 0o66;
export const RAR = 0o671;
export const RAL = 0o661;
export const SAR = 0o675;
export const SAL = 0o665;
export const RIR = 0o672;
export const RIL = 0o662;
export const SIR = 0o676;
export const SIL = 0o666;
export const RCR = 0o673;
export const RCL = 0o663;
export const SCR = 0o677;
export const SCL = 0o667;

// Skip Group
export const SKIP_GROUP = 0o64;
export const SZA = 0o0100;
export const SPA = 0o0200;
export const SMA = 0o0400;
export const SZO = 0o1000;
export const SPI = 0o2000;
export const SZS_RANGE = [
  0o0010,
  0o0020,
  0o0030,
  0o0040,
  0o0050,
  0o0060,
  0o0070,
];
export const SZF_RANGE = [
  0o0001,
  0o0002,
  0o0003,
  0o0004,
  0o0005,
  0o0006,
  0o0007,
];

// Operate Group
// CLF 0o0001 to 0o0007
// STF 0o0011 to 0o0017
export const OPERATE_GROUP = 0o76;
export const CLI = 0o4000;
export const LAT = 0o2000;
export const LAP = 0o0100;
export const CMA = 0o1000;
export const HLT = 0o0400;
export const CLA = 0o0200;
export const NOP = 0o0000;
export const CLF_RANGE = [
  0o0001,
  0o0002,
  0o0003,
  0o0004,
  0o0005,
  0o0006,
  0o0007,
];
export const STF_RANGE = [
  0o0011,
  0o0012,
  0o0013,
  0o0014,
  0o0015,
  0o0016,
  0o0017,
];

// IO
export const IOT = 0o72;
