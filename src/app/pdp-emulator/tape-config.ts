export class TapeConfig {
  constructor(
    public name: string,
    public fileName: string,
    public startAddress: number,
    public hardwareMultiply: boolean,
    public senseSwitches: boolean[],
    public testWord: number,
    public info: string
  ) {}
}

export const TAPES = [
  new TapeConfig(
    'CHM Demo',
    'dpys5.rim',
    0,
    true,
    [false, false, false, false, false, false],
    0,
    'PC 0 for Munching Squares.\nPC 10 for Snowflake.\nPC 500 for Minskytron'
  ),
];
