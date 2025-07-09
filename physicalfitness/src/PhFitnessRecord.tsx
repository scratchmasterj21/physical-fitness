import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import app from './FirebaseConfig';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


interface Student {
  enname: string;
  jpname: string;
  class: string;
  grade: string;
  gender: 'Boy' | 'Girl';  // Ensuring gender is strictly typed
  '1sttry': Record<string, number>;
  '2ndtry': Record<string, number>;
}

interface ComponentOrder {
  [key:string]: string;
}

const PhFitnessRecord: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState<number | null>(null);
  const [schoolYears, setSchoolYears] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedGrade, setSelectedGrade] = useState<string>('G1A');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  // This effect loads static data (school years and grades) once on component mount.
  useEffect(() => {
    const db = getDatabase(app);
    const yearRef = ref(db, 'schoolyear');
    const gradeRef = ref(db, 'grade');

    // Load school years
    onValue(yearRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSchoolYears(Object.values(data));
      }
    });

    // Load grades
    onValue(gradeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGrades(Object.values(data));
      }
    });
  }, []); // Empty dependency array means this runs only once.

  // This effect is the key to fixing the concurrency issue.
  // It fetches student data for the selected class and correctly manages the listener.
  useEffect(() => {
    const db = getDatabase(app);
    const studentsRef = ref(db, `${selectedSchoolYear}/${selectedGrade}`);

    // onValue returns an 'unsubscribe' function which we'll use for cleanup.
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      const studentList: Student[] = [];
      if (data) {
        const sortedStudents = Object.entries(data)
          .sort(([key1], [key2]) => {
            const num1 = parseInt(key1.match(/\d+$/)?.[0] || '0', 10);
            const num2 = parseInt(key2.match(/\d+$/)?.[0] || '0', 10);
            return num1 - num2;
          })
          .map(([, studentData]) => studentData as Student);
        studentList.push(...sortedStudents);
      }
      setStudents(studentList);
      // When the class changes, reset the view to the student list.
      setCurrentStudentIndex(null);
      setHasUnsavedChanges(false);
      setLastSavedTime(null);
      setSearchTerm('');
    });

    // This cleanup function is called by React before the effect re-runs or when the component unmounts.
    // It detaches the listener from the PREVIOUS grade's data path, preventing cross-talk between users.
    return () => {
      unsubscribe();
    };
  }, [selectedSchoolYear, selectedGrade]); // Re-run this effect whenever the school year or grade changes.


  // Add keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (currentStudentIndex === null) return;
      
      if (event.key === 'ArrowLeft' && currentStudentIndex > 0) {
        handleStudentSelect(currentStudentIndex - 1);
      } else if (event.key === 'ArrowRight' && currentStudentIndex < students.length - 1) {
        handleStudentSelect(currentStudentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStudentIndex, students.length]);

  // Auto-focus first input when student changes
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [currentStudentIndex]);

    // Handlers for dropdowns to prevent losing unsaved data
    const handleSchoolYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (hasUnsavedChanges && !window.confirm('You have unsaved changes that will be lost. Are you sure you want to switch?')) {
            // If the user clicks "Cancel", we do nothing, keeping the old selection.
            e.target.value = selectedSchoolYear; // Revert visual change if necessary
            return;
        }
        setSelectedSchoolYear(e.target.value);
    };

    const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (hasUnsavedChanges && !window.confirm('You have unsaved changes that will be lost. Are you sure you want to switch?')) {
            e.target.value = selectedGrade; // Revert visual change if necessary
            return;
        }
        setSelectedGrade(e.target.value);
    };

