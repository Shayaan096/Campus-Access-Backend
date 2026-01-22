import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DataService, Department, Section, Student } from '../services/data.service';
import { ToastController, LoadingController } from '@ionic/angular/standalone';

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
        studentId: '',
        rollNo: '',
        fatherName: '',
        email: '',
        phone: '',
        departmentId: '',
        sectionId: '',
        year: '',
        semester: ''
    };

    constructor() { }

    ngOnInit() {
        this.loadDepartments();
        this.loadSections();
    }

    segmentChanged(ev: any) {
        this.selectedSegment = ev.detail.value;
    }

    // --- Departments ---

    loadDepartments() {
        this.dataService.getDepartments().subscribe(res => {
            this.departments = [];
            if (res) {
                Object.keys(res).forEach(key => {
                    this.departments.push({ id: key, ...res[key] });
                });
            }
        });
    }

    async addDepartment() {
        if (!this.deptName || !this.deptCode) {
            this.showToast('Please enter a department name and code');
            return;
        }
        const loading = await this.loadingCtrl.create({ message: 'Adding...' });
        await loading.present();

        this.dataService.addDepartment({ name: this.deptName, code: this.deptCode }).subscribe({
            next: async () => {
                await loading.dismiss();
                this.showToast('Department Added!');
                this.deptName = '';
                this.deptCode = '';
                this.loadDepartments(); // Refresh list
            },
            error: async (err) => {
                await loading.dismiss();
                this.showToast('Error adding department');
                console.error(err);
            }
        });
    }

    // --- Sections ---

    loadSections() {
        // For now getting all sections. 
        this.dataService.getSections('').subscribe(res => {
            this.sections = [];
            if (res) {
                Object.keys(res).forEach(key => {
                    this.sections.push({ id: key, ...res[key] });
                });
            }
        });
    }

    async addSection() {
        if (!this.sectionName || !this.sectionDeptId) {
            this.showToast('Please fill all fields');
            return;
        }
        const loading = await this.loadingCtrl.create({ message: 'Adding...' });
        await loading.present();

        this.dataService.addSection({ name: this.sectionName, departmentId: this.sectionDeptId }).subscribe({
            next: async () => {
                await loading.dismiss();
                this.showToast('Section Added!');
                this.sectionName = '';
                this.loadSections();
            },
            error: async (err) => {
                await loading.dismiss();
                this.showToast('Error adding section');
                console.error(err);
            }
        });
    }

    getDeptName(deptId: string): string {
        const dept = this.departments.find(d => d.id === deptId);
        return dept ? dept.name : 'Unknown';
    }

    // --- Students ---

    onStudentDeptChange() {
        this.student.sectionId = ''; // Reset section when dept changes
    }

    getSectionsForDept(deptId: string): Section[] {
        return this.sections.filter(s => s.departmentId === deptId);
    }

    async addStudent() {
        if (!this.student.studentId || !this.student.rollNo || !this.student.departmentId || !this.student.sectionId) {
            this.showToast('Please fill in required fields (ID, Roll No, Dept, Section)');
            return;
        }
        const loading = await this.loadingCtrl.create({ message: 'Adding...' });
        await loading.present();

        this.dataService.addStudent(this.student).subscribe({
            next: async () => {
                await loading.dismiss();
                this.showToast('Student Added Successfully!');
                this.resetStudentForm();
            },
            error: async (err) => {
                await loading.dismiss();
                this.showToast('Error adding student');
                console.error(err);
            }
        });
    }

    resetStudentForm() {
        this.student = {
            studentId: '',
            rollNo: '',
            fatherName: '',
            email: '',
            phone: '',
            departmentId: '',
            sectionId: '',
            year: '',
            semester: ''
        };
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
