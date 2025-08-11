import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, getDocs, where } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";
import back from "./assets/back.png"
import next from "./assets/next.png"
import { AnimatePresence, motion } from "framer-motion";

function AttendanceOversight({ addNotification }) {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSessions, setClassSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('teachers'); // teachers, classes, sessions

  const { db } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Fetch all teachers
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const teachersCollectionRef = collection(db, `artifacts/${appId}/public/data/allUserProfiles`);
    const q = query(teachersCollectionRef, where("role", "==", "teacher"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTeachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(fetchedTeachers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teachers:", error);
      addNotification("Failed to load teachers.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId, addNotification]);

  // Fetch classes for a selected teacher
  useEffect(() => {
    if (!db || !selectedTeacher) return;
    setLoading(true);
    const classesCollectionRef = collection(db, `artifacts/${appId}/users/${selectedTeacher.id}/classes`);
    const q = query(classesCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeacherClasses(fetchedClasses);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teacher's classes:", error);
      addNotification("Failed to load classes for selected teacher.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId, selectedTeacher, addNotification]);

  // Fetch sessions for a selected class
  useEffect(() => {
    if (!db || !selectedTeacher || !selectedClass) return;
    setLoading(true);
    const sessionsCollectionRef = collection(db, `artifacts/${appId}/users/${selectedTeacher.id}/sessions`);
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
  }, [db, appId, selectedTeacher, selectedClass, addNotification]);

  const renderTeachers = () => (
    <>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Select a Teacher</h3>
      <div className="flex flex-col items-center flex-grow overflow-y-auto gap-4 py-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 pr-2 w-full">
        {loading && <Spinner message="Loading teachers..." />}
        {teachers.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No teachers found.</p>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="w-full md:w-2/3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 shadow-sm cursor-pointer transition-all duration-200 flex justify-between items-center group"
              onClick={() => {
                setSelectedTeacher(teacher);
                setView('classes');
              }}
            >
              <span className="text-lg font-medium text-gray-700">{teacher.fullName || teacher.email}</span>
              <img className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" src={next} alt="view" />
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderClasses = () => (
    <>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => {
            setSelectedTeacher(null);
            setView('teachers');
          }}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Teachers"
        >
          <img src={back} alt="back" className="w-5 h-5" />
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">{selectedTeacher.fullName}'s Classes</h3>
      </div>
      <div className="flex flex-col items-center flex-grow overflow-y-auto gap-4 py-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 pr-2 w-full">
        {loading && <Spinner message="Loading classes..." />}
        {teacherClasses.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No classes found for this teacher.</p>
        ) : (
          teacherClasses.map((cls) => (
            <div
              key={cls.id}
              className="w-full md:w-2/3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 shadow-sm cursor-pointer transition-all duration-200 flex justify-between items-center group"
              onClick={() => {
                setSelectedClass(cls);
                setView('sessions');
              }}
            >
              <span className="text-lg font-medium text-gray-700">{cls.name}</span>
              <img className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" src={next} alt="view" />
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderSessions = () => (
    <>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => {
            setSelectedClass(null);
            setView('classes');
          }}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Classes"
        >
          <img src={back} alt="back" className="w-5 h-5" />
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">{selectedClass.name} Sessions</h3>
      </div>
      <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100 flex-grow">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Session Date & Time</th>
              <th className="px-6 py-3">Total Present</th>
              <th className="px-6 py-3">Total Students</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="4"><Spinner message="Loading sessions..." /></td></tr>}
            {!loading && classSessions.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No sessions found for this class.</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full flex flex-col items-start justify-start relative"
      >
        <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md flex-grow w-full">
          {view === 'teachers' && renderTeachers()}
          {view === 'classes' && renderClasses()}
          {view === 'sessions' && renderSessions()}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AttendanceOversight;