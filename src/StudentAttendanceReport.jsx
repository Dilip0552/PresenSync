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
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'presensync-app';

  useEffect(() => {
    let unsubscribe;

    if (!db || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Correctly reference the user's attendance records
    const attendanceCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/attendanceRecords`);
    const q = query(attendanceCollectionRef);

    unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(fetchedRecords);

      const uniqueSessionIds = [...new Set(fetchedRecords.map(record => record.sessionId))];
      const uniqueClassIds = [...new Set(fetchedRecords.map(record => record.classId))];

      const newSessionsMap = { ...sessionsMap };
      const newClassesMap = { ...classesMap };

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

  // Handle report generation
  const handleGenerateReport = () => {
    addNotification("Generating report...", "info");
    // For a simple in-app report, you could render a component here.
    // As a placeholder, we'll log the data to the console.
    console.log("--- Student Attendance Report ---");
    console.table(attendanceRecords.map(record => ({
      'Date & Time': new Date(record.timestamp?.toDate() || new Date()).toLocaleString(),
      'Class Name': sessionsMap[record.sessionId]?.className || record.className,
      'Session ID': record.sessionId,
      'Status': record.status,
    })));
    console.log("---------------------------------");
  };

  // Handle data export to Excel (as CSV)
  const handleExportToExcel = () => {
    if (attendanceRecords.length === 0) {
      addNotification("No data to export.", "warning");
      return;
    }

    addNotification("Exporting data to Excel...", "info");

    const headers = ["Date & Time", "Class", "Session ID", "Status", "Student Name", "Student Roll No."];
    const rows = attendanceRecords.map(record => {
      const sessionTime = new Date(record.timestamp?.toDate() || new Date()).toLocaleString();
      const className = sessionsMap[record.sessionId]?.className || record.className || 'Unknown Class';
      return [
        sessionTime,
        className,
        record.sessionId,
        record.status,
        record.studentName,
        record.studentRollNo
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `student_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addNotification("Report exported successfully!", "success");
    } else {
      addNotification("Your browser does not support downloading files directly.", "error");
    }
  };

  // Calculate overall attendance statistics
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
                  const sessionTime = new Date(record.timestamp?.toDate() || new Date()).toLocaleString();

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
      <div className="flex justify-end mt-6 space-x-4">
        <button
            onClick={handleGenerateReport}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-semibold"
            disabled={loading || attendanceRecords.length === 0}
        >
            Generate Report
        </button>
        <button
            onClick={handleExportToExcel}
            className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors font-semibold"
            disabled={loading || attendanceRecords.length === 0}
        >
            Export to Excel
        </button>
      </div>
    </div>
  );
}

export default StudentAttendanceReport;
