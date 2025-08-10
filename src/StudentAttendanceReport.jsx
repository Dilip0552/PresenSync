import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, getDoc, where } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function StudentAttendanceReport({ addNotification, studentProfile }) {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionsMap, setSessionsMap] = useState({});

  const { db, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'presensync-app';

  // Fetch student's attendance records
  useEffect(() => {
    if (!db || !userId) {
      setLoading(false);
      return;
    }

    const attendanceCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/attendanceRecords`);
    const q = query(attendanceCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(fetchedRecords);
    }, (error) => {
      console.error("Error fetching attendance records:", error);
      addNotification("Failed to load attendance records.", "error");
    });

    return () => unsubscribe();
  }, [db, userId, appId, addNotification]);

  // Fetch all sessions for enrolled classes
  useEffect(() => {
    if (!db || !studentProfile?.enrolledClasses?.length) {
      setLoading(false);
      return;
    }

    const fetchAllSessions = async () => {
      try {
        setLoading(true);
        const allSessionsData = [];
        const newSessionsMap = {};

        // Get all teachers
        const usersCollectionRef = collection(db, `artifacts/${appId}/public/data/allUserProfiles`);
        const teachersQuery = query(usersCollectionRef, where("role", "==", "teacher"));
        
        const teachersSnapshot = await new Promise((resolve, reject) => {
          const unsubscribe = onSnapshot(teachersQuery, resolve, reject);
          setTimeout(() => unsubscribe(), 5000);
        });

        // For each teacher, get their sessions
        for (const teacherDoc of teachersSnapshot.docs) {
          const teacherId = teacherDoc.id;
          const teacherData = teacherDoc.data();
          
          try {
            const sessionsCollectionRef = collection(db, `artifacts/${appId}/users/${teacherId}/sessions`);
            const sessionsSnapshot = await new Promise((resolve, reject) => {
              const unsubscribe = onSnapshot(sessionsCollectionRef, resolve, reject);
              setTimeout(() => unsubscribe(), 3000);
            });

            for (const sessionDoc of sessionsSnapshot.docs) {
              const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };
              
              // Only include sessions for classes the student is enrolled in
              if (studentProfile.enrolledClasses.includes(sessionData.classId)) {
                allSessionsData.push({
                  ...sessionData,
                  teacherId: teacherId,
                  teacherName: teacherData.fullName || teacherData.displayName || 'Unknown Teacher'
                });

                newSessionsMap[sessionData.id] = sessionData;
              }
            }
          } catch (error) {
            console.error(`Error fetching sessions for teacher ${teacherId}:`, error);
          }
        }

        setAllSessions(allSessionsData);
        setSessionsMap(newSessionsMap);
        setLoading(false);

      } catch (error) {
        console.error("Error fetching all sessions:", error);
        addNotification("Failed to load sessions.", "error");
        setLoading(false);
      }
    };

    fetchAllSessions();
  }, [db, studentProfile, appId, addNotification]);

  // Generate combined attendance data (present + absent)
  const getCombinedAttendanceData = () => {
    const combinedData = [];
    const attendedSessionIds = new Set(attendanceRecords.map(record => record.sessionId));

    // Add attended sessions (present)
    attendanceRecords.forEach(record => {
      const session = sessionsMap[record.sessionId];
      const sessionTime = session ? new Date(session.startTime).toLocaleString() : new Date(record.timestamp).toLocaleString();
      
      combinedData.push({
        sessionId: record.sessionId,
        sessionTime: sessionTime,
        className: session?.className || record.className || 'Unknown Class',
        status: 'Present',
        teacherName: session?.teacherName || 'Unknown Teacher',
        timestamp: session ? new Date(session.startTime).getTime() : new Date(record.timestamp).getTime()
      });
    });

    // Add missed sessions (absent)
    allSessions.forEach(session => {
      if (!attendedSessionIds.has(session.id)) {
        const sessionStartTime = new Date(session.startTime).getTime();
        const now = new Date().getTime();
        
        // Only include past sessions
        if (sessionStartTime < now) {
          combinedData.push({
            sessionId: session.id,
            sessionTime: new Date(session.startTime).toLocaleString(),
            className: session.className || 'Unknown Class',
            status: 'Absent',
            teacherName: session.teacherName || 'Unknown Teacher',
            timestamp: sessionStartTime
          });
        }
      }
    });

    // Sort by timestamp (most recent first)
    return combinedData.sort((a, b) => b.timestamp - a.timestamp);
  };

  const combinedAttendanceData = getCombinedAttendanceData();
  const totalSessionsAttended = attendanceRecords.length;
  const totalSessionsAvailable = combinedAttendanceData.length;
  const attendanceRate = totalSessionsAvailable > 0 ? ((totalSessionsAttended / totalSessionsAvailable) * 100).toFixed(1) : 0;

  // Generate PDF report
  const generateReport = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 15);
    doc.text(`Student: ${studentProfile?.fullName || 'N/A'}`, 14, 25);
    doc.text(`Attendance Rate: ${attendanceRate}%`, 14, 35);

    const tableData = combinedAttendanceData.map(record => [
      record.sessionTime,
      record.className,
      record.sessionId.substring(0, 12) + '...',
      record.status,
      record.teacherName
    ]);

    autoTable(doc, {
      head: [["Date & Time", "Class", "Session ID", "Status", "Teacher"]],
      body: tableData,
      startY: 45
    });

    doc.save("Attendance_Report.pdf");
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = combinedAttendanceData.map(record => ({
      "Date & Time": record.sessionTime,
      "Class": record.className,
      "Session ID": record.sessionId,
      "Status": record.status,
      "Teacher": record.teacherName
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, "Attendance_Report.xlsx");
  };

  return (
    <div className="w-full h-full flex flex-col items-start justify-start p-4">
      <h2 className="text-2xl font-semibold text-blue-700 mb-6">Your Attendance Report</h2>

      {loading && <Spinner message="Loading attendance data..." />}

      {/* Action Buttons */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={generateReport}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Generate Report (PDF)
        </button>
        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Export to Excel
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-4xl mb-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col bg-blue-50 p-4 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600">Sessions Attended</span>
            <span className="text-3xl font-bold text-blue-700">{totalSessionsAttended}</span>
          </div>
          <div className="flex flex-col bg-red-50 p-4 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600">Sessions Available</span>
            <span className="text-3xl font-bold text-red-700">{totalSessionsAvailable}</span>
          </div>
          <div className="flex flex-col bg-green-50 p-4 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600">Attendance Rate</span>
            <span className="text-3xl font-bold text-green-700">{attendanceRate}%</span>
          </div>
        </div>
      </div>

      {/* Status Info */}
      {!studentProfile?.enrolledClasses?.length && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 w-full max-w-4xl">
          <p className="text-yellow-800">
            You are not enrolled in any classes yet. Please contact your teacher to get enrolled in classes 
            to see comprehensive attendance reports including missed sessions.
          </p>
        </div>
      )}

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-4xl border border-gray-100 flex-grow flex flex-col">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          Attendance Records ({combinedAttendanceData.length} sessions)
        </h3>
        <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100 flex-grow">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Teacher</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {combinedAttendanceData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    {loading ? "Loading..." : studentProfile?.enrolledClasses?.length ? "No sessions found for your enrolled classes." : "No enrollment data found."}
                  </td>
                </tr>
              ) : (
                combinedAttendanceData.map((record, index) => (
                  <tr key={`${record.sessionId}-${index}`} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{record.sessionTime}</td>
                    <td className="px-6 py-4">{record.className}</td>
                    <td className="px-6 py-4">{record.teacherName}</td>
                    <td className={`px-6 py-4 font-semibold ${
                      record.status === "Present" ? "text-green-600" : "text-red-500"
                    }`}>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.status === "Present"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StudentAttendanceReport;