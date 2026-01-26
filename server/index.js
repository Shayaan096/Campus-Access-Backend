const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Helper function to read DB
const readDB = () => {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
};

// Helper to scrub student data (remove restricted fields)
const scrubStudent = (student) => {
    if (!student) return student;
    const { year, semester, ...safeStudent } = student;
    return safeStudent;
};

// --- API Endpoints ---

// 1. Get all data (full hierarchy)
app.get('/api/data', (req, res) => {
    try {
        const data = readDB();
        // Scrub nested students
        const cleanData = data.map(dept => ({
            ...dept,
            sections: (dept.sections || []).map(sec => ({
                ...sec,
                students: (sec.students || []).map(scrubStudent)
            }))
        }));
        res.json(cleanData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// 2. Get all departments
app.get('/api/departments', (req, res) => {
    try {
        const data = readDB();
        const departments = data.map(dept => ({
            id: dept.id,
            name: dept.name,
            code: dept.code
        }));
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// 3. Get sections for a specific department
app.get('/api/departments/:deptId/sections', (req, res) => {
    try {
        const { deptId } = req.params;
        const data = readDB();
        const department = data.find(d => d.id === deptId);

        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const sections = department.sections.map(sec => ({
            id: sec.id,
            name: sec.name
        }));
        res.json(sections);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sections' });
    }
});

// 4. Get students for a specific section
app.get('/api/departments/:deptId/sections/:secId/students', (req, res) => {
    try {
        const { deptId, secId } = req.params;
        const data = readDB();
        const department = data.find(d => d.id === deptId);

        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const section = department.sections.find(s => s.id === secId);
        if (!section) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const cleanStudents = (section.students || []).map(scrubStudent);
        res.json(cleanStudents);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// 5. Add a new department
app.post('/api/departments', (req, res) => {
    try {
        const newDept = req.body;
        if (!newDept.id || !newDept.name) {
            return res.status(400).json({ error: 'ID and Name are required' });
        }

        const data = readDB();
        data.push({
            ...newDept,
            sections: newDept.sections || []
        });

        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        res.status(201).json(newDept);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add department' });
    }
});

// 6. Add a section to a department
app.post('/api/departments/:deptId/sections', (req, res) => {
    try {
        const { deptId } = req.params;
        const newSection = req.body;
        if (!newSection.id || !newSection.name) {
            return res.status(400).json({ error: 'ID and Name are required' });
        }

        const data = readDB();
        const department = data.find(d => d.id === deptId);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        if (!department.sections) department.sections = [];
        department.sections.push({
            ...newSection,
            students: newSection.students || []
        });

        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        res.status(201).json(newSection);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add section' });
    }
});

// 7. Add a student to a section
app.post('/api/departments/:deptId/sections/:secId/students', (req, res) => {
    try {
        const { deptId, secId } = req.params;
        const newStudent = req.body;
        if (!newStudent.id || !newStudent.name) {
            return res.status(400).json({ error: 'ID and Name are required' });
        }

        const data = readDB();
        const department = data.find(d => d.id === deptId);
        if (!department) return res.status(404).json({ error: 'Department not found' });

        const section = department.sections.find(s => s.id === secId);
        if (!section) return res.status(404).json({ error: 'Section not found' });

        if (!section.students) section.students = [];
        section.students.push(newStudent);

        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        res.status(201).json(scrubStudent(newStudent));
    } catch (error) {
        res.status(500).json({ error: 'Failed to add student' });
    }
});

const axios = require('axios');
const FIREBASE_URL = 'https://campusaccessbackend-default-rtdb.asia-southeast1.firebasedatabase.app/';

// 8. Get Dropdown Data (Departments & Sections for User App)
app.get('/api/dropdown-data', async (req, res) => {
    try {
        const response = await axios.get(`${FIREBASE_URL}/departments.json`);
        const data = response.data;
        if (!data) return res.json([]);

        const dropdownData = Object.keys(data).map(deptKey => {
            const dept = data[deptKey];
            const sections = dept.sections ? Object.keys(dept.sections).map(secKey => ({
                id: secKey,
                name: dept.sections[secKey].name
            })) : [];

            return {
                id: deptKey,
                name: dept.name,
                sections: sections
            };
        });

        res.json(dropdownData);
    } catch (error) {
        console.error('Dropdown Data Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch dropdown data' });
    }
});

// Helper to find student with multiple verification fields
const verifyStudentInFirebase = (data, credentials) => {
    if (!data) return null;
    const { name, rollNo, fatherName, email, phone, deptId, secId } = credentials;

    const dept = data[deptId];
    if (!dept) return null;

    const section = dept.sections ? dept.sections[secId] : null;
    if (!section || !section.students) return null;

    // Search for student in the specific section
    for (const stuKey in section.students) {
        const student = section.students[stuKey];

        // Exact matching logic
        if (
            student.id === rollNo &&
            student.name.toLowerCase() === name.toLowerCase() &&
            student.fatherName.toLowerCase() === fatherName.toLowerCase() &&
            student.email.toLowerCase() === email.toLowerCase() &&
            student.phone === phone
        ) {
            return { student, deptName: dept.name, secName: section.name };
        }
    }
    return null;
};

// 9. User Login (for User App)
app.post('/api/login', async (req, res) => {
    try {
        const credentials = req.body;
        // Basic check for required fields
        const required = ['name', 'rollNo', 'fatherName', 'email', 'phone', 'deptId', 'secId'];
        for (const field of required) {
            if (!credentials[field]) {
                return res.status(400).json({
                    status: "error",
                    message: `${field} is required`,
                    data: null
                });
            }
        }

        const response = await axios.get(`${FIREBASE_URL}/departments.json`);
        const firebaseData = response.data;

        const result = verifyStudentInFirebase(firebaseData, credentials);

        if (result) {
            const { student, deptName, secName } = result;
            const safeStudent = scrubStudent(student);
            res.json({
                status: "success",
                message: "Login successful",
                data: {
                    name: safeStudent.name,
                    email: safeStudent.email,
                    department: deptName,
                    section: secName,
                    rollNo: safeStudent.id,
                    token: "jwt_token_" + Buffer.from(safeStudent.id).toString('base64')
                }
            });
        } else {
            res.status(401).json({
                status: "error",
                message: "Invalid credentials. Please make sure all details match your registration.",
                data: null
            });
        }
    } catch (error) {
        console.error('Login Error:', error.message);
        res.status(500).json({
            status: "error",
            message: "Internal server error during login verification",
            data: null
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