const exportGradeToIndividualWorkbooks = async (students: Student[], selectedGrade: string) => {
    const zip = new JSZip(); // Create a new instance of JSZip
    let i = 1;
    for (const student of students) {
      const workbook = new ExcelJS.Workbook(); // Create a new workbook for each student
      const worksheet = workbook.addWorksheet('Grade ' + student.class.slice(1,-1)); // Add a worksheet named 'Report'
  
      // Define your styles and other setup just like before...
      // For simplicity, I am skipping directly to the file creation part
  
      // Define header style
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { size: 22 },
        alignment: { 
            horizontal: 'center' as 'center', // Explicitly typed as 'center'
            vertical: 'middle' as 'middle'  // Explicitly typed as 'middle'
        },
        border: {
            bottom: { style: 'thick' as 'thick' } // Explicitly typed as 'thick'
        }
    };

    const dataStyle: Partial<ExcelJS.Style> = {
      font: { size: 14 },
      alignment: {
          horizontal: 'center' as 'center',  // Explicitly typed as 'center'
          vertical: 'middle' as 'middle',    // Explicitly typed as 'middle'
          wrapText: true
      },
      border: {
          top: { style: 'thin' as 'thin' },    // Explicitly typed as 'thin'
          left: { style: 'thin' as 'thin' },   // Explicitly typed as 'thin'
          bottom: { style: 'thin' as 'thin' }, // Explicitly typed as 'thin'
          right: { style: 'thin' as 'thin' }   // Explicitly typed as 'thin'
      }
  };

  // Create a left-aligned version of dataStyle for columns C and I
  const leftAlignedDataStyle: Partial<ExcelJS.Style> = {
    font: { size: 14 },
    alignment: {
        horizontal: 'left' as 'left',      // Left aligned instead of center
        vertical: 'middle' as 'middle',
        wrapText: true
    },
    border: {
        top: { style: 'thin' as 'thin' },
        left: { style: 'thin' as 'thin' },
        bottom: { style: 'thin' as 'thin' },
        right: { style: 'thin' as 'thin' }
    }
  };

  // Helper function to apply style based on column
  function applyStyleToCell(cell: ExcelJS.Cell, colNumber: number) {
    if (colNumber === 6 || colNumber === 9) { // Column C = 3, Column I = 9
      cell.style = leftAlignedDataStyle;
    } else {
      cell.style = dataStyle;
    }
  }

      // Header row
      const headerRow0 = worksheet.getCell('A1');
      headerRow0.value = `Physical Fitness Test Results`;
      headerRow0.style = headerStyle;
      worksheet.mergeCells(`A1:J1`);
      
      const headerRow = worksheet.getCell('A2');
      headerRow.value = `Grade`;
      headerRow.style = headerStyle;

      const headerRow2 = worksheet.getCell('B2');
      headerRow2.value = student.class.slice(1,-1);
      headerRow2.style = headerStyle;
      
      const headerRow3 = worksheet.getCell('C2');
      headerRow3.value = `Class`;
      headerRow3.style = headerStyle;

      const headerRow7 = worksheet.getCell('D2');
      headerRow7.style = headerStyle;
      worksheet.mergeCells(`C2:D2`);
      const headerRow4 = worksheet.getCell('E2');
      headerRow4.value = student.class.slice(-1);
      headerRow4.style = headerStyle;

      const headerRow8 = worksheet.getCell('G2');
      headerRow8.style = headerStyle;

      const headerRow5 = worksheet.getCell('F2');
      headerRow5.value = `Name`;
      headerRow5.style = headerStyle;
      worksheet.mergeCells(`G2:F2`);

      const headerRow6 = worksheet.getCell('H2');
      headerRow6.value = i + ' ' + student.enname;
      headerRow6.style = headerStyle;
      worksheet.mergeCells(`H2:J2`);


      // Column headers
      worksheet.addRow(['', '', '']);
      const columnHeaderRow = worksheet.addRow(['Component', '', 'Record', '','','','','','','Score']);
      columnHeaderRow.eachCell((cell, colNumber) => {
        applyStyleToCell(cell, colNumber);
      });

      worksheet.mergeCells(`A4:B4`);
      worksheet.mergeCells(`C4:I4`);


      let totalScore = 0; // Initialize total score
      // Populate the worksheet with student data
      Object.keys(componentOrder).forEach(key => {
          if (key === 'gripStrength') {
              const firstTryR = student['1sttry']['gripstrR'];
              const secondTryR = student['2ndtry']['gripstrR'] ?? firstTryR;
              const firstTryL = student['1sttry']['gripstrL'];
              const secondTryL = student['2ndtry']['gripstrL'] ?? firstTryL;
              const maxGripStrength = Math.max(firstTryR, secondTryR, firstTryL, secondTryL);
              const score = calculateScore("gripStrength", student.gender, maxGripStrength, 0);
              totalScore += score;

              const gripRow1 = worksheet.addRow(['Grip Strength','','R', '1:', `${firstTryR}`, 'kg', '2:',`${secondTryR}`, 'kg', score]);
              gripRow1.eachCell((cell, colNumber) => {
                applyStyleToCell(cell, colNumber);
              });

              const gripRow2 = worksheet.addRow(['Grip Strength','','L', '1:', `${firstTryL}`, 'kg', '2:',`${secondTryL}`, 'kg', score]);
              gripRow2.eachCell((cell, colNumber) => {
                applyStyleToCell(cell, colNumber);
              });

              const gripRow3 = worksheet.addRow(['','','Avg: ', `${maxGripStrength}`,'','','','','kg', '']);
              gripRow3.eachCell((cell, colNumber) => {
                applyStyleToCell(cell, colNumber);
              });

              worksheet.mergeCells(`A5:B7`);
              worksheet.mergeCells(`D7:H7`);
              worksheet.mergeCells(`J5:J7`);


            } else if (key === 'situps' || key === '50msprint'|| key === '20mshuttleruns') {
              const firstTry = student['1sttry'][key];
              const score = calculateScore(key, student.gender, firstTry, 0);
              totalScore += score;


              if (key === 'situps') {
                const row = worksheet.addRow([componentOrder[key], '', `${firstTry}`, '', '', '', '', '', `${getUnitForComponent(key)}`, score]);
                row.eachCell((cell, colNumber) => {
                  applyStyleToCell(cell, colNumber);
                });
                worksheet.mergeCells(`A8:B8`);
                worksheet.mergeCells(`C8:H8`);
              }
              if (key === '50msprint') {
                const row = worksheet.addRow([componentOrder[key], '', `${firstTry}`, '', '', '', '', `${getUnitForComponent(key)}`, '', score]);
                row.eachCell((cell, colNumber) => {
                  applyStyleToCell(cell, colNumber);
                });
                worksheet.mergeCells(`A12:B12`);
                worksheet.mergeCells(`C12:G12`);
                worksheet.mergeCells(`H12:I12`);
                
                // Apply left alignment to the merged H12:I12 cell
                const mergedCell = worksheet.getCell('H12');
                mergedCell.style = leftAlignedDataStyle;

              }

              if (key === '20mshuttleruns') {
                const row = worksheet.addRow([componentOrder[key], '', `${firstTry}`, '', '', '', '', '', `${getUnitForComponent(key)}`, score]);
                row.eachCell((cell, colNumber) => {
                  applyStyleToCell(cell, colNumber);
                });
                worksheet.mergeCells(`A11:B11`);
                worksheet.mergeCells(`C11:H11`);
            
              }
            } else {
              const firstTry = student['1sttry'][key];
              const secondTry = student['2ndtry'][key] ?? firstTry;
              const score = calculateScore(key, student.gender, firstTry, secondTry);
              totalScore += score;
           
              const row = worksheet.addRow([componentOrder[key],'','', '1:', firstTry, getUnitForComponent(key), '2:', secondTry, getUnitForComponent(key), score]);
              row.eachCell((cell, colNumber) => {
                applyStyleToCell(cell, colNumber);
              });

              if (key === 'seatedtoetouch') {
                worksheet.mergeCells(`A9:B9`);
              }
              if (key === 'sidesteps') {
                worksheet.mergeCells(`A10:B10`);
              }
              if (key === 'longjump') {
                worksheet.mergeCells(`A13:B13`);
              }
              if (key === 'softballthrowing') {
                worksheet.mergeCells(`A14:B14`);
              }
            }
      });

      // Total Score and Grade
      const grade = determineGrade(totalScore, student.class);
      const totalRow = worksheet.addRow(['Total Score', '', '','','','','','','',totalScore]);
      totalRow.eachCell((cell, colNumber) => {
        applyStyleToCell(cell, colNumber);
      });
      worksheet.mergeCells(`A15:I15`);

      const gradeRow = worksheet.addRow(['Grade', '', '','','','','','','',grade]);
      gradeRow.eachCell((cell, colNumber) => {
        applyStyleToCell(cell, colNumber);
      });
      worksheet.mergeCells(`A16:I16`);

      setManualColumnWidths(worksheet);
      
      // (Add your student data to the worksheet here, same as your previous code)
  
      // Convert workbook to a buffer and add to the zip file
      const buffer = await workbook.xlsx.writeBuffer();
      zip.file(`${i} ${student.enname}.xlsx`, buffer);
      i++;
    }
  
    // Generate the ZIP file and trigger download
    const zipBuffer = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBuffer, `Grade_${selectedGrade}_Reports.zip`);
  };

