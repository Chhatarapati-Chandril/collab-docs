import { TestBed } from '@angular/core/testing';

import { Docs } from './docs';

describe('Docs', () => {
  let service: Docs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Docs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
