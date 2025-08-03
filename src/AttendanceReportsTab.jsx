import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";

function AttendanceReportsTab({ totalSessions, classes, addNotification }) {
  const [currentView, setCurrentView] = useState("classList");
  const [selectedClass, setSelectedClass] = useState(null); // Stores the class object
  const [selectedSession, setSelectedSession] = useState(null); // Stores the session object
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const { db, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // Filter unique classes that have sessions
  const uniqueClassesWithSessions = Array.from(new Set(totalSessions.map(session => session.className)))
    .map(className => classes.find(cls => cls.name === className))
    .filter(Boolean); // Filter out any undefined if a class name doesn't match

  // Filter sessions for the currently selected class
  const filteredSessionsForClass = totalSessions.filter(
    (session) => session.classId === selectedClass?.id
  ).sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); // Sort by most recent

  // Fetch attendance records for the selected session
  useEffect(() => {
    if (db && selectedSession?.id) {
      setLoading(true);
      // Assuming attendance records are stored in a public collection
      const attendanceCollectionRef = collection(db, `artifacts/${appId}/public/data/attendanceRecords`);
      const q = query(attendanceCollectionRef, where("sessionId", "==", selectedSession.id));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttendanceRecords(fetchedRecords);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching attendance records:", error);
        addNotification("Failed to load attendance records.", "error");
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setAttendanceRecords([]);
    }
  }, [db, selectedSession, appId, addNotification]);

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    setCurrentView("classSessions");
  };

  const handleBackToClassList = () => {
    setSelectedClass(null);
    setSelectedSession(null);
    setCurrentView("classList");
  };

  const handleViewSessionDetails = (session) => {
    setSelectedSession(session);
    setCurrentView("sessionDetails");
  };

  const handleBackToClassSessions = () => {
    setSelectedSession(null);
    setCurrentView("classSessions");
  };

  const renderClassList = () => (
    <div className="flex flex-col items-center flex-grow overflow-y-auto gap-4 py-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 pr-2">
      {loading && <Spinner message="Loading classes..." />}
      {uniqueClassesWithSessions.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No sessions recorded yet for any class.</p>
      ) : (
        uniqueClassesWithSessions.map((cls) => (
          <div
            key={cls.id}
            className="w-full md:w-2/3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 shadow-sm cursor-pointer transition-all duration-200 flex justify-between items-center group"
            onClick={() => handleSelectClass(cls)}
          >
            <span className="text-lg font-medium text-gray-700">{cls.name}</span>
            <img className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" src="/src/assets/next.png" alt="view" />
          </div>
        ))
      )}
    </div>
  );

  const renderClassSessions = () => (
    <div className="w-full flex flex-col h-full relative">
      {loading && <Spinner message="Loading sessions..." />}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBackToClassList}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Classes"
        >
          <img src="/src/assets/back.png" alt="back" className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-bold text-blue-800">{selectedClass?.name} Sessions</h2>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md bg-white border border-gray-100 flex-grow scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Session Date & Time</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Total Present</th>
              <th className="px-6 py-3">Total Absent</th>
              <th className="px-6 py-3">Total Students</th>
              <th className="px-6 py-3">% Present</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessionsForClass.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No sessions found for this class.</td>
              </tr>
            ) : (
              filteredSessionsForClass.map((session) => {
                // Calculate present/absent based on actual attendance records if available, otherwise use stored counts
                const totalPresent = attendanceRecords.filter(rec => rec.sessionId === session.id && rec.status === 'present').length;
                const totalStudentsInClass = selectedClass?.students?.length || 0;
                const totalAbsent = totalStudentsInClass - totalPresent;
                const presentPercent = totalStudentsInClass > 0 ? ((totalPresent / totalStudentsInClass) * 100).toFixed(0) : 0;

                return (
                  <tr key={session.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">{new Date(session.startTime).toLocaleString()}</td>
                    <td className={`px-6 py-4 font-semibold ${session.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </td>
                    <td className="px-6 py-4">{totalPresent}</td>
                    <td className="px-6 py-4">{totalAbsent}</td>
                    <td className="px-6 py-4">{totalStudentsInClass}</td>
                    <td className="px-6 py-4">{presentPercent}%</td>
                    <td className="px-6 py-4">
                      <button
                        className="text-blue-600 hover:underline px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                        onClick={() => handleViewSessionDetails(session)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSessionDetails = () => (
    <div className="w-full flex flex-col h-full relative">
      {loading && <Spinner message="Loading attendance records..." />}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBackToClassSessions}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Sessions"
        >
          <img src="/src/assets/back.png" alt="back" className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-bold text-blue-800">
          {selectedClass?.name} - {new Date(selectedSession?.startTime).toLocaleString()}
        </h2>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md bg-white border border-gray-100 flex-grow scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">S. No.</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Roll No.</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Time Marked</th>
            </tr>
          </thead>
          <tbody>
            {selectedClass?.students?.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No students enrolled in this class.</td>
              </tr>
            ) : (
              selectedClass?.students.map((student, index) => {
                const record = attendanceRecords.find(rec => rec.studentId === student.rollNo); // Assuming rollNo is studentId
                const status = record ? 'Present' : 'Absent';
                const timeMarked = record ? new Date(record.timestamp).toLocaleTimeString() : '-';

                return (
                  <tr key={student.rollNo} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{index + 1}</td>
                    <td className="px-6 py-4">{student.name}</td>
                    <td className="px-6 py-4">{student.rollNo}</td>
                    <td className={`px-6 py-4 font-semibold ${status === "Present" ? "text-green-600" : "text-red-500"}`}>
                      {status}
                    </td>
                    <td className="px-6 py-4">{timeMarked}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-6 space-x-4">
        <button
            onClick={() => addNotification("Generating report...", "info")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-semibold"
            disabled={loading}
        >
            Generate Report
        </button>
        <button
            onClick={() => addNotification("Exporting data...", "info")}
            className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors font-semibold"
            disabled={loading}
        >
            Export to Excel
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-2xl font-semibold mb-6 text-blue-700">Attendance Reports</h1>

      {currentView === "classList" && renderClassList()}
      {currentView === "classSessions" && renderClassSessions()}
      {currentView === "sessionDetails" && renderSessionDetails()}
    </div>
  );
}

export default AttendanceReportsTab;
