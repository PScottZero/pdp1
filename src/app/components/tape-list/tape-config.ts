export class TapeConfig {
  constructor(
    public name: string,
    public fileName: string,
    public hardwareMultiply: boolean,
    public testWord?: number,
    public startAddress?: number,
    public alternateAddress?: number
  ) {}
}
