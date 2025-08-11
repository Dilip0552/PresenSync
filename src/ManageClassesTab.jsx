import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot, writeBatch, getDoc } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext';
import Spinner from './Spinner';
import { Trash2, Users, Plus, Minus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

function ManageClassesTab({ classes, addNotification }) {
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState('');
  
  // Enrollment management states
  const [showEnrollmentSection, setShowEnrollmentSection] = useState(false);
  const [selectedClassForEnrollment, setSelectedClassForEnrollment] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  const { db, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'presensync-app';

  // Fetch all students (both for class creation and enrollment)
  useEffect(() => {
    if (!db) return;

    const studentsCollectionRef = collection(db, `artifacts/${appId}/public/data/allUserProfiles`);
    const q = query(studentsCollectionRef, where("role", "==", "student"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStudents = snapshot.docs.map(doc => ({
        uid: doc.id,
        id: doc.id, // Add both uid and id for compatibility
        ...doc.data()
      }));
      setAllStudents(fetchedStudents);
    }, (error) => {
      console.error("Error fetching students:", error);
      addNotification("Failed to load students.", "error");
    });

    return () => unsubscribe();
  }, [db, appId, addNotification]);

  const handleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.uid === student.uid);
      if (isSelected) {
        return prev.filter(s => s.uid !== student.uid);
      } else {
        return [...prev, {
          uid: student.uid,
          name: student.fullName || student.displayName || 'Unknown',
          rollNo: student.rollNo || 'N/A'
        }];
      }
    });
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    
    if (!className.trim()) {
      addNotification("Please enter a class name.", "error");
      return;
    }

    setLoading(true);
    try {
      const classesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/classes`);
      
      const newClassData = {
        name: className,
        subject: subject,
        students: selectedStudents,
        enrolledStudents: selectedStudents.map(student => student.uid), // Add enrolled students IDs
        enrollmentCount: selectedStudents.length, // Add enrollment count
        createdAt: new Date().toISOString(),
        teacherId: userId,
      };

      await addDoc(classesCollectionRef, newClassData);
      
      addNotification("Class created successfully!", "success");
      setClassName('');
      setSubject('');
      setSelectedStudents([]);
    } catch (error) {
      console.error("Error creating class:", error);
      addNotification("Failed to create class.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!confirm(`Are you sure you want to delete "${className}"?`)) return;
    
    setDeleteLoading(classId);
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/classes`, classId));
      addNotification(`Class "${className}" deleted successfully!`, "success");
    } catch (error) {
      console.error("Error deleting class:", error);
      addNotification("Failed to delete class.", "error");
    } finally {
      setDeleteLoading('');
    }
  };

  // Enrollment management functions
  const enrollStudent = async (studentId, classId, action = 'enroll') => {
    setEnrollmentLoading(true);
    try {
      const batch = writeBatch(db);

      // Update student's public profile
      const publicProfileRef = doc(db, `artifacts/${appId}/public/data/allUserProfiles`, studentId);
      const publicProfileSnap = await getDoc(publicProfileRef);
      
      if (publicProfileSnap.exists()) {
        const currentData = publicProfileSnap.data();
        const currentEnrolledClasses = currentData.enrolledClasses || [];
        
        let updatedEnrolledClasses;
        if (action === 'enroll') {
          updatedEnrolledClasses = [...new Set([...currentEnrolledClasses, classId])];
        } else {
          updatedEnrolledClasses = currentEnrolledClasses.filter(id => id !== classId);
        }
        
        batch.update(publicProfileRef, {
          enrolledClasses: updatedEnrolledClasses
        });
      }

      // Update student's private profile
      const privateProfileRef = doc(db, `artifacts/${appId}/users/${studentId}/profile`, 'userProfile');
      const privateProfileSnap = await getDoc(privateProfileRef);
      
      if (privateProfileSnap.exists()) {
        const currentData = privateProfileSnap.data();
        const currentEnrolledClasses = currentData.enrolledClasses || [];
        
        let updatedEnrolledClasses;
        if (action === 'enroll') {
          updatedEnrolledClasses = [...new Set([...currentEnrolledClasses, classId])];
        } else {
          updatedEnrolledClasses = currentEnrolledClasses.filter(id => id !== classId);
        }
        
        batch.update(privateProfileRef, {
          enrolledClasses: updatedEnrolledClasses
        });
      }

      // Update class enrollment count (optional - for display purposes)
      const classRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, classId);
      const classSnap = await getDoc(classRef);
      
      if (classSnap.exists()) {
        const classData = classSnap.data();
        const currentEnrolledStudents = classData.enrolledStudents || [];
        
        let updatedEnrolledStudents;
        if (action === 'enroll') {
          updatedEnrolledStudents = [...new Set([...currentEnrolledStudents, studentId])];
        } else {
          updatedEnrolledStudents = currentEnrolledStudents.filter(id => id !== studentId);
        }
        
        batch.update(classRef, {
          enrolledStudents: updatedEnrolledStudents,
          enrollmentCount: updatedEnrolledStudents.length
        });
      }

      await batch.commit();
      
      const studentName = allStudents.find(s => s.id === studentId)?.fullName || 'Student';
      const className = classes.find(c => c.id === classId)?.name || 'Class';
      addNotification(`${studentName} ${action === 'enroll' ? 'enrolled in' : 'removed from'} ${className}!`, 'success');
      
    } catch (error) {
      console.error("Error updating enrollment:", error);
      addNotification("Failed to update enrollment.", "error");
    } finally {
      setEnrollmentLoading(false);
    }
  };

  // Get enrolled and available students for the selected class
  const getEnrolledStudents = () => {
    if (!selectedClassForEnrollment) return [];
    return allStudents.filter(student => 
      student.enrolledClasses?.includes(selectedClassForEnrollment.id)
    );
  };

  const getAvailableStudents = () => {
    if (!selectedClassForEnrollment) return [];
    return allStudents.filter(student => 
      !student.enrolledClasses?.includes(selectedClassForEnrollment.id)
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-start justify-start">
      <AnimatePresence>
        {loading && (
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75"
          >
            <Spinner message="Creating class..." isVisible={true} />
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="text-2xl font-semibold text-blue-700 mb-6">Manage Classes</h2>

      {/* Create New Class Section */}
      <div className="w-full bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Class</h3>
        <form onSubmit={handleCreateClass} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-2">
                Class Name *
              </label>
              <input
                type="text"
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., CS-101"
                required
              />
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Advanced Mathematics"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Students ({selectedStudents.length} selected)
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
              {allStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No students found</p>
              ) : (
                <div className="space-y-2">
                  {allStudents.map((student) => {
                    const isSelected = selectedStudents.some(s => s.uid === student.uid);
                    return (
                      <label key={student.uid} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleStudentSelection(student)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            {student.fullName || student.displayName || 'Unknown Name'}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            Roll: {student.rollNo || 'N/A'}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Class'}
          </button>
        </form>
      </div>

      {/* Student Enrollment Management Section */}
      <div className="w-full bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Student Enrollments</h3>
          <button
            onClick={() => setShowEnrollmentSection(!showEnrollmentSection)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Users size={16} />
            {showEnrollmentSection ? 'Hide' : 'Manage'} Enrollments
          </button>
        </div>
        
        {showEnrollmentSection && (
          <div className="space-y-4">
            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class to Manage
              </label>
              <select
                value={selectedClassForEnrollment?.id || ''}
                onChange={(e) => {
                  const selectedClass = classes.find(c => c.id === e.target.value);
                  setSelectedClassForEnrollment(selectedClass);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a class --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {selectedClassForEnrollment && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Students */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Plus size={16} className="text-green-600" />
                    Available Students ({getAvailableStudents().length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {getAvailableStudents().length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">
                        All students are enrolled in this class
                      </p>
                    ) : (
                      getAvailableStudents().map(student => (
                        <div key={student.id} className="flex items-center justify-between p-2 border border-gray-100 rounded hover:bg-gray-50">
                          <div>
                            <p className="font-medium text-sm">{student.fullName || 'No Name'}</p>
                            <p className="text-xs text-gray-600">Roll: {student.rollNo || 'N/A'}</p>
                          </div>
                          <button
                            onClick={() => enrollStudent(student.id, selectedClassForEnrollment.id, 'enroll')}
                            disabled={enrollmentLoading}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            <Plus size={12} />
                            Enroll
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Enrolled Students */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    Enrolled Students ({getEnrolledStudents().length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {getEnrolledStudents().length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">
                        No students enrolled yet
                      </p>
                    ) : (
                      getEnrolledStudents().map(student => (
                        <div key={student.id} className="flex items-center justify-between p-2 border border-gray-100 rounded bg-green-50">
                          <div>
                            <p className="font-medium text-sm">{student.fullName || 'No Name'}</p>
                            <p className="text-xs text-gray-600">Roll: {student.rollNo || 'N/A'}</p>
                          </div>
                          <button
                            onClick={() => enrollStudent(student.id, selectedClassForEnrollment.id, 'unenroll')}
                            disabled={enrollmentLoading}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            <Minus size={12} />
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {enrollmentLoading && (
              <div className="flex items-center justify-center py-4">
                <Spinner message="Updating enrollment..." isVisible={true} size="small" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing Classes List */}
      <div className="w-full bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Classes ({classes.length})</h3>
        {classes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No classes created yet.</p>
        ) : (
          <div className="space-y-4">
            {classes.map((cls) => (
              <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800">{cls.name}</h4>
                    {cls.subject && (
                      <p className="text-sm text-gray-600">{cls.subject}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {cls.students?.length || 0} students • 
                      Enrolled: {cls.enrollmentCount || 0} • 
                      Created: {new Date(cls.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteClass(cls.id, cls.name)}
                    disabled={deleteLoading === cls.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete Class"
                  >
                    {deleteLoading === cls.id ? (
                      <Spinner size="small" isVisible={true} />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
                
                {cls.students && cls.students.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mb-2">Students:</p>
                    <div className="flex flex-wrap gap-2">
                      {cls.students.slice(0, 5).map((student, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {student.name}
                        </span>
                      ))}
                      {cls.students.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{cls.students.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageClassesTab;