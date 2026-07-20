import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharePanel } from './share-panel';

describe('SharePanel', () => {
  let component: SharePanel;
  let fixture: ComponentFixture<SharePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharePanel],
    }).compileComponents();

    fixture = TestBed.createComponent(SharePanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
