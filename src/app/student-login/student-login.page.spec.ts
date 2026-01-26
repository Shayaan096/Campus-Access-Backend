import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentLoginPage } from './student-login.page';

describe('StudentLoginPage', () => {
  let component: StudentLoginPage;
  let fixture: ComponentFixture<StudentLoginPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentLoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
