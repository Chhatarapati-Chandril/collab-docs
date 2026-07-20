import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfflineIndicator } from './offline-indicator';

describe('OfflineIndicator', () => {
  let component: OfflineIndicator;
  let fixture: ComponentFixture<OfflineIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineIndicator],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineIndicator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
