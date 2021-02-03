import { TestBed } from '@angular/core/testing';

import { CPUService } from './cpu.service';

describe('CPUService', () => {
  let service: CPUService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CPUService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('multiply correctly', () => {
    service.AC = 0o777774;
    service.multiply(0o000013);

    expect(service.AC).toEqual(0o777777);
    expect(service.IO).toEqual(0o777675);
  });
});
