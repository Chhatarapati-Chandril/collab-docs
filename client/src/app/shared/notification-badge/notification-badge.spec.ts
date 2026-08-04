import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationBadge } from './notification-badge';

describe('NotificationBadge', () => {
  let component: NotificationBadge;
  let fixture: ComponentFixture<NotificationBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
