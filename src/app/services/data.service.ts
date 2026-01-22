import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Department {
    id?: string;
    name: string;
    code: string;
}

export interface Section {
    id?: string;
    name: string;
    departmentId: string;
}

export interface Student {
    id?: string;
    studentId: string;
    rollNo: string;
    fatherName: string;
    email: string;
    phone: string;
    departmentId: string;
    sectionId: string;
    year: string;
    semester: string;
}

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private http = inject(HttpClient);
    private baseUrl = environment.databaseURL;

    constructor() { }

    // Departments
    addDepartment(department: Department): Observable<{ name: string }> {
        return this.http.post<{ name: string }>(`${this.baseUrl}/departments.json`, department);
    }

    getDepartments(): Observable<{ [key: string]: Department }> {
        return this.http.get<{ [key: string]: Department }>(`${this.baseUrl}/departments.json`);
    }

    // Sections
    addSection(section: Section): Observable<{ name: string }> {
        return this.http.post<{ name: string }>(`${this.baseUrl}/sections.json`, section);
    }

    getSections(departmentId: string): Observable<{ [key: string]: Section }> {
        // Note: In a real app you might want to filter by departmentId using query params if rules allow, 
        // or filter client side. For now fetching all or client filtering is simplest without indexing.
        // simpler to just fetch all sections or structure DB differently. 
        // keeping it simple: just add.
        return this.http.get<{ [key: string]: Section }>(`${this.baseUrl}/sections.json`);
    }

    // Students
    addStudent(student: Student): Observable<{ name: string }> {
        return this.http.post<{ name: string }>(`${this.baseUrl}/students.json`, student);
    }

    getStudents(): Observable<{ [key: string]: Student }> {
        return this.http.get<{ [key: string]: Student }>(`${this.baseUrl}/students.json`);
    }
}
