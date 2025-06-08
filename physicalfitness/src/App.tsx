import './App.css'
import PhFitnessRecord from './PhFitnessRecord'
import CsvUpload from './CsvUpload'
import StudentManagement from './StudentManagement'
import { useState, useEffect } from 'react'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  // Simple routing based on pathname
  if (currentPath === '/csv-upload') {
    return <CsvUpload />;
  }

  if (currentPath === '/student-management') {
    return <StudentManagement />;
  }

  return <PhFitnessRecord />;
}

export default App
