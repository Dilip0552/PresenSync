// src/ManageClassesTab.jsx
import { useState } from "react";
// Removed useNavigate as it's not directly used for navigation within this component's routes.

function ManageClassesTab({ classes, setClasses, addNotification }) {
  // Centralized state for managing students, ideally these would be fetched per class from a backend
  const [studentsByClass, setStudentsByClass] = useState({
    "CS1-A": [
      { name: "Dilip Suthar", rollNo: "24041", batch: "2028" },
      { name: "Chandan Giri", rollNo: "24042", batch: "2028" },
      { name: "Amit Shah", rollNo: "24043", batch: "2028" },
    ],
    "CS1-B": [
      { name: "Pranjal Dubey", rollNo: "24044", batch: "2028" },
      { name: "Kuldeep Saraswat", rollNo: "24045", batch: "2028" },
      { name: "Divyanshi Sahu", rollNo: "24046", batch: "2028" },
    ],
    // Add more classes and their students as needed
  });

  const [currentView, setCurrentView] = useState("classList"); // "classList", "studentList", "addNewClass"
  const [selectedClass, setSelectedClass] = useState(null); // Stores the name of the class currently being viewed or added

  // State for adding new class details
  const [newClassNameYear, setNewClassNameYear] = useState("");
  const [newClassNameBatch, setNewClassNameBatch] = useState("");
  const [newClassNameSection, setNewClassNameSection] = useState("");
  const [studentsToAddList, setStudentsToAddList] = useState([]); // Students for the NEW class being created

  // State for adding individual students to the 'add new class' form
  const [studentName, setStudentName] = useState("");
  const [studentRollNo, setStudentRollNo] = useState("");


  // --- Handlers for Input Fields ---
  const handleYearChange = (e) => {
    setNewClassNameYear(e.target.value);
  };

  const handleBatchChange = (e) => {
    const re = /^[0-9\b]+$/;
    if ((e.target.value === "" || re.test(e.target.value)) && e.target.value.length <= 4) {
      setNewClassNameBatch(e.target.value);
    }
  };

  const handleSectionChange = (e) => {
    const re = /^[a-zA-Z\b]+$/; // Allow only alphabets for section
    if ((e.target.value === "" || re.test(e.target.value)) && e.target.value.length <= 1) {
      setNewClassNameSection(e.target.value.toUpperCase()); // Store as uppercase
    }
  };

  const handleStudentNameChange = (e) => {
    setStudentName(e.target.value);
  };

  const handleStudentRollNoChange = (e) => {
    setStudentRollNo(e.target.value);
  };

  // --- Class Management Handlers ---

  const handleDeleteClass = (classToDelete) => {
    if (window.confirm(`Are you sure you want to delete "${classToDelete}"? This will also remove all associated student data.`)) {
      setClasses(prev => prev.filter(cls => cls !== classToDelete));
      setStudentsByClass(prev => {
        const newState = { ...prev };
        delete newState[classToDelete]; // Remove students associated with the class
        return newState;
      });
      addNotification(`Class "${classToDelete}" deleted successfully!`, "success");
    }
  };

  const handleAddStudentToNewClassList = () => {
    if (studentName.trim() === "" || studentRollNo.trim() === "") {
      addNotification("Student name and roll number cannot be empty.", "error");
      return;
    }
    if (studentsToAddList.some(s => s.rollNo === studentRollNo.trim())) {
      addNotification("Student with this Roll No. already added to this list.", "error");
      return;
    }

    setStudentsToAddList(prev => [...prev, { name: studentName.trim(), rollNo: studentRollNo.trim() }]);
    addNotification(`Student "${studentName.trim()}" added to the new class list.`, "info");
    setStudentName("");
    setStudentRollNo("");
  };

  const handleRemoveStudentFromNewClassList = (rollNoToRemove) => {
    setStudentsToAddList(prev => prev.filter(student => student.rollNo !== rollNoToRemove));
    addNotification("Student removed from the list.", "info");
  };

  const handleCreateNewClass = () => {
    if (!newClassNameYear || !newClassNameBatch || !newClassNameSection) {
      addNotification("Please fill in Year, Batch, and Section for the new class.", "error");
      return;
    }

    const newClassFullName = `CS${newClassNameYear}-${newClassNameSection}`;

    if (classes.includes(newClassFullName)) {
      addNotification(`Class "${newClassFullName}" already exists!`, "error");
      return;
    }

    // Add the new class to the main classes list
    setClasses(prev => [...prev, newClassFullName]);

    // Add the students collected in studentsToAddList to studentsByClass
    setStudentsByClass(prev => ({
        ...prev,
        [newClassFullName]: studentsToAddList.map(student => ({
            ...student,
            batch: newClassNameBatch // Assign batch to these students
        }))
    }));

    addNotification(`Class "${newClassFullName}" created successfully with ${studentsToAddList.length} students!`, "success");

    // Reset all states for new class creation
    setNewClassNameYear("");
    setNewClassNameBatch("");
    setNewClassNameSection("");
    setStudentsToAddList([]);
    setStudentName("");
    setStudentRollNo("");
    setCurrentView("classList"); 
  };


  const renderClassList = () => (
    <div className="flex flex-col h-full"> 
      <h1 className="text-2xl font-semibold mb-6 text-blue-700">Active Classes</h1>
      <div className="flex flex-col items-center flex-grow overflow-y-auto gap-4"> 
        {classes.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No classes created yet. Click below to add a new class!</p>
        ) : (
          classes.map((myclass, index) => (
            <div
              key={index}
              className="w-full md:w-2/3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 shadow-sm cursor-pointer flex justify-between items-center transition-all duration-200 group"
              onClick={() => {
                setSelectedClass(myclass);
                setCurrentView("studentList");
              }}
            >
              <span className="text-lg font-medium text-gray-700">{myclass}</span>
              <div className="flex items-center space-x-3">
                 <span className="text-sm text-gray-500">
                    Students: {(studentsByClass[myclass] || []).length}
                 </span>
                <img className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" src="/src/assets/next.png" alt="view" />
                <button
                  onClick={(e) => {
                    e.stopPropagation(); 
                    handleDeleteClass(myclass);
                  }}
                  className="p-2 rounded-full bg-gray-100 hover:bg-red-100 transition-colors"
                  title="Delete Class"
                >
                  <img src="/src/assets/delete.png" alt="delete" className="w-5 h-5 opacity-70 hover:opacity-100" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <button
        className="w-1/2 mx-auto mt-6 block bg-blue-600 text-white px-5 py-3 rounded-xl cursor-pointer hover:bg-blue-700 transition-all text-lg font-medium shadow-lg"
        onClick={() => {
          setNewClassNameYear(""); 
          setNewClassNameBatch("");
          setNewClassNameSection("");
          setStudentsToAddList([]);
          setStudentName("");
          setStudentRollNo("");
          setCurrentView("addNewClass");
        }}
      >
        + Add New Class
      </button>
    </div>
  );

  const renderStudentList = () => (
    <div className="w-full flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setCurrentView("classList")}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Classes"
        >
          <img src="/src/assets/back.png" alt="back" className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-bold text-blue-800">{selectedClass}</h2>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md bg-white border border-gray-100 flex-grow"> {/* flex-grow */}
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">S. No.</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Roll No.</th>
              <th className="px-6 py-3">Batch</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(studentsByClass[selectedClass] || []).length === 0 ? (
                <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No students in this class.</td>
                </tr>
            ) : (
                (studentsByClass[selectedClass] || []).map((student, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium">{index + 1}</td>
                        <td className="px-6 py-4">{student.name}</td>
                        <td className="px-6 py-4">{student.rollNo}</td>
                        <td className="px-6 py-4">{student.batch}</td>
                        <td className="px-6 py-4">
                            <button
                                className="text-blue-600 hover:underline px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                onClick={() => addNotification("Edit student feature coming soon!", "info")}
                            >
                                Edit
                            </button>
                            <button
                                className="ml-2 text-red-600 hover:underline px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                                onClick={() => addNotification("Delete student feature coming soon!", "info")}
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      <button
        className="w-fit mt-6 px-6 py-3 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-colors self-end"
        onClick={() => addNotification("Feature to add students to existing classes is under development!", "info")}
      >
        + Add Student to {selectedClass}
      </button>
    </div>
  );

  const renderAddNewClass = () => (
    <div className="w-full h-full flex flex-col items-start justify-start"> 
        <div className="flex items-center gap-4 mb-6">
            <button
                onClick={() => setCurrentView("classList")}
                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                title="Back to Classes"
            >
                <img src="/src/assets/back.png" alt="back" className="w-5 h-5" />
            </button>
            <h2 className="text-3xl font-bold text-blue-800">Add New Class</h2>
        </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="flex flex-col items-start col-span-1">
          <span className="font-semibold text-gray-700 mb-2">Year</span>
          <select
            name="year"
            id="year"
            className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
            value={newClassNameYear}
            onChange={handleYearChange}
          >
            <option value="">-- Select Year --</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
        <div className="flex flex-col items-start col-span-1">
          <span className="font-semibold text-gray-700 mb-2">Batch</span>
          <input
            type="text"
            onChange={handleBatchChange}
            value={newClassNameBatch}
            placeholder="Ex: 2028"
            className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
            maxLength="4"
          />
        </div>
        <div className="flex flex-col items-start col-span-1">
          <span className="font-semibold text-gray-700 mb-2">Section</span>
          <input
            type="text"
            onChange={handleSectionChange}
            value={newClassNameSection}
            placeholder="Ex: A"
            className="w-full uppercase px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
            maxLength="1"
          />
        </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow"> 
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Students to Add ({studentsToAddList.length})</h3>
          <ul className="my-3 flex-grow overflow-y-auto space-y-2">
            {studentsToAddList.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No students added yet.</div>
            ) : (
              studentsToAddList.map((student, index) => (
                <li key={index} className="px-4 py-2 flex items-center justify-between bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-base text-gray-700">{student.name} ({student.rollNo})</span>
                  <button
                    onClick={() => handleRemoveStudentFromNewClassList(student.rollNo)}
                    className="p-1 rounded-full hover:bg-red-100 transition-colors"
                    title="Remove Student"
                  >
                    <img src="/src/assets/remove.png" alt="remove" className="w-5 h-5 opacity-70 hover:opacity-100" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="col-span-2 bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Add Students to New Class</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div className="flex flex-col items-start">
                <label htmlFor="student-name" className="font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  id="student-name"
                  placeholder="Enter Student name"
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  value={studentName}
                  onChange={handleStudentNameChange}
                />
              </div>
              <div className="flex flex-col items-start">
                <label htmlFor="student-rollno" className="font-semibold text-gray-700 mb-2">Roll No.</label>
                <input
                  type="text"
                  id="student-rollno"
                  placeholder="Enter Roll No."
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  value={studentRollNo}
                  onChange={handleStudentRollNoChange}
                />
              </div>
            </div>
            <button
              onClick={handleAddStudentToNewClassList}
              className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
            >
              Add Student to List
            </button>
          </div>

          <div className="w-full flex justify-between gap-4 pt-4 border-t border-gray-100 mt-6">
            <button
              onClick={() => setCurrentView("classList")}
              className="flex-grow bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNewClass}
              className="flex-grow bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
            >
              Create Class
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col"> 
      {currentView === "classList" && renderClassList()}
      {currentView === "studentList" && renderStudentList()}
      {currentView === "addNewClass" && renderAddNewClass()}
    </div>
  );
}

export default ManageClassesTab;