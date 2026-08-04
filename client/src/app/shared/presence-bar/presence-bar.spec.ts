import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PresenceBar } from './presence-bar';

describe('PresenceBar', () => {
  let component: PresenceBar;
  let fixture: ComponentFixture<PresenceBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresenceBar],
    }).compileComponents();

    fixture = TestBed.createComponent(PresenceBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
