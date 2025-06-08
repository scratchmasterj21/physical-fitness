import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import app from './FirebaseConfig';

interface Student {
  enname: string;
  jpname: string;
  firstname: string;
  class: string;
  grade: string;
  gender: 'Boy' | 'Girl';
  teacher: string;
  studentNumber: string;
  '1sttry': Record<string, number>;
  '2ndtry': Record<string, number>;
}

const downloadCSV = (students: Student[], schoolYear: string, grade: string) => {
  const headers = ['enname', 'jpname', 'firstname', 'gender', 'grade', 'class', 'teacher'];
  const csvContent = [headers.join(',')];
  students.forEach((student) => {
    const row = [
      student.enname,
      student.jpname,
      student.firstname,
      student.gender,
      student.grade,
      student.class,
      student.teacher
    ];
    csvContent.push(row.join(','));
  });
  const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `students_${schoolYear}${grade ? '_' + grade : '_all_grades'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const StudentManagement: React.FC = () => {
  const [schoolYears, setSchoolYears] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [students, setStudents] = useState<{ key: string, student: Student }[]>([]);
  const [newYear, setNewYear] = useState('');

  useEffect(() => {
    const db = getDatabase(app);
    const yearRef = ref(db, 'schoolyear');
    const gradeRef = ref(db, 'grade');
    onValue(yearRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSchoolYears(Object.values(data));
    });
    onValue(gradeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setGrades(Object.values(data));
    });
  }, []);

  useEffect(() => {
    const db = getDatabase(app);
    if (selectedGrade === '') {
      const allStudents: { key: string, student: Student }[] = [];
      const promises = grades.map(grade => {
        return new Promise<void>((resolve) => {
          const studentsRef = ref(db, `${selectedSchoolYear}/${grade}`);
          onValue(studentsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              const gradeStudents = Object.entries(data)
                .map(([key, studentData]) => ({ key, student: studentData as Student }));
              allStudents.push(...gradeStudents);
            }
            resolve();
          });
        });
      });
      Promise.all(promises).then(() => {
        setStudents(allStudents);
      });
    } else {
      const studentsRef = ref(db, `${selectedSchoolYear}/${selectedGrade}`);
      onValue(studentsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const sortedStudents = Object.entries(data)
            .map(([key, studentData]) => ({ key, student: studentData as Student }))
            .sort((a, b) => {
              const numA = parseInt(a.key.match(/\d+$/)?.[0] || '0', 10);
              const numB = parseInt(b.key.match(/\d+$/)?.[0] || '0', 10);
              return numA - numB;
            });
          setStudents(sortedStudents);
        } else {
          setStudents([]);
        }
      });
    }
  }, [selectedSchoolYear, selectedGrade, grades]);

  const sortedStudents = [...students].sort((a, b) => {
    const numA = parseInt(a.key.match(/\d+$/)?.[0] || '0', 10);
    const numB = parseInt(b.key.match(/\d+$/)?.[0] || '0', 10);
    return numA - numB;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Management</h1>
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">School Year</label>
                <button className="text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" disabled>
                  Add New Year
                </button>
              </div>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={selectedSchoolYear}
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
              >
                {schoolYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Grade</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="">All Grades</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={() => downloadCSV(students.map(s => s.student), selectedSchoolYear, selectedGrade)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Download CSV
            </button>
            <a
              href="/csv-upload"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Upload CSV
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement; 