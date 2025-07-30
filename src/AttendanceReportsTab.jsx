// src/AttendanceReportsTab.jsx
import { useState, useEffect } from "react";

function AttendanceReportsTab({ totalSessions, classes, addNotification }) {
  const [currentView, setCurrentView] = useState("classList");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);

  const [mockStudentsReports] = useState([
    { name: "Dilip Suthar", rollNo: "24041", status: "Present", time: "10:04 AM" },
    { name: "Chandan Giri", rollNo: "24042", status: "Present", time: "10:05 AM" },
    { name: "Amit Shah", rollNo: "24043", status: "Absent", time: "-" },
    { name: "Kuldeep Saraswat", rollNo: "24044", status: "Absent", time: "-" },
    { name: "Pranjal Dubey", rollNo: "24045", status: "Present", time: "10:07 AM" },
    { name: "Divyanshi Sahu", rollNo: "24046", status: "Present", time: "10:04 AM" },
  ]);

  const uniqueClassesWithSessions = Array.from(new Set(totalSessions.map(session => session.className)));

  const filteredSessionsForClass = totalSessions.filter(
    (item) => item.className === selectedClass
  );

  const handleSelectClass = (clsName) => {
    setSelectedClass(clsName);
    setCurrentView("classSessions");
  };

  const handleBackToClassList = () => {
    setSelectedClass("");
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
    <div className="flex flex-col items-center flex-grow overflow-y-auto gap-4 py-2"> {/* flex-grow, overflow-y-auto */}
      {uniqueClassesWithSessions.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No sessions recorded yet for any class.</p>
      ) : (
        uniqueClassesWithSessions.map((className, index) => (
          <div
            key={index}
            className="w-full md:w-2/3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 shadow-sm cursor-pointer transition-all duration-200 flex justify-between items-center group"
            onClick={() => handleSelectClass(className)}
          >
            <span className="text-lg font-medium text-gray-700">{className}</span>
            <img className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" src="/src/assets/next.png" alt="view" />
          </div>
        ))
      )}
    </div>
  );

  const renderClassSessions = () => (
    <div className="w-full flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBackToClassList}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Classes"
        >
          <img src="/src/assets/back.png" alt="back" className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-bold text-blue-800">{selectedClass} Sessions</h2>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md bg-white border border-gray-100 flex-grow">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Session Date & Time</th>
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
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No sessions found for this class.</td>
              </tr>
            ) : (
              filteredSessionsForClass.map((session, index) => (
                <tr key={session.classID || index} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">{session.dateAndTime}</td>
                  <td className="px-6 py-4">{session.totalPresent}</td>
                  <td className="px-6 py-4">{session.totalAbsent}</td>
                  <td className="px-6 py-4">{session.totalStudents}</td>
                  <td className="px-6 py-4">{session.presentPercent}%</td>
                  <td className="px-6 py-4">
                    <button
                      className="text-blue-600 hover:underline px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                      onClick={() => handleViewSessionDetails(session)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSessionDetails = () => (
    <div className="w-full flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBackToClassSessions}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Sessions"
        >
          <img src="/src/assets/back.png" alt="back" className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-bold text-blue-800">{selectedClass} - {selectedSession?.dateAndTime}</h2>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md bg-white border border-gray-100 flex-grow">
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
            {mockStudentsReports.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No student attendance recorded for this session.</td>
              </tr>
            ) : (
              mockStudentsReports.map((student, index) => (
                <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{index + 1}</td>
                  <td className="px-6 py-4">{student.name}</td>
                  <td className="px-6 py-4">{student.rollNo}</td>
                  <td className={`px-6 py-4 font-semibold ${student.status === "Present" ? "text-green-600" : "text-red-500"}`}>
                    {student.status}
                  </td>
                  <td className="px-6 py-4">{student.time}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-6 space-x-4">
        <button
            onClick={() => addNotification("Generating report...", "info")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-semibold"
        >
            Generate Report
        </button>
        <button
            onClick={() => addNotification("Exporting data...", "info")}
            className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors font-semibold"
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