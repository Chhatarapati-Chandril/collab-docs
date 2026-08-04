import { TestBed } from '@angular/core/testing';

import { Collab } from './collab';

describe('Collab', () => {
  let service: Collab;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Collab);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