function setManualColumnWidths(worksheet: ExcelJS.Worksheet): void {
  // Manually setting each column width
  // worksheet.getColumn('A').width = 12.11;
  worksheet.getColumn('A').width = 13.5;
  worksheet.getColumn('B').width = 7.67;
  // worksheet.getColumn('C').width = 5.44;
  worksheet.getColumn('C').width = 6;
  worksheet.getColumn('D').width = 4.22;
  worksheet.getColumn('E').width = 6.78;
  // worksheet.getColumn('F').width = 6.22;
  worksheet.getColumn('F').width = 7.5;
  worksheet.getColumn('G').width = 4.00;
  worksheet.getColumn('H').width = 8;
  worksheet.getColumn('I').width = 15;
  worksheet.getColumn('J').width = 16;
}

const exportGradeToSingleWorkbook = async (students: Student[], selectedGrade: string) => {
  const workbook = new ExcelJS.Workbook();  // Create a new workbook
  let i = 1;

  students.forEach((student, index) => {
      const worksheet = workbook.addWorksheet(`${index + 1} ${student.enname}`);  // Add a worksheet for each student

      // Define header style
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { size: 22 },
        alignment: { 
            horizontal: 'center' as 'center', // Explicitly typed as 'center'
            vertical: 'middle' as 'middle'  // Explicitly typed as 'middle'
        },
        border: {
            bottom: { style: 'thick' as 'thick' } // Explicitly typed as 'thick'
        }
    };

    const dataStyle: Partial<ExcelJS.Style> = {
      font: { size: 14 },
      alignment: {
          horizontal: 'center' as 'center',  // Explicitly typed as 'center'
          vertical: 'middle' as 'middle',    // Explicitly typed as 'middle'
          wrapText: true
      },
      border: {
          top: { style: 'thin' as 'thin' },    // Explicitly typed as 'thin'
          left: { style: 'thin' as 'thin' },   // Explicitly typed as 'thin'
          bottom: { style: 'thin' as 'thin' }, // Explicitly typed as 'thin'
          right: { style: 'thin' as 'thin' }   // Explicitly typed as 'thin'
      }
  };

  // Create a left-aligned version of dataStyle for columns C and I
  const leftAlignedDataStyle: Partial<ExcelJS.Style> = {
    font: { size: 14 },
    alignment: {
        horizontal: 'left' as 'left',      // Left aligned instead of center
        vertical: 'middle' as 'middle',
        wrapText: true
    },
    border: {
        top: { style: 'thin' as 'thin' },
        left: { style: 'thin' as 'thin' },
        bottom: { style: 'thin' as 'thin' },
        right: { style: 'thin' as 'thin' }
    }
  };

  // Helper function to apply style based on column
  function applyStyleToCell(cell: ExcelJS.Cell, colNumber: number) {
    if (colNumber === 6 || colNumber === 9) { // Column C = 3, Column I = 9
      cell.style = leftAlignedDataStyle;
    } else {
      cell.style = dataStyle;
    }
  }

      // Header row
      const headerRow0 = worksheet.getCell('A1');
      headerRow0.value = `Physical Fitness Test Results`;
      headerRow0.style = headerStyle;
      worksheet.mergeCells(`A1:J1`);

      const headerRow = worksheet.getCell('A2');
      headerRow.value = `Grade`;
      headerRow.style = headerStyle;

      const headerRow2 = worksheet.getCell('B2');
      headerRow2.value = student.class.slice(1,-1);
      headerRow2.style = headerStyle;
      
      const headerRow3 = worksheet.getCell('C2');
      headerRow3.value = `Class`;
      headerRow3.style = headerStyle;

      const headerRow7 = worksheet.getCell('D2');
      headerRow7.style = headerStyle;
      worksheet.mergeCells(`C2:D2`);
      const headerRow4 = worksheet.getCell('E2');
      headerRow4.value = student.class.slice(-1);
      headerRow4.style = headerStyle;

      const headerRow8 = worksheet.getCell('G2');
      headerRow8.style = headerStyle;

      const headerRow5 = worksheet.getCell('F2');
      headerRow5.value = `Name`;
      headerRow5.style = headerStyle;
      worksheet.mergeCells(`G2:F2`);

      const headerRow6 = worksheet.getCell('H2');
      headerRow6.value = i + ' ' + student.enname;
      headerRow6.style = headerStyle;
      worksheet.mergeCells(`H2:J2`);


      // Column headers
      worksheet.addRow(['', '', '']);
      const columnHeaderRow = worksheet.addRow(['Component', '', 'Record', '','','','','','','Score']);
      columnHeaderRow.eachCell((cell, colNumber) => {
        applyStyleToCell(cell, colNumber);
      });

      worksheet.mergeCells(`A4:B4`);
      worksheet.mergeCells(`C4:I4`);


      let totalScore = 0; // Initialize total score
      // Populate the worksheet with student data
      Object.keys(componentOrder).forEach(key => {
          if (key === 'gripStrength') {
              const firstTryR = student['1sttry']['gripstrR'];
              const secondTryR = student['2ndtry']['gripstrR'] ?? firstTryR;
              const firstTryL = student['1sttry']['gripstrL'];
              const secondTryL = student['2ndtry']['gripstrL'] ?? firstTryL;
              const maxGripStrength = Math.max(firstTryR, secondTryR, firstTryL, secondTryL);
              const score = calculateScore("gripStrength", student.gender, maxGripStrength, 0);
              totalScore += score;

              const gripRow1 = worksheet.addRow(['Grip Strength','','R', '1:', `${firstTryR}`, 'kg', '2:',`${secondTryR}`, 'kg', score]);
              gripRow1.eachCell((cell, colNumber) => {
                applyStyleToCell(cell, colNumber);
              });

              const gripRow2 = worksheet.addRow(['Grip Strength','','L', '1:', `${firstTryL}`, 'kg', '2:',`${secondTryL}`, 'kg', score]);
              gripRow2.eachCell((cell, colNumber) => {
                applyStyleToCell(cell, colNumber);
              });

              const gripRow3 = worksheet.addRow(['','','Avg: ', `${maxGripStrength}`,'','','','','kg', '']);
              gripRow3.eachCell((cell, colNumber) => {
                applyStyleToCell(cell, colNumber);
              });

              worksheet.mergeCells(`A5:B7`);
              worksheet.mergeCells(`D7:H7`);
              worksheet.mergeCells(`J5:J7`);


            } else if (key === 'situps' || key === '50msprint'|| key === '20mshuttleruns') {
              const firstTry = student['1sttry'][key];
              const score = calculateScore(key, student.gender, firstTry, 0);
              totalScore += score;


              if (key === 'situps') {
                const row = worksheet.addRow([componentOrder[key], '', `${firstTry}`, '', '', '', '', '', `${getUnitForComponent(key)}`, score]);
                row.eachCell((cell, colNumber) => {
                  applyStyleToCell(cell, colNumber);
                });
                worksheet.mergeCells(`A8:B8`);
                worksheet.mergeCells(`C8:H8`);
              }
              if (key === '50msprint') {
                const row = worksheet.addRow([componentOrder[key], '', `${firstTry}`, '', '', '', '', `${getUnitForComponent(key)}`, '', score]);
                row.eachCell((cell, colNumber) => {
                  applyStyleToCell(cell, colNumber);
                });
                worksheet.mergeCells(`A12:B12`);
                worksheet.mergeCells(`C12:G12`);
                worksheet.mergeCells(`H12:I12`);
                
                // Apply left alignment to the merged H12:I12 cell
                const mergedCell = worksheet.getCell('H12');
                mergedCell.style = leftAlignedDataStyle;

              }

              if (key === '20mshuttleruns') {
                const row = worksheet.addRow([componentOrder[key], '', `${firstTry}`, '', '', '', '', '', `${getUnitForComponent(key)}`, score]);
                row.eachCell((cell, colNumber) => {
                  applyStyleToCell(cell, colNumber);
                });
                worksheet.mergeCells(`A11:B11`);
                worksheet.mergeCells(`C11:H11`);
            
              }
            } else {
              const firstTry = student['1sttry'][key];
              const secondTry = student['2ndtry'][key] ?? firstTry;
              const score = calculateScore(key, student.gender, firstTry, secondTry);
              totalScore += score;
           
              const row = worksheet.addRow([componentOrder[key],'','', '1:', firstTry, getUnitForComponent(key), '2:', secondTry, getUnitForComponent(key), score]);
              row.eachCell((cell, colNumber) => {
                applyStyleToCell(cell, colNumber);
              });

              if (key === 'seatedtoetouch') {
                worksheet.mergeCells(`A9:B9`);
              }
              if (key === 'sidesteps') {
                worksheet.mergeCells(`A10:B10`);
              }
              if (key === 'longjump') {
                worksheet.mergeCells(`A13:B13`);
              }
              if (key === 'softballthrowing') {
                worksheet.mergeCells(`A14:B14`);
              }
            }
      });

      // Total Score and Grade
      const grade = determineGrade(totalScore, student.class);
      const totalRow = worksheet.addRow(['Total Score', '', '','','','','','','',totalScore]);
      totalRow.eachCell((cell, colNumber) => {
        applyStyleToCell(cell, colNumber);
      });
      worksheet.mergeCells(`A15:I15`);

      const gradeRow = worksheet.addRow(['Grade', '', '','','','','','','',grade]);
      gradeRow.eachCell((cell, colNumber) => {
        applyStyleToCell(cell, colNumber);
      });
      worksheet.mergeCells(`A16:I16`);

      setManualColumnWidths(worksheet);
      i++;
  });
  

  // Write the workbook to a file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Grade_${selectedGrade}_Reports.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

  interface GenderScores {
    Boy: ScoreRange[];
    Girl: ScoreRange[];
  }
  
  interface ScoringTables {
    [component: string]: GenderScores;
  }
  

  const scoringTables: ScoringTables = {
    gripStrength: {
      Boy: [
        { min: 26, max: 100, score: 10 },
        { min: 23, max: 25, score: 9 },
        { min: 20, max: 22, score: 8 },
        { min: 17, max: 19, score: 7 },
        { min: 14, max: 16, score: 6 },
        { min: 11, max: 13, score: 5 },
        { min: 9, max: 10, score: 4 },
        { min: 7, max: 8, score: 3 },
        { min: 5, max: 6, score: 2 },
        { min: 4, max: 4, score: 1 }
      ],
      Girl: [
        { min: 25, max: 100, score: 10 },
        { min: 22, max: 24, score: 9 },
        { min: 19, max: 21, score: 8 },
        { min: 16, max: 18, score: 7 },
        { min: 13, max: 15, score: 6 },
        { min: 11, max: 12, score: 5 },
        { min: 9, max: 10, score: 4 },
        { min: 7, max: 8, score: 3 },
        { min: 4, max: 6, score: 2 },
        { min: 3, max: 3, score: 1 }
      ]
    },
    situps: {
      Boy: [
          { min: 26, max: Infinity, score: 10 },
          { min: 23, max: 25, score: 9 },
          { min: 20, max: 22, score: 8 },
          { min: 18, max: 19, score: 7 },
          { min: 15, max: 17, score: 6 },
          { min: 12, max: 14, score: 5 },
          { min: 10, max: 11, score: 4 },
          { min: 6, max: 9, score: 3 },
          { min: 3, max: 5, score: 2 },
          { min: 2, max: 2, score: 1 }
      ],
      Girl: [
          { min: 23, max: Infinity, score: 10 },
          { min: 20, max: 22, score: 9 },
          { min: 18, max: 19, score: 8 },
          { min: 16, max: 17, score: 7 },
          { min: 14, max: 15, score: 6 },
          { min: 12, max: 13, score: 5 },
          { min: 10, max: 11, score: 4 },
          { min: 6, max: 9, score: 3 },
          { min: 3, max: 5, score: 2 },
          { min: 2, max: 2, score: 1 }
      ]
  },
  seatedtoetouch: {
    Boy: [
        { min: 49, max: Infinity, score: 10 },
        { min: 43, max: 48, score: 9 },
        { min: 38, max: 42, score: 8 },
        { min: 34, max: 37, score: 7 },
        { min: 30, max: 33, score: 6 },
        { min: 27, max: 29, score: 5 },
        { min: 23, max: 26, score: 4 },
        { min: 19, max: 22, score: 3 },
        { min: 15, max: 18, score: 2 },
        { min: 14, max: 14, score: 1 }
    ],
    Girl: [
        { min: 52, max: Infinity, score: 10 },
        { min: 46, max: 51, score: 9 },
        { min: 41, max: 45, score: 8 },
        { min: 37, max: 40, score: 7 },
        { min: 33, max: 36, score: 6 },
        { min: 29, max: 32, score: 5 },
        { min: 24, max: 28, score: 4 },
        { min: 21, max: 23, score: 3 },
        { min: 18, max: 20, score: 2 },
        { min: 17, max: 17, score: 1 }
    ]
},
sidesteps: {
  Boy: [
      { min: 50, max: Infinity, score: 10 },
      { min: 46, max: 49, score: 9 },
      { min: 42, max: 45, score: 8 },
      { min: 38, max: 41, score: 7 },
      { min: 34, max: 37, score: 6 },
      { min: 30, max: 33, score: 5 },
      { min: 26, max: 29, score: 4 },
      { min: 22, max: 25, score: 3 },
      { min: 18, max: 21, score: 2 },
      { min: 1, max: 17, score: 1 }
  ],
  Girl: [
      { min: 47, max: Infinity, score: 10 },
      { min: 43, max: 46, score: 9 },
      { min: 40, max: 42, score: 8 },
      { min: 36, max: 39, score: 7 },
      { min: 32, max: 35, score: 6 },
      { min: 28, max: 31, score: 5 },
      { min: 25, max: 27, score: 4 },
      { min: 21, max: 24, score: 3 },
      { min: 17, max: 20, score: 2 },
      { min: 1, max: 16, score: 1 }
  ]
},    
"20mshuttleruns": {
  Boy: [
      { min: 80, max: Infinity, score: 10 },
      { min: 69, max: 79, score: 9 },
      { min: 57, max: 68, score: 8 },
      { min: 45, max: 56, score: 7 },
      { min: 33, max: 44, score: 6 },
      { min: 23, max: 32, score: 5 },
      { min: 15, max: 22, score: 4 },
      { min: 10, max: 14, score: 3 },
      { min: 8, max: 9, score: 2 },
      { min: 1, max: 7, score: 1 }
  ],
  Girl: [
      { min: 64, max: Infinity, score: 10 },
      { min: 54, max: 63, score: 9 },
      { min: 44, max: 53, score: 8 },
      { min: 35, max: 43, score: 7 },
      { min: 26, max: 34, score: 6 },
      { min: 19, max: 25, score: 5 },
      { min: 14, max: 18, score: 4 },
      { min: 10, max: 13, score: 3 },
      { min: 8, max: 9, score: 2 },
      { min: 1, max: 7, score: 1 }
  ]
}, 
"50msprint": {
  Boy: [
      { min: 1, max: 8.0, score: 10 },
      { min: 8.1, max: 8.4, score: 9 },
      { min: 8.5, max: 8.8, score: 8 },
      { min: 8.9, max: 9.3, score: 7 },
      { min: 9.4, max: 9.9, score: 6 },
      { min: 10.0, max: 10.6, score: 5 },
      { min: 10.7, max: 11.4, score: 4 },
      { min: 11.5, max: 12.2, score: 3 },
      { min: 12.3, max: 13.0, score: 2 },
      { min: 13.1, max: Infinity, score: 1 }
  ],
  Girl: [
      { min: 1, max: 8.3, score: 10 },
      { min: 8.4, max: 8.7, score: 9 },
      { min: 8.8, max: 9.1, score: 8 },
      { min: 9.2, max: 9.6, score: 7 },
      { min: 9.7, max: 10.2, score: 6 },
      { min: 10.3, max: 10.9, score: 5 },
      { min: 11.0, max: 11.6, score: 4 },
      { min: 11.7, max: 12.4, score: 3 },
      { min: 12.5, max: 13.2, score: 2 },
      { min: 13.3, max: Infinity, score: 1 }
  ]
}, 
longjump: {
  Boy: [
      { min: 192, max: Infinity, score: 10 },
      { min: 180, max: 191, score: 9 },
      { min: 168, max: 179, score: 8 },
      { min: 156, max: 167, score: 7 },
      { min: 143, max: 155, score: 6 },
      { min: 130, max: 142, score: 5 },
      { min: 117, max: 129, score: 4 },
      { min: 105, max: 116, score: 3 },
      { min: 93, max: 104, score: 2 },
      { min: 1, max: 92, score: 1 }
  ],
  Girl: [
      { min: 181, max: Infinity, score: 10 },
      { min: 170, max: 180, score: 9 },
      { min: 160, max: 169, score: 8 },
      { min: 147, max: 159, score: 7 },
      { min: 134, max: 146, score: 6 },
      { min: 121, max: 133, score: 5 },
      { min: 109, max: 120, score: 4 },
      { min: 98, max: 108, score: 3 },
      { min: 85, max: 97, score: 2 },
      { min: 1, max: 84, score: 1 }
  ]
}, 
softballthrowing: {
  Boy: [
      { min: 40, max: Infinity, score: 10 },
      { min: 35, max: 39, score: 9 },
      { min: 30, max: 34, score: 8 },
      { min: 24, max: 29, score: 7 },
      { min: 18, max: 23, score: 6 },
      { min: 13, max: 17, score: 5 },
      { min: 10, max: 12, score: 4 },
      { min: 7, max: 9, score: 3 },
      { min: 4, max: 6, score: 2 },
      { min: 1, max: 3, score: 1 }
  ],
  Girl: [
      { min: 25, max: Infinity, score: 10 },
      { min: 21, max: 24, score: 9 },
      { min: 17, max: 20, score: 8 },
      { min: 14, max: 16, score: 7 },
      { min: 11, max: 13, score: 6 },
      { min: 8, max: 10, score: 5 },
      { min: 6, max: 7, score: 4 },
      { min: 4, max: 5, score: 3 },
      { min: 2, max: 3, score: 2 },
      { min: 1, max: 1, score: 1 }
  ]
}


};
  

  interface ScoreRange {
    min: number;
    max: number;
    score: number;
  }

const calculateScore = (component: string, gender: 'Boy' | 'Girl', firstTry: number, secondTry: number): number => {
  const ranges: ScoreRange[] = scoringTables[component][gender];

  if (component === '50msprint') {
    // Since faster is better, find the highest score for the lowest range that matches
    const truncateToOneDecimal = (num: number) => Math.floor(num * 10) / 10;
    const truncatedFirstTry = truncateToOneDecimal(firstTry);

    const foundRange = ranges.find(range => truncatedFirstTry <= range.max && truncatedFirstTry >= range.min);
    
    return foundRange ? foundRange.score : 0;  // Return a score of 0 if no range matches
} else {
    // For other components, logic might be different (not necessarily lower is better)
    const result = Math.max(firstTry, secondTry); // Use the best of two tries

    const foundRange = ranges.find(range => result >= range.min && result <= range.max);
    return foundRange ? foundRange.score : 0;  // Return a score of 0 if no range matches
}
};

const gradeThresholds: { [key: string]: number[] } = {
  G1: [39, 33, 27, 22, 2],
  G2: [47, 41, 34, 27, 26],
  G3: [53, 46, 39, 32, 31],
  G4: [59, 52, 45, 38, 37],
  G5: [65, 58, 50, 42, 41],
  G6: [71, 63, 55, 46, 45]
};


const determineGrade = (totalScore: number, gradeLevel: string): string => {
  const thresholds = gradeThresholds[gradeLevel.slice(0, 2)]; // Assuming gradeLevel is like "G1A"
  for (let i = 0; i < thresholds.length; i++) {
    if (totalScore >= thresholds[i]) {
      return String.fromCharCode(65 + i); // Converts 0 -> 'A', 1 -> 'B', etc.
    }
  }
  return 'E'; // Return 'F' if no threshold is met
};

const componentOrder: ComponentOrder = {
  "gripStrength": "Grip Strength", // Ensure this is correctly named as it appears in the student's data
  "situps": "Sit-ups",
  "seatedtoetouch": "Seated Toe Touch",
  "sidesteps": "Side Steps",
  "20mshuttleruns": "20 m Shuttle Runs",
  "50msprint": "50 m Sprint",
  "longjump": "Long Jump",
  "softballthrowing": "Softball Throwing"
};

const renderGripStrength = (student: Student) => {
  const maxGripStrength = Math.max(
      student['1sttry']['gripstrR'], student['2ndtry']['gripstrR'],
      student['1sttry']['gripstrL'], student['2ndtry']['gripstrL']
  );
  const score = calculateScore("gripStrength", student.gender, maxGripStrength, 0);

  return (
    <tr key="Grip Strength">
      <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Grip Strength</td>
      <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="space-y-2">
          <div>
            <strong>R: 1:</strong>
            <input
              ref={firstInputRef}
              className="text-center w-16 border border-slate-400 rounded px-1 mx-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              value={student['1sttry']['gripstrR']}
              onChange={(e) => handleInputChange(e, 'gripstrR', '1sttry')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input');
                  if (nextInput) nextInput.focus();
                }
              }}
            />
            kg
            <strong className="ml-2">2:</strong>
            <input
              className="text-center w-16 border border-slate-400 rounded px-1 mx-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              value={student['2ndtry']['gripstrR']}
              onChange={(e) => handleInputChange(e, 'gripstrR', '2ndtry')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input');
                  if (nextInput) nextInput.focus();
                }
              }}
            />
            kg
          </div>
          <div>
            <strong>L: 1:</strong>
            <input
              className="text-center w-16 border border-slate-400 rounded px-1 mx-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              value={student['1sttry']['gripstrL']}
              onChange={(e) => handleInputChange(e, 'gripstrL', '1sttry')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input');
                  if (nextInput) nextInput.focus();
                }
              }}
            />
            kg
            <strong className="ml-2">2:</strong>
            <input
              className="text-center w-16 border border-slate-400 rounded px-1 mx-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              value={student['2ndtry']['gripstrL']}
              onChange={(e) => handleInputChange(e, 'gripstrL', '2ndtry')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input');
                  if (nextInput) nextInput.focus();
                }
              }}
            />
            kg
          </div>
          <div>
            <strong>Avg:</strong> {maxGripStrength} kg
          </div>
        </div>
      </td>
      <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm text-gray-500">{score}</td>
    </tr>
  );
};


function getUnitForComponent(component: string) {
  switch (component) {
    case '50msprint':
      return 'seconds';  // Correct unit for sprinting events
    case 'longjump':
    case 'seatedtoetouch':
      return 'cm';  // Distance measurements in centimeters
    case 'softballthrowing':
      return 'm';  // Distance measurements in meters
    default:
      return 'times';  // Default unit for countable exercises like sit-ups
  }
}

const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, type: string, tryNumber: '1sttry' | '2ndtry') => {
  if (currentStudentIndex === null) return;
  
  const updatedStudents = students.map((student, index) => {
    if (index === currentStudentIndex) {
      return { 
        ...student, 
        [tryNumber]: { ...student[tryNumber], [type]: Number(event.target.value) } 
      };
    }
    return student;
  });
  setStudents(updatedStudents);
  setHasUnsavedChanges(true);
};

const saveCurrentStudent = async () => {
  if (!hasUnsavedChanges || currentStudentIndex === null) return;

  setIsSaving(true);
  const db = getDatabase(app);
  const studentRef = ref(db, `${selectedSchoolYear}/${selectedGrade}/student${currentStudentIndex + 1}`);
  
  try {
    await update(studentRef, {
    '1sttry': students[currentStudentIndex]['1sttry'],
    '2ndtry': students[currentStudentIndex]['2ndtry'],
    });
    setHasUnsavedChanges(false);
    setLastSavedTime(new Date());
  } catch (error) {
    console.error('Error saving student data:', error);
    // You might want to show an error message to the user here
  } finally {
    setIsSaving(false);
  }
};

