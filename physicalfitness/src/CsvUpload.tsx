import { useState } from 'react';
import { getDatabase, ref, set } from 'firebase/database';

interface StudentData {
  enname: string;
  jpname: string;
  firstname: string;
  gender: string;
  grade: string;
  class: string;
  teacher: string;
}

const CsvUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const processCSV = (csvData: string): StudentData[] => {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(value => value.trim());
      const student: any = {};
      
      headers.forEach((header, index) => {
        student[header] = values[index] || '';
      });
      
      return student as StudentData;
    }).filter(student => 
      student.enname && 
      student.jpname && 
      student.firstname && 
      student.gender && 
      student.grade && 
      student.class && 
      student.teacher
    );
  };

  const uploadToFirebase = async (students: StudentData[]) => {
    const db = getDatabase();
    const currentYear = new Date().getFullYear().toString();
    
    try {
      // Group students by class
      const studentsByClass: { [key: string]: StudentData[] } = {};
      students.forEach(student => {
        if (!studentsByClass[student.class]) {
          studentsByClass[student.class] = [];
        }
        studentsByClass[student.class].push(student);
      });

      // Upload students for each class
      for (const [classSection, classStudents] of Object.entries(studentsByClass)) {
        for (let i = 0; i < classStudents.length; i++) {
          const student = classStudents[i];
          const studentKey = `student${i + 1}`;
          const studentRef = ref(db, `${currentYear}/${classSection}/${studentKey}`);
          
          const studentData = {
            enname: student.enname,
            jpname: student.jpname,
            firstname: student.firstname,
            gender: student.gender,
            grade: student.grade,
            class: student.class,
            teacher: student.teacher,
            "1sttry": {
              "20mshuttleruns": 0,
              "50msprint": 0,
              "aveGrip": 0,
              "gripstrL": 0,
              "gripstrR": 0,
              "longjump": 0,
              "seatedtoetouch": 0,
              "sidesteps": 0,
              "situps": 0,
              "softballthrowing": 0
            },
            "2ndtry": {
              "20mshuttleruns": 0,
              "50msprint": 0,
              "aveGrip": 0,
              "gripstrL": 0,
              "gripstrR": 0,
              "longjump": 0,
              "seatedtoetouch": 0,
              "sidesteps": 0,
              "situps": 0,
              "softballthrowing": 0
            }
          };

          await set(studentRef, studentData);
        }
      }
      setMessage('Successfully uploaded student data!');
    } catch (error) {
      console.error('Error uploading data:', error);
      setMessage('Error uploading data. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    setUploading(true);
    setMessage('Uploading...');

    try {
      const text = await file.text();
      const students = processCSV(text);
      await uploadToFirebase(students);
    } catch (error) {
      console.error('Error processing file:', error);
      setMessage('Error processing file. Please check the format and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Student Data CSV Upload</h2>
                <div className="mb-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !file}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium
                    ${uploading || !file 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </button>
                {message && (
                  <div className={`mt-4 p-3 rounded-md ${
                    message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {message}
                  </div>
                )}
                <div className="mt-6 text-sm text-gray-500">
                  <p>CSV Format should include the following columns:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>enname (English Name)</li>
                    <li>jpname (Japanese Name)</li>
                    <li>firstname (First Name)</li>
                    <li>gender (Boy/Girl)</li>
                    <li>grade (Grade Level)</li>
                    <li>class (Class Section)</li>
                    <li>teacher (Teacher Name)</li>
                  </ul>
                  <p className="mt-4 text-xs text-gray-400">
                    Note: The CSV file should have a header row with these exact column names.
                    All fields are required. The file should be comma-separated.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CsvUpload; 