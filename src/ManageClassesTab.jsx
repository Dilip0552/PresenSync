import React, { useState, useEffect, useCallback } from "react";
import { collection, addDoc, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, getDoc } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";

function ManageClassesTab({ classes, setClasses, addNotification }) {
  const [currentView, setCurrentView] = useState("classList"); // "classList", "studentList", "addNewClass"
  const [selectedClass, setSelectedClass] = useState(null); // Stores the class object currently being viewed
  const [loading, setLoading] = useState(false);
  const [studentsInSelectedClass, setStudentsInSelectedClass] = useState([]);

  // State for adding new class details
  const [newClassNameYear, setNewClassNameYear] = useState("");
  const [newClassNameBatch, setNewClassNameBatch] = useState("");
  const [newClassNameSection, setNewClassNameSection] = useState("");
  const [studentsToAddList, setStudentsToAddList] = useState([]); // Students for the NEW class being created

  // State for adding individual students to the 'add new class' form or existing class
  const [studentName, setStudentName] = useState("");
  const [studentRollNo, setStudentRollNo] = useState("");

  const { db, userId } = useFirebase();
  const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Fetch students for the selected class in real-time
  useEffect(() => {
    if (db && userId && selectedClass?.id) {
      setLoading(true);
      const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, selectedClass.id);
      const unsubscribe = onSnapshot(classDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStudentsInSelectedClass(data.students || []);
          console.log("ManageClassesTab: Fetched students for selected class:", data.students); // Log student fetch
        } else {
          setStudentsInSelectedClass([]);
          console.warn("ManageClassesTab: Selected class document not found for student list.");
        }
        setLoading(false);
      }, (error) => {
        console.error("ManageClassesTab: Error fetching students for class:", error);
        addNotification("Failed to load students for this class.", "error");
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setStudentsInSelectedClass([]);
    }
  }, [db, userId, appId, selectedClass, addNotification]);


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
    const re = /^[a-zA-Z\b]+$/;
    if ((e.target.value === "" || re.test(e.target.value)) && e.target.value.length <= 1) {
      setNewClassNameSection(e.target.value.toUpperCase());
    }
  };

  const handleStudentNameChange = (e) => {
    setStudentName(e.target.value);
  };

  const handleStudentRollNoChange = (e) => {
    setStudentRollNo(e.target.value);
  };

  // --- Class Management Handlers (Firestore) ---

  const handleDeleteClass = async (classId, className) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${className}"? This will permanently remove the class and its associated student data.`);
    if (!confirmDelete) {
      return;
    }

    setLoading(true);
    try {
      const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, classId);
      await deleteDoc(classDocRef);
      addNotification(`Class "${className}" deleted successfully!`, "success");
      console.log("ManageClassesTab: Class deleted:", className, "ID:", classId); // Log deletion
    } catch (error) {
      console.error("ManageClassesTab: Error deleting class:", error);
      addNotification(`Failed to delete class "${className}".`, "error");
    } finally {
      setLoading(false);
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
    console.log("ManageClassesTab: Student added to new class list:", studentName, studentRollNo); // Log student add to list
  };

  const handleRemoveStudentFromNewClassList = (rollNoToRemove) => {
    setStudentsToAddList(prev => prev.filter(student => student.rollNo !== rollNoToRemove));
    addNotification("Student removed from the list.", "info");
    console.log("ManageClassesTab: Student removed from new class list. Roll No:", rollNoToRemove); // Log removal
  };

  const handleCreateNewClass = async () => {
    if (!newClassNameYear || !newClassNameBatch || !newClassNameSection) {
      addNotification("Please fill in Year, Batch, and Section for the new class.", "error");
      console.warn("ManageClassesTab: Missing class details for creation."); // Log missing details
      return;
    }

    const newClassFullName = `CS${newClassNameYear}-${newClassNameSection}`;

    // Check if class already exists locally (from Firestore snapshot)
    if (classes.some(cls => cls.name === newClassFullName)) {
      addNotification(`Class "${newClassFullName}" already exists!`, "error");
      console.warn("ManageClassesTab: Attempted to create duplicate class:", newClassFullName); // Log duplicate attempt
      return;
    }

    setLoading(true);
    try {
      console.log("ManageClassesTab: Attempting to create new class...");
      console.log("ManageClassesTab: Target path:", `artifacts/${appId}/users/${userId}/classes`);
      console.log("ManageClassesTab: Data to save:", {
        name: newClassFullName,
        year: newClassNameYear,
        batch: newClassNameBatch,
        section: newClassNameSection,
        teacherId: userId,
        students: studentsToAddList.map(student => ({
          name: student.name,
          rollNo: student.rollNo,
          batch: newClassNameBatch,
        })),
        createdAt: new Date().toISOString(),
      });

      const classesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/classes`);
      const docRef = await addDoc(classesCollectionRef, { // Capture the docRef
        name: newClassFullName,
        year: newClassNameYear,
        batch: newClassNameBatch,
        section: newClassNameSection,
        teacherId: userId,
        students: studentsToAddList.map(student => ({
          name: student.name,
          rollNo: student.rollNo,
          batch: newClassNameBatch,
        })),
        createdAt: new Date().toISOString(),
      });

      addNotification(`Class "${newClassFullName}" created successfully!`, "success");
      console.log("ManageClassesTab: Class created successfully with ID:", docRef.id); // Log success with ID

      // Reset all states for new class creation
      setNewClassNameYear("");
      setNewClassNameBatch("");
      setNewClassNameSection("");
      setStudentsToAddList([]);
      setStudentName("");
      setStudentRollNo("");
      setCurrentView("classList");
    } catch (error) {
      console.error("ManageClassesTab: Error creating new class:", error); // Log the actual error
      addNotification("Failed to create new class. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudentToExistingClass = async () => {
    if (!selectedClass || !selectedClass.id) {
      addNotification("No class selected.", "error");
      return;
    }
    if (studentName.trim() === "" || studentRollNo.trim() === "") {
      addNotification("Student name and roll number cannot be empty.", "error");
      return;
    }

    if (studentsInSelectedClass.some(s => s.rollNo === studentRollNo.trim())) {
      addNotification("Student with this Roll No. already exists in this class.", "error");
      return;
    }

    setLoading(true);
    try {
      const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, selectedClass.id);
      await updateDoc(classDocRef, {
        students: arrayUnion({
          name: studentName.trim(),
          rollNo: studentRollNo.trim(),
          batch: selectedClass.batch || newClassNameBatch,
        })
      });
      addNotification(`Student "${studentName.trim()}" added to ${selectedClass.name}.`, "success");
      console.log("ManageClassesTab: Student added to existing class:", studentName, "Roll No:", studentRollNo, "Class:", selectedClass.name); // Log add student
      setStudentName("");
      setStudentRollNo("");
    } catch (error) {
      console.error("ManageClassesTab: Error adding student to class:", error);
      addNotification("Failed to add student to class. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudentFromExistingClass = async (studentToRemove) => {
    if (!selectedClass || !selectedClass.id) {
      addNotification("No class selected.", "error");
      return;
    }
    const confirmRemove = window.confirm(`Are you sure you want to remove "${studentToRemove.name}" from "${selectedClass.name}"?`);
    if (!confirmRemove) {
      return;
    }

    setLoading(true);
    try {
      const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, selectedClass.id);
      await updateDoc(classDocRef, {
        students: arrayRemove(studentToRemove)
      });
      addNotification(`Student "${studentToRemove.name}" removed from ${selectedClass.name}.`, "success");
      console.log("ManageClassesTab: Student removed from existing class:", studentToRemove.name, "Class:", selectedClass.name); // Log remove student
    } catch (error) {
      console.error("ManageClassesTab: Error removing student from class:", error);
      addNotification("Failed to remove student from class. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };


  const renderClassList = () => (
    <div className="flex flex-col h-full relative">
      {loading && <Spinner message="Loading classes..." isVisible={true} />}
      <h1 className="text-2xl font-semibold mb-6 text-blue-700">Active Classes</h1>
      <div className="flex flex-col items-center flex-grow overflow-y-auto gap-4 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 pr-2">
        {classes.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No classes created yet. Click below to add a new class!</p>
        ) : (
          classes.map((myclass) => (
            <div
              key={myclass.id}
              className="w-full md:w-2/3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 shadow-sm cursor-pointer flex justify-between items-center transition-all duration-200 group"
              onClick={() => {
                setSelectedClass(myclass);
                setCurrentView("studentList");
              }}
            >
              <span className="text-lg font-medium text-gray-700">{myclass.name}</span>
              <div className="flex items-center space-x-3">
                 <span className="text-sm text-gray-500">
                    Students: {(myclass.students || []).length}
                 </span>
                <img className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" src="/src/assets/next.png" alt="view" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(myclass.id, myclass.name);
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
        disabled={loading}
      >
        <Spinner size="small" color="white" isVisible={loading} />
        <span className={loading ? 'opacity-0' : ''}>+ Add New Class</span>
      </button>
    </div>
  );

  const renderStudentList = () => (
    <div className="w-full flex flex-col h-full relative">
      {loading && <Spinner message="Updating students..." isVisible={true} />}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setCurrentView("classList")}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Classes"
        >
          <img src="/src/assets/back.png" alt="back" className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-bold text-blue-800">{selectedClass?.name}</h2>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md bg-white border border-gray-100 flex-grow scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
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
            {studentsInSelectedClass.length === 0 ? (
                <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No students in this class.</td>
                </tr>
            ) : (
                studentsInSelectedClass.map((student, index) => (
                    <tr key={student.rollNo} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium">{index + 1}</td>
                        <td className="px-6 py-4">{student.name}</td>
                        <td className="px-6 py-4">{student.rollNo}</td>
                        <td className="px-6 py-4">{student.batch}</td>
                        <td className="px-6 py-4">
                            {/* Edit functionality would involve a modal or separate form */}
                            <button
                                className="ml-2 text-red-600 hover:underline px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                                onClick={() => handleRemoveStudentFromExistingClass(student)}
                                disabled={loading}
                            >
                                Remove
                            </button>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      <div className="w-full bg-white p-6 rounded-xl shadow-md border border-gray-100 mt-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Add Student to {selectedClass?.name}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="flex flex-col items-start">
            <label htmlFor="add-student-name" className="font-semibold text-gray-700 mb-2">Name</label>
            <input
              type="text"
              id="add-student-name"
              placeholder="Enter Student name"
              className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
              value={studentName}
              onChange={handleStudentNameChange}
            />
          </div>
          <div className="flex flex-col items-start">
            <label htmlFor="add-student-rollno" className="font-semibold text-gray-700 mb-2">Roll No.</label>
            <input
              type="text"
              id="add-student-rollno"
              placeholder="Enter Roll No."
              className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
              value={studentRollNo}
              onChange={handleStudentRollNoChange}
            />
          </div>
        </div>
        <button
          onClick={handleAddStudentToExistingClass}
          className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
          disabled={loading}
        >
          <Spinner size="small" color="white" isVisible={loading} />
          <span className={loading ? 'opacity-0' : ''}>Add Student to {selectedClass?.name}</span>
        </button>
      </div>
    </div>
  );

  const renderAddNewClass = () => (
    <div className="w-full h-full flex flex-col items-start justify-start relative">
        {loading && <Spinner message="Creating new class..." isVisible={true} />}
        <div className="flex items-center gap-4 mb-6">
            <button
                onClick={() => setCurrentView("classList")}
                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                title="Back to Classes"
                disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
          />
        </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Students to Add ({studentsToAddList.length})</h3>
          <ul className="my-3 flex-grow overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
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
                    disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>
            <button
              onClick={handleAddStudentToNewClassList}
              className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
              disabled={loading}
            >
              <Spinner size="small" color="white" isVisible={loading} />
              <span className={loading ? 'opacity-0' : ''}>Add Student to List</span>
            </button>
          </div>

          <div className="w-full flex justify-between gap-4 pt-4 border-t border-gray-100 mt-6">
            <button
              onClick={() => setCurrentView("classList")}
              className="flex-grow bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors shadow-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNewClass}
              className="flex-grow bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
              disabled={loading}
            >
              <Spinner size="small" color="white" isVisible={loading} />
              <span className={loading ? 'opacity-0' : ''}>Create Class</span>
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
