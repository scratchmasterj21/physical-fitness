import React from 'react';

interface StudentData {
  id: string;
  data: {
    name: string;
    // ... add all other student fields here
  };
}

interface Props {
  student: StudentData | null;
}

export const StudentForm: React.FC<Props> = ({ student }) => {
  if (!student) {
    return <div>No Student Selected</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Update state with form changes
    console.log(e);
  };

  const handleSave = () => {
    // TODO: Save data to Firebase
  };

  const handleDelete = () => {
    // TODO: Delete student from Firebase
  };

  return (
    <div className="student-form">
      <input
        type="text"
        value={student.data.name}
        onChange={handleChange}
        className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      />
      {/* Add other input fields here */}
      <div className="flex justify-end my-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ml-2"
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
};