const saveAllChanges = async () => {
  if (!hasUnsavedChanges) return;
  
  setIsSaving(true);
  const db = getDatabase(app);
  
  try {
    const updates = students.reduce((acc, student, index) => {
      acc[`${selectedSchoolYear}/${selectedGrade}/student${index + 1}`] = {
        '1sttry': student['1sttry'],
        '2ndtry': student['2ndtry'],
      };
      return acc;
    }, {} as Record<string, any>);
    
    await update(ref(db), updates);
    setHasUnsavedChanges(false);
  } catch (error) {
    console.error('Error saving all student data:', error);
    // You might want to show an error message to the user here
  } finally {
    setIsSaving(false);
  }
};

const renderEditView = (student: Student) => {
  if (!student) return null;
  
  let totalScore = 0;
  const componentRows = [
    renderGripStrength(student)
  ];
  totalScore += renderGripStrength(student).props.children[2].props.children;

  Object.keys(componentOrder).forEach((component) => {
    if (component !== "gripStrength") {
      const firstTry = student['1sttry'][component];
      const secondTry = student['2ndtry'][component] ?? firstTry;
      const score = calculateScore(component, student.gender, firstTry, secondTry);
      totalScore += score;
      componentRows.push(
        <tr key={component}>
          <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{componentOrder[component]}</td>
          <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {component === 'situps' || component === '20mshuttleruns' ? (
              <>
                <input className="text-center w-14 border  border-slate-400" type="number" value={firstTry} onChange={(e) => handleInputChange(e, component, '1sttry')} /> {getUnitForComponent(component)}
              </>
            ) : component === '50msprint' ? (
              <>
                <input className="text-center w-14 border  border-slate-400" type="number" step="0.01" value={firstTry} onChange={(e) => handleInputChange(e, component, '1sttry')} /> {getUnitForComponent(component)}
              </>
            ) : (
              <>
                <b>1:</b> <input className="text-center w-12 border border-slate-400" type="number" value={firstTry} onChange={(e) => handleInputChange(e, component, '1sttry')} /> {getUnitForComponent(component)}
                , <b>2:</b> <input className="text-center w-12 border border-slate-400" type="number" value={secondTry} onChange={(e) => handleInputChange(e, component, '2ndtry')} /> {getUnitForComponent(component)}
              </>
            )}
          </td>
          <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm text-gray-500">{score}</td>
        </tr>
      );
    }
  });

  // Append non-editable Total Score and Grade rows
  componentRows.push(
    <tr key="totalScore">
      <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" colSpan={2}>Total Score</td>
      <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm text-gray-500">{totalScore}</td>
    </tr>,
    <tr key="grade">
      <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" colSpan={2}>Grade</td>
      <td className="border border-slate-400 px-6 py-4 whitespace-nowrap text-sm text-gray-500">{determineGrade(totalScore, student.class)}</td>
    </tr>
  );

  return componentRows;
};

