import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map, forkJoin, of } from 'rxjs';

export interface Student {
    id: string;
    name: string;
    fatherName: string;
    email: string;
    phone: string;
    departmentId?: string;
    sectionId?: string;
    photoUrl?: string;
    registeredAt?: string;
    firebaseKey?: string;
}

export interface Section {
    id: string;
    name: string;
    departmentId?: string;
}

export interface Department {
    id: string;
    name: string;
    code: string;
}

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private http = inject(HttpClient);
    private baseUrl = environment.databaseURL;

    constructor() { }

    // Departments
    addDepartment(department: Department): Observable<Department> {
        return this.http.put<Department>(`${this.baseUrl}/departments/${department.id}.json`, department);
    }

    getDepartments(): Observable<Department[]> {
        return this.http.get<{ [key: string]: Department }>(`${this.baseUrl}/departments.json`).pipe(
            map(res => {
                if (!res) return [];
                return Object.keys(res).map(key => ({ ...res[key], id: key }));
            })
        );
    }

    // Sections (Flat Root Collection)
    addSection(deptId: string, section: Section): Observable<Section> {
        const sectionData = { ...section, departmentId: deptId };
        return this.http.put<Section>(`${this.baseUrl}/sections/${section.id}.json`, sectionData);
    }

    getSections(departmentId: string): Observable<Section[]> {
        return this.http.get<{ [key: string]: any }>(`${this.baseUrl}/sections.json`).pipe(
            map(res => {
                if (!res) return [];
                return Object.keys(res)
                    .map(key => ({ ...res[key], id: key }))
                    .filter(sec => sec.departmentId === departmentId);
            })
        );
    }

    // Students (Flat Root Collection)
    addStudent(deptId: string, secId: string, student: Student): Observable<Student> {
        const studentData = { ...student, departmentId: deptId, sectionId: secId, registeredAt: new Date().toISOString() };
        return this.http.put<Student>(`${this.baseUrl}/students/${student.id}.json`, studentData);
    }

    getStudents(departmentId: string, sectionId: string): Observable<Student[]> {
        return this.http.get<{ [key: string]: any }>(`${this.baseUrl}/students.json`).pipe(
            map(res => {
                if (!res) return [];
                return Object.keys(res)
                    .map(key => {
                        const s = res[key];
                        return { ...s, firebaseKey: key, id: s.id || key };
                    })
                    .filter(stu => stu.departmentId === departmentId && stu.sectionId === sectionId);
            })
        );
    }

    deleteStudent(firebaseKey: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/students/${firebaseKey}.json`);
    }

    // --- Student App Specific Methods (Direct Firebase) ---

    getDropdownData(): Observable<any[]> {
        return forkJoin({
            departments: this.http.get<{ [key: string]: Department }>(`${this.baseUrl}/departments.json`),
            sections: this.http.get<{ [key: string]: any }>(`${this.baseUrl}/sections.json`)
        }).pipe(
            map(({ departments, sections }) => {
                if (!departments) return [];
                const deptsArr = Object.keys(departments).map(id => ({ ...departments[id], id, sections: [] as any[] }));

                if (sections) {
                    Object.keys(sections).forEach(secId => {
                        const sec = sections[secId];
                        const dept = deptsArr.find(d => d.id === sec.departmentId);
                        if (dept) {
                            dept.sections.push({ id: secId, name: sec.name });
                        }
                    });
                }
                return deptsArr;
            })
        );
    }

    verifyStudentLogin(credentials: any): Observable<any> {
        return forkJoin({
            dropdownData: this.getDropdownData(),
            students: this.http.get<{ [key: string]: any }>(`${this.baseUrl}/students.json`)
        }).pipe(
            map(({ dropdownData, students }) => {
                const name = credentials.name?.toString().trim().toLowerCase();
                const fatherName = credentials.fatherName?.toString().trim().toLowerCase();
                const email = credentials.email?.toString().trim().toLowerCase();
                const phone = credentials.phone?.toString().replace(/\D/g, '');
                const deptId = credentials.deptId;
                const secId = credentials.secId;

                if (!students) throw new Error('Invalid credentials');

                const stuKey = Object.keys(students).find(key => {
                    const s = students[key];
                    const dbName = (s.name || '').toString().trim().toLowerCase();
                    const dbFather = (s.fatherName || '').toString().trim().toLowerCase();
                    const dbEmail = (s.email || '').toString().trim().toLowerCase();
                    const dbPhone = (s.phone || '').toString().replace(/\D/g, '');

                    return s.departmentId === deptId &&
                        s.sectionId === secId &&
                        dbName === name &&
                        dbFather === fatherName &&
                        dbEmail === email &&
                        dbPhone === phone;
                });

                if (stuKey) {
                    const studentData = students[stuKey];
                    const dept = dropdownData.find(d => d.id === deptId);
                    const section = dept?.sections?.find((s: any) => s.id === secId);

                    return {
                        status: "success",
                        message: "Login successful",
                        data: {
                            name: studentData.name,
                            email: studentData.email,
                            department: dept?.name || 'Unknown',
                            section: section?.name || 'Unknown',
                            rollNo: studentData.id || stuKey,
                            token: "firebase_token_" + btoa(studentData.id || stuKey)
                        }
                    };
                } else {
                    throw new Error('Invalid credentials');
                }
            })
        );
    }
}
