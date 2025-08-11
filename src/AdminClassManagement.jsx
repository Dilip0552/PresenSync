import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, where, getDocs, doc, writeBatch } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";
import { Plus, Minus, BookOpen, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-presence';
import back from "./assets/back.png";
import next from "./assets/next.png";

function AdminClassManagement({ addNotification }) {
  const [allClasses, setAllClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('allClasses'); // allClasses, classSessions, sessionDetails
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  const { db } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Fetch all classes from all teachers
  useEffect(() => {
    const fetchAllClasses = async () => {
      if (!db) return;
      setLoading(true);
      try {
        const teachersRef = collection(db, `artifacts/${appId}/public/data/allUserProfiles`);
        const teachersQuery = query(teachersRef, where("role", "==", "teacher"));
        const teacherDocs = await getDocs(teachersQuery);
        const teachers = teacherDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const classesPromises = teachers.map(async (teacher) => {
          const classesRef = collection(db, `artifacts/${appId}/users/${teacher.id}/classes`);
          const classesDocs = await getDocs(classesRef);
          return classesDocs.docs.map(doc => ({
            id: doc.id,
            teacherId: teacher.id,
            teacherName: teacher.fullName || teacher.email,
            ...doc.data()
          }));
        });
        const classesArrays = await Promise.all(classesPromises);
        setAllClasses(classesArrays.flat());
      } catch (error) {
        console.error("Error fetching all classes:", error);
        addNotification("Failed to load all classes.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchAllClasses();
  }, [db, appId, addNotification]);

  // Fetch all students (for enrollment management)
  useEffect(() => {
    if (!db) return;
    const studentsCollectionRef = collection(db, `artifacts/${appId}/public/data/allUserProfiles`);
    const q = query(studentsCollectionRef, where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStudents = snapshot.docs.map(doc => ({
        uid: doc.id,
        id: doc.id,
        ...doc.data()
      }));
      setAllStudents(fetchedStudents);
    }, (error) => {
      console.error("Error fetching students:", error);
      addNotification("Failed to load student list.", "error");
    });
    return () => unsubscribe();
  }, [db, appId, addNotification]);

  // Fetch sessions for a selected class
  useEffect(() => {
    if (!db || !selectedClass || view !== 'classSessions') return;
    setLoading(true);
    const sessionsCollectionRef = collection(db, `artifacts/${appId}/users/${selectedClass.teacherId}/sessions`);
    const q = query(sessionsCollectionRef, where("classId", "==", selectedClass.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClassSessions(fetchedSessions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching class sessions:", error);
      addNotification("Failed to load sessions for selected class.", "error");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId, selectedClass, addNotification, view]);

  // Fetch attendance records for a selected session
  useEffect(() => {
    let unsubscribe;
    if (db && selectedSession && view === 'sessionDetails') {
      setLoading(true);
      const attendancePath = `artifacts/${appId}/users/${selectedClass.teacherId}/sessions/${selectedSession.id}/attendance`;
      const attendanceCollectionRef = collection(db, attendancePath);
      const q = query(attendanceCollectionRef);
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttendanceRecords(fetchedRecords);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching attendance records:", error);
        addNotification("Failed to load attendance records.", "error");
        setLoading(false);
      });
    } else {
      setAttendanceRecords([]);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [db, appId, selectedClass, selectedSession, addNotification, view]);

  // Enrollment management functions
  const enrollStudent = async (studentId, classData, action) => {
    setEnrollmentLoading(true);
    try {
      const batch = writeBatch(db);
      const classId = classData.id;
      const teacherId = classData.teacherId;
  
      // Fetch the class document to get the list of enrolled students
      const classRef = doc(db, `artifacts/${appId}/users/${teacherId}/classes`, classId);
      const classSnap = await getDocs(classRef);
      const currentEnrolledStudents = classSnap.exists() ? classSnap.data().enrolledStudents || [] : [];
  
      let updatedEnrolledStudents;
      if (action === 'enroll') {
        updatedEnrolledStudents = [...new Set([...currentEnrolledStudents, studentId])];
      } else {
        updatedEnrolledStudents = currentEnrolledStudents.filter(id => id !== studentId);
      }
  
      // Update the class document with the new enrollment list and count
      batch.update(classRef, {
        enrolledStudents: updatedEnrolledStudents,
        enrollmentCount: updatedEnrolledStudents.length
      });
  
      await batch.commit();
      
      const studentName = allStudents.find(s => s.id === studentId)?.fullName || 'Student';
      addNotification(`${studentName} ${action === 'enroll' ? 'enrolled in' : 'removed from'} ${classData.name}!`, 'success');
      
    } catch (error) {
      console.error("Error updating enrollment:", error);
      addNotification("Failed to update enrollment.", "error");
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const getEnrolledStudents = (classId) => {
    const classData = allClasses.find(cls => cls.id === classId);
    if (!classData || !classData.enrolledStudents) return [];
    return allStudents.filter(student => classData.enrolledStudents.includes(student.id));
  };
  
  const getAvailableStudents = (classId) => {
    const classData = allClasses.find(cls => cls.id === classId);
    if (!classData) return allStudents;
    const enrolledIds = new Set(classData.enrolledStudents);
    return allStudents.filter(student => !enrolledIds.has(student.id));
  };

  const renderAllClasses = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={24} className="text-blue-600" /> All Classes ({allClasses.length})
        </h3>
        {loading && <Spinner size="small" message="Loading..." />}
      </div>
      <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100 flex-grow">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Class Name</th>
              <th className="px-6 py-3">Teacher</th>
              <th className="px-6 py-3">Subject</th>
              <th className="px-6 py-3">Students</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allClasses.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No classes found.</td>
              </tr>
            ) : (
              allClasses.map(cls => (
                <tr key={cls.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{cls.name}</td>
                  <td className="px-6 py-4">{cls.teacherName || 'N/A'}</td>
                  <td className="px-6 py-4">{cls.subject || 'N/A'}</td>
                  <td className="px-6 py-4">{cls.enrollmentCount || 0}</td>
                  <td className="px-6 py-4 flex space-x-2">
                    <button
                      onClick={() => { setSelectedClass(cls); setView('classSessions'); }}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      View Sessions
                    </button>
                    <button
                      onClick={() => { setSelectedClass(cls); setView('manageStudents'); }}
                      className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      Manage Students
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderClassSessions = () => (
    <>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { setSelectedClass(null); setView('allClasses'); }}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to All Classes"
        >
          <img src={back} alt="back" className="w-5 h-5" />
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedClass?.name} Sessions</h3>
      </div>
      <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100 flex-grow">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Session Date & Time</th>
              <th className="px-6 py-3">Total Present</th>
              <th className="px-6 py-3">Total Students</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5"><Spinner message="Loading sessions..." /></td></tr>}
            {!loading && classSessions.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No sessions found for this class.</td>
              </tr>
            ) : (
              classSessions.map((session) => (
                <tr key={session.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">{new Date(session.startTime).toLocaleString()}</td>
                  <td className="px-6 py-4">{session.totalPresent || 0}</td>
                  <td className="px-6 py-4">{session.totalStudents || 0}</td>
                  <td className={`px-6 py-4 font-semibold ${session.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => { setSelectedSession(session); setView('sessionDetails'); }}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      View Attendance
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderSessionDetails = () => (
    <>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { setSelectedSession(null); setView('classSessions'); }}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Sessions"
        >
          <img src={back} alt="back" className="w-5 h-5" />
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
          Attendance for {selectedClass?.name} on {new Date(selectedSession?.startTime).toLocaleDateString()}
        </h3>
      </div>
      <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100 flex-grow">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Student Name</th>
              <th className="px-6 py-3">Roll No.</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Time Marked</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="4"><Spinner message="Loading attendance..." /></td></tr>}
            {!loading && allStudents.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No students enrolled in this class.</td></tr>
            ) : (
              allStudents.map((student) => {
                const record = attendanceRecords.find(rec => rec.studentId === student.uid);
                const status = record ? 'Present' : 'Absent';
                const timeMarked = record?.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString() : '-';
                return (
                  <tr key={student.uid} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{student.fullName || student.email}</td>
                    <td className="px-6 py-4">{student.rollNo || 'N/A'}</td>
                    <td className={`px-6 py-4 font-semibold ${status === "Present" ? "text-green-600" : "text-red-500"}`}>
                      <span className={`px-2 py-1 rounded-full text-xs ${status === "Present" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{timeMarked}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderManageStudents = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { setSelectedClass(null); setView('allClasses'); }}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to All Classes"
        >
          <img src={back} alt="back" className="w-5 h-5" />
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Manage Students for {selectedClass?.name}</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col h-full">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Plus size={16} className="text-green-600" />
            Available Students ({getAvailableStudents(selectedClass.id).length})
          </h4>
          <div className="max-h-96 overflow-y-auto space-y-2 flex-grow">
            {getAvailableStudents(selectedClass.id).length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">All students are enrolled.</p>
            ) : (
              getAvailableStudents(selectedClass.id).map(student => (
                <div key={student.id} className="flex items-center justify-between p-2 border border-gray-100 rounded hover:bg-white transition-colors">
                  <div>
                    <p className="font-medium text-sm">{student.fullName || 'No Name'}</p>
                    <p className="text-xs text-gray-600">Roll: {student.rollNo || 'N/A'}</p>
                  </div>
                  <button
                    onClick={() => enrollStudent(student.id, selectedClass, 'enroll')}
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
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col h-full">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            Enrolled Students ({getEnrolledStudents(selectedClass.id).length})
          </h4>
          <div className="max-h-96 overflow-y-auto space-y-2 flex-grow">
            {getEnrolledStudents(selectedClass.id).length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">No students enrolled yet.</p>
            ) : (
              getEnrolledStudents(selectedClass.id).map(student => (
                <div key={student.id} className="flex items-center justify-between p-2 border border-gray-100 rounded bg-green-50">
                  <div>
                    <p className="font-medium text-sm">{student.fullName || 'No Name'}</p>
                    <p className="text-xs text-gray-600">Roll: {student.rollNo || 'N/A'}</p>
                  </div>
                  <button
                    onClick={() => enrollStudent(student.id, selectedClass, 'unenroll')}
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
      <AnimatePresence>
        {enrollmentLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center mt-4">
            <Spinner message="Updating enrollment..." size="small" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 bg-white rounded-lg shadow-md h-full flex flex-col"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full flex-grow flex flex-col"
        >
          {view === 'allClasses' && renderAllClasses()}
          {view === 'classSessions' && renderClassSessions()}
          {view === 'sessionDetails' && renderSessionDetails()}
          {view === 'manageStudents' && renderManageStudents()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default AdminClassManagement;