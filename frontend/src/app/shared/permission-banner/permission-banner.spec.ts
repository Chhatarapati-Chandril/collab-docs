import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionBanner } from './permission-banner';

describe('PermissionBanner', () => {
  let component: PermissionBanner;
  let fixture: ComponentFixture<PermissionBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionBanner],
    }).compileComponents();

    fixture = TestBed.createComponent(PermissionBanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