const handleStudentSelect = async (index: number) => {
  if (hasUnsavedChanges && currentStudentIndex !== null) {
    await saveCurrentStudent();
  }
  setCurrentStudentIndex(index);
};

const handleBackToList = async () => {
  if (hasUnsavedChanges && currentStudentIndex !== null) {
    await saveCurrentStudent();
  }
  setCurrentStudentIndex(null);
};

const filteredStudents = students.filter(student => 
  student.enname.toLowerCase().includes(searchTerm.toLowerCase()) ||
  student.jpname.toLowerCase().includes(searchTerm.toLowerCase())
);

const renderStudentList = () => (
  <div className="mt-28 p-4">
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">English Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Japanese Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map((student, index) => (
              <tr 
                key={index}
                onClick={() => handleStudentSelect(index)}
                className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.enname}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.jpname}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.gender}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.class}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white p-4 shadow-md fixed top-0 left-0 right-0 z-10">
        <div className="flex justify-center items-center space-x-4">
          <div>
            <label className="text-gray-700 font-bold">School Year</label>
            <select
              className="form-select block mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              value={selectedSchoolYear}
              onChange={handleSchoolYearChange}
            >
              {schoolYears.map((year, idx) => (
                <option key={idx} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-700 font-bold">Grade</label>
            <select
              className="form-select block mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              value={selectedGrade}
              onChange={handleGradeChange}
            >
              {grades.map((grade, idx) => (
                <option key={idx} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

        </div>
        <div className="mt-5 flex justify-center items-center space-x-4">
          <button 
            className="btn btn-primary bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200" 
            onClick={() => exportGradeToIndividualWorkbooks(students, selectedGrade)}
          >
          Export to Zip
          </button>
          <button 
            className="btn btn-primary bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200" 
            onClick={() => exportGradeToSingleWorkbook(students, selectedGrade)}
          >
            Export to Excel
              </button>
          {hasUnsavedChanges && currentStudentIndex !== null && (
            <button 
              className="btn btn-primary bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200" 
              onClick={saveAllChanges}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save All Changes'}
              </button>
              )}      
            </div>
      </div>

      <div className="flex-grow">
        {currentStudentIndex === null ? (
          renderStudentList()
        ) : (
          <div className="p-4">
            <div className="flex justify-center items-center mt-28 mb-4">
              <button 
                onClick={handleBackToList}
                className="text-white bg-gray-500 hover:bg-gray-600 font-bold py-2 px-4 rounded mr-5 transition-colors duration-200"
                disabled={isSaving}
              >
                ← Back to List
              </button>
              {currentStudentIndex !== null && students[currentStudentIndex] && (
                <>
              <span className="font-bold text-lg mr-5">Grade: {students[currentStudentIndex].class.slice(0,2)}</span>
              <span className="font-bold text-lg mr-5">Class: {students[currentStudentIndex].class.slice(2)}</span>
              <span className="font-bold text-lg mr-5">Gender: {students[currentStudentIndex].gender}</span>
              <span className="font-bold text-lg mr-5">{currentStudentIndex + 1} {students[currentStudentIndex].enname}</span>
                </>
              )}
              {hasUnsavedChanges && (
                <span className="ml-4 text-yellow-600">
                  * Unsaved changes
                </span>
              )}
              {lastSavedTime && !hasUnsavedChanges && (
                <span className="ml-4 text-green-600">
                  Last saved: {lastSavedTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex justify-center">
              {currentStudentIndex !== null && students[currentStudentIndex] && (
                <table className="min-w-fit divide-y divide-gray-200 border border-slate-400 justify-center">
                <thead className="bg-gray-50">
                  <tr>
                      <th className="border border-slate-400 text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                      <th className="border border-slate-400 text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Record</th>
                      <th className="border border-slate-400 text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {renderEditView(students[currentStudentIndex])}
                </tbody>
              </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhFitnessRecord;