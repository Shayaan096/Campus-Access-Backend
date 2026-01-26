import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DataService, Department, Section, Student } from '../services/data.service';
import { ToastController, LoadingController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';

@Component({
    selector: 'app-admin',
    templateUrl: './admin.page.html',
    styleUrls: ['./admin.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule]
})
export class AdminPage implements OnInit {
    private dataService = inject(DataService);
    private toastCtrl = inject(ToastController);
    private loadingCtrl = inject(LoadingController);

    selectedSegment = 'departments';

    // Department State
    deptName = '';
    deptCode = '';
    departments: Department[] = [];

    // Section State
    sectionName = '';
    sectionDeptId = '';
    sections: Section[] = [];

    // Student State
    student: Student = {
        id: '',
        name: '',
        fatherName: '',
        email: '',
        phone: ''
    };
    students: Student[] = [];
    sectionIdForStudent = '';
    deptIdForStudent = '';

    constructor() {
        addIcons({ trashOutline });
    }

    ngOnInit() {
        this.loadDepartments();
    }

    segmentChanged(ev: any) {
        this.selectedSegment = ev.detail.value;
        if (this.selectedSegment === 'sections' && this.departments.length > 0) {
            this.loadSections();
        }
    }

    // --- Departments ---
    loadDepartments() {
        this.dataService.getDepartments().subscribe((res: Department[]) => {
            this.departments = res || [];
        });
    }

    async addDepartment() {
        if (!this.deptName || !this.deptCode) {
            this.showToast('Please enter a department name and code');
            return;
        }
        const loading = await this.loadingCtrl.create({ message: 'Adding...' });
        await loading.present();

        const id = 'dept_' + Date.now();
        const newDept: Department = {
            id: id,
            name: this.deptName,
            code: this.deptCode
        };

        this.dataService.addDepartment(newDept).subscribe({
            next: async () => {
                await loading.dismiss();
                this.showToast('Department Added!');
                this.deptName = '';
                this.deptCode = '';
                this.loadDepartments();
            },
            error: async (err: any) => {
                await loading.dismiss();
                this.showToast('Error adding department');
                console.error(err);
            }
        });
    }

    getDeptName(deptId: string): string {
        const dept = this.departments.find(d => d.id === deptId);
        return dept ? dept.name : 'Unknown';
    }

    // --- Sections ---
    loadSections(deptId?: string) {
        const idToLoad = deptId || this.sectionDeptId || this.deptIdForStudent;
        if (idToLoad) {
            this.dataService.getSections(idToLoad).subscribe((res: Section[]) => {
                this.sections = res || [];
            });
        }
    }

    async addSection() {
        if (!this.sectionName || !this.sectionDeptId) {
            this.showToast('Please fill all fields');
            return;
        }
        const loading = await this.loadingCtrl.create({ message: 'Adding...' });
        await loading.present();

        const id = 'sec_' + Date.now();
        const newSec: Section = {
            id: id,
            name: this.sectionName,
            departmentId: this.sectionDeptId
        };

        this.dataService.addSection(this.sectionDeptId, newSec).subscribe({
            next: async () => {
                await loading.dismiss();
                this.showToast('Section Added!');
                this.sectionName = '';
                this.loadSections(this.sectionDeptId);
            },
            error: async (err: any) => {
                await loading.dismiss();
                this.showToast('Error adding section');
                console.error(err);
            }
        });
    }

    // --- Students ---
    loadStudents() {
        if (this.deptIdForStudent && this.sectionIdForStudent) {
            this.dataService.getStudents(this.deptIdForStudent, this.sectionIdForStudent).subscribe((res: Student[]) => {
                this.students = res || [];
            });
        }
    }

    async deleteStudent(stu: Student) {
        if (!stu.firebaseKey) return;

        const loading = await this.loadingCtrl.create({ message: 'Deleting...' });
        await loading.present();

        this.dataService.deleteStudent(stu.firebaseKey).subscribe({
            next: async () => {
                await loading.dismiss();
                this.showToast('Student Deleted!');
                this.loadStudents();
            },
            error: async (err) => {
                await loading.dismiss();
                this.showToast('Error deleting student');
            }
        });
    }

    async addStudent() {
        if (!this.student.id || !this.student.name || !this.deptIdForStudent || !this.sectionIdForStudent) {
            this.showToast('Please fill in required fields (ID, Name, Dept, Section)');
            return;
        }
        const loading = await this.loadingCtrl.create({ message: 'Adding...' });
        await loading.present();

        this.dataService.addStudent(this.deptIdForStudent, this.sectionIdForStudent, this.student).subscribe({
            next: async () => {
                await loading.dismiss();
                this.showToast('Student Added Successfully!');
                this.loadStudents();
                this.resetStudentForm();
            },
            error: async (err: any) => {
                await loading.dismiss();
                this.showToast('Error adding student');
                console.error(err);
            }
        });
    }

    resetStudentForm() {
        this.student = {
            id: '',
            name: '',
            fatherName: '',
            email: '',
            phone: ''
        };
        // Keep the selection so the list is still visible
        // this.sectionIdForStudent = '';
    }

    async showToast(msg: string) {
        const toast = await this.toastCtrl.create({
            message: msg,
            duration: 2000,
            position: 'bottom'
        });
        toast.present();
    }
}
