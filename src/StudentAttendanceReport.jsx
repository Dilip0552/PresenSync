import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";

function StudentAttendanceReport({ addNotification, studentProfile }) {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionsMap, setSessionsMap] = useState({}); // To store session details by sessionId
  const [classesMap, setClassesMap] = useState({}); // To store class details by classId

  const { db, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  useEffect(() => {
    if (!db || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const attendanceCollectionRef = collection(db, `artifacts/${appId}/public/data/attendanceRecords`);
    const q = query(attendanceCollectionRef, where("studentId", "==", userId));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(fetchedRecords);

      // Fetch associated session and class details for each record
      const uniqueSessionIds = [...new Set(fetchedRecords.map(record => record.sessionId))];
      const uniqueClassIds = [...new Set(fetchedRecords.map(record => record.classId))];
      const uniqueTeacherIds = [...new Set(fetchedRecords.map(record => record.teacherId))]; // To get teacher's sessions

      const newSessionsMap = { ...sessionsMap };
      const newClassesMap = { ...classesMap };

      // Fetch session details
      for (const sessionId of uniqueSessionIds) {
        if (!newSessionsMap[sessionId]) {
          const record = fetchedRecords.find(rec => rec.sessionId === sessionId);
          if (record && record.teacherId) {
            try {
              const sessionDocRef = doc(db, `artifacts/${appId}/users/${record.teacherId}/sessions`, sessionId);
              const sessionSnap = await getDoc(sessionDocRef);
              if (sessionSnap.exists()) {
                newSessionsMap[sessionId] = { id: sessionSnap.id, ...sessionSnap.data() };
              }
            } catch (error) {
              console.error(`Error fetching session ${sessionId}:`, error);
            }
          }
        }
      }
      setSessionsMap(newSessionsMap);

      // Fetch class details (from the teacher who created the class)
      // This is a bit more complex as class is under teacher's user ID.
      // We might need to iterate through all teachers or store classId-teacherId mapping
      // For now, we'll try to fetch from the teacher who created the session.
      for (const classId of uniqueClassIds) {
        if (!newClassesMap[classId]) {
          const record = fetchedRecords.find(rec => rec.classId === classId);
          if (record && record.teacherId) {
            try {
              const classDocRef = doc(db, `artifacts/${appId}/users/${record.teacherId}/classes`, classId);
              const classSnap = await getDoc(classDocRef);
              if (classSnap.exists()) {
                newClassesMap[classId] = { id: classSnap.id, ...classSnap.data() };
              }
            } catch (error) {
              console.error(`Error fetching class ${classId}:`, error);
            }
          }
        }
      }
      setClassesMap(newClassesMap);

      setLoading(false);
    }, (error) => {
      console.error("Error fetching attendance records:", error);
      addNotification("Failed to load attendance records.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId, appId, addNotification, sessionsMap, classesMap]);

  // Calculate overall attendance statistics
  const totalPresent = attendanceRecords.length;
  // To get total sessions, we would need to know all sessions the student was enrolled in,
  // which implies fetching student's enrolled classes and then all sessions for those classes.
  // For simplicity, we'll just show present count for now.
  const totalSessionsAttended = attendanceRecords.length;


  return (
    <div className="w-full h-full flex flex-col items-start justify-start p-4">
      <h2 className="text-2xl font-semibold text-blue-700 mb-6">Your Attendance Report</h2>

      {loading && <Spinner message="Loading attendance data..." />}

      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-4xl mb-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col bg-blue-50 p-4 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600">Total Sessions Attended</span>
            <span className="text-3xl font-bold text-blue-700">{totalSessionsAttended}</span>
          </div>
          <div className="flex flex-col bg-green-50 p-4 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600">Overall Attendance Rate</span>
            {/* This calculation needs total possible sessions, which is not readily available here */}
            <span className="text-3xl font-bold text-green-700">N/A%</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-4xl border border-gray-100 flex-grow flex flex-col">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Detailed Records</h3>
        <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100 flex-grow scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Session ID</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No attendance records found.</td>
                </tr>
              ) : (
                attendanceRecords.map((record) => {
                  const session = sessionsMap[record.sessionId];
                  const className = session?.className || record.className || 'Unknown Class'; // Fallback to record's className
                  const sessionTime = session ? new Date(session.startTime).toLocaleString() : new Date(record.timestamp).toLocaleString();

                  return (
                    <tr key={record.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{sessionTime}</td>
                      <td className="px-6 py-4">{className}</td>
                      <td className="px-6 py-4 break-all">{record.sessionId}</td>
                      <td className={`px-6 py-4 font-semibold ${record.status === "present" ? "text-green-600" : "text-red-500"}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StudentAttendanceReport;
