export class TapeConfig {
  constructor(
    public name: string,
    public fileName: string,
    public hardwareMultiply: boolean = true,
    public testWord: number = 0,
    public startAddress: number = 0,
    public expectedStartAddress: number = 0
  ) {}
}
