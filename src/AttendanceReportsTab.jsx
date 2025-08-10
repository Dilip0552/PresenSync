// Updated AttendanceReportsTab.jsx with working Report Generation and Excel Export

import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";
import back from "./assets/back.png"
import next from "./assets/next.png"
import { AnimatePresence, motion } from "framer-motion";

// Utility functions for report generation and export
const generateAttendanceReport = (selectedClass, selectedSession, attendanceRecords) => {
  const reportData = {
    sessionInfo: {
      className: selectedClass?.name,
      sessionDate: new Date(selectedSession?.startTime).toLocaleDateString(),
      sessionTime: new Date(selectedSession?.startTime).toLocaleTimeString(),
      sessionId: selectedSession?.id,
      totalStudents: selectedClass?.students?.length || 0,
      totalPresent: attendanceRecords.length,
      totalAbsent: (selectedClass?.students?.length || 0) - attendanceRecords.length,
      attendancePercentage: selectedClass?.students?.length ? 
        ((attendanceRecords.length / selectedClass.students.length) * 100).toFixed(2) : 0
    },
    studentDetails: selectedClass?.students?.map((student, index) => {
      const record = attendanceRecords.find(rec => 
        rec.studentId === student.uid || rec.studentRollNo === student.rollNo
      );
      
      return {
        sNo: index + 1,
        name: student.name,
        rollNo: student.rollNo,
        status: record ? 'Present' : 'Absent',
        timeMarked: record?.timestamp?.toDate ? 
          record.timestamp.toDate().toLocaleString() : '-',
        faceMatchConfidence: record?.faceMatchConfidence || '-'
      };
    }) || []
  };
  
  return reportData;
};

const generateReportHTML = (reportData) => {
  const { sessionInfo, studentDetails } = reportData;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Attendance Report - ${sessionInfo.className}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
            .header h1 { color: #2563eb; margin: 0; }
            .header p { margin: 5px 0; color: #666; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .summary-card { padding: 15px; border-radius: 8px; text-align: center; }
            .summary-card.present { background: #dcfce7; border: 1px solid #16a34a; }
            .summary-card.absent { background: #fef2f2; border: 1px solid #dc2626; }
            .summary-card.total { background: #dbeafe; border: 1px solid #2563eb; }
            .summary-card h3 { margin: 0; font-size: 24px; }
            .summary-card p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border: 1px solid #e5e7eb; }
            th { background: #f3f4f6; font-weight: bold; color: #374151; }
            tr:nth-child(even) { background: #f9fafb; }
            .status-present { color: #16a34a; font-weight: bold; }
            .status-absent { color: #dc2626; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Attendance Report</h1>
            <p><strong>Class:</strong> ${sessionInfo.className}</p>
            <p><strong>Date:</strong> ${sessionInfo.sessionDate} at ${sessionInfo.sessionTime}</p>
            <p><strong>Session ID:</strong> ${sessionInfo.sessionId}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card total">
                <h3>${sessionInfo.totalStudents}</h3>
                <p>Total Students</p>
            </div>
            <div class="summary-card present">
                <h3>${sessionInfo.totalPresent}</h3>
                <p>Present</p>
            </div>
            <div class="summary-card absent">
                <h3>${sessionInfo.totalAbsent}</h3>
                <p>Absent</p>
            </div>
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
            <h2>Attendance Percentage: ${sessionInfo.attendancePercentage}%</h2>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>S. No.</th>
                    <th>Student Name</th>
                    <th>Roll No.</th>
                    <th>Status</th>
                    <th>Time Marked</th>
                </tr>
            </thead>
            <tbody>
                ${studentDetails.map(student => `
                    <tr>
                        <td>${student.sNo}</td>
                        <td>${student.name}</td>
                        <td>${student.rollNo}</td>
                        <td class="status-${student.status.toLowerCase()}">${student.status}</td>
                        <td>${student.timeMarked}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()} | PresenSync Attendance System</p>
        </div>
        
        <script>
            // Auto-print functionality
            window.addEventListener('load', function() {
                setTimeout(() => window.print(), 500);
            });
        </script>
    </body>
    </html>
  `;
};

const exportToExcel = (reportData) => {
  const { sessionInfo, studentDetails } = reportData;
  
  // Create CSV content
  const headers = ['S. No.', 'Student Name', 'Roll No.', 'Status', 'Time Marked'];
  const csvRows = [
    // Session information
    ['Attendance Report'],
    ['Class:', sessionInfo.className],
    ['Date:', sessionInfo.sessionDate],
    ['Time:', sessionInfo.sessionTime],
    ['Session ID:', sessionInfo.sessionId],
    [''],
    ['Summary:'],
    ['Total Students:', sessionInfo.totalStudents],
    ['Present:', sessionInfo.totalPresent],
    ['Absent:', sessionInfo.totalAbsent],
    ['Attendance %:', sessionInfo.attendancePercentage + '%'],
    [''],
    // Headers
    headers,
    // Student data
    ...studentDetails.map(student => [
      student.sNo,
      student.name,
      student.rollNo,
      student.status,
      student.timeMarked
    ])
  ];
  
  // Convert to CSV string
  const csvContent = csvRows.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_${sessionInfo.className}_${sessionInfo.sessionDate.replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

function AttendanceReportsTab({ totalSessions, classes, addNotification }) {
  const [currentView, setCurrentView] = useState("classList");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { db, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'presensync-app';

  // Filter unique classes that have sessions
  const uniqueClassesWithSessions = Array.from(new Set(totalSessions.map(session => session.className)))
    .map(className => classes.find(cls => cls.name === className))
    .filter(Boolean);

  // Filter sessions for the currently selected class
  const filteredSessionsForClass = totalSessions.filter(
    (session) => session.classId === selectedClass?.id
  ).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  // Fetch attendance records for the selected session with enhanced debugging
  useEffect(() => {
    let unsubscribe;

    if (db && userId && selectedSession?.id && currentView === 'sessionDetails') {
      setLoading(true);
      console.log('AttendanceReportsTab: Setting up attendance listener...');
      console.log('AttendanceReportsTab: Session ID:', selectedSession.id);
      console.log('AttendanceReportsTab: Teacher ID (userId):', userId);
      console.log('AttendanceReportsTab: App ID:', appId);
      
      try {
        // Construct the exact path that the backend writes to
        const attendancePath = `artifacts/${appId}/users/${userId}/sessions/${selectedSession.id}/attendance`;
        console.log('AttendanceReportsTab: Attendance collection path:', attendancePath);
        
        const attendanceCollectionRef = collection(db, attendancePath);
        const q = query(attendanceCollectionRef);

        unsubscribe = onSnapshot(q, (snapshot) => {
          console.log('AttendanceReportsTab: Snapshot received, doc count:', snapshot.docs.length);
          
          const fetchedRecords = snapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            console.log('AttendanceReportsTab: Attendance record found:', {
              docId: doc.id,
              studentId: data.studentId,
              studentName: data.studentName,
              status: data.status,
              timestamp: data.timestamp
            });
            return data;
          });
          
          setAttendanceRecords(fetchedRecords);
          setLoading(false);
          
          if (fetchedRecords.length > 0) {
            addNotification(`${fetchedRecords.length} attendance records loaded.`, "info");
          } else {
            console.log('AttendanceReportsTab: No attendance records found for this session');
            addNotification("No attendance records found for this session.", "info");
          }
        }, (error) => {
          console.error("AttendanceReportsTab: Error fetching attendance records:", error);
          console.error("AttendanceReportsTab: Failed path:", attendancePath);
          addNotification("Failed to load attendance records.", "error");
          setLoading(false);
        });
      } catch (error) {
        console.error("AttendanceReportsTab: Error setting up attendance listener:", error);
        addNotification("Failed to set up attendance listener.", "error");
        setLoading(false);
      }
    } else {
      console.log('AttendanceReportsTab: Clearing attendance records');
      setAttendanceRecords([]);
    }

    return () => {
      if (unsubscribe) {
        console.log('AttendanceReportsTab: Cleaning up attendance listener');
        unsubscribe();
      }
    };
  }, [db, userId, selectedSession, appId, addNotification, currentView]);

  // Handle Generate Report
  const handleGenerateReport = async () => {
    if (!selectedClass || !selectedSession) {
      addNotification("Please select a class and session first.", "error");
      return;
    }

    setReportGenerating(true);
    addNotification("Generating attendance report...", "info");

    try {
      // Generate report data
      const reportData = generateAttendanceReport(selectedClass, selectedSession, attendanceRecords);
      
      // Generate HTML report
      const reportHTML = generateReportHTML(reportData);
      
      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHTML);
        printWindow.document.close();
        addNotification("Report generated successfully! Check the new window.", "success");
      } else {
        // Fallback: download as HTML file
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Attendance_Report_${selectedClass.name}_${new Date(selectedSession.startTime).toLocaleDateString().replace(/\//g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addNotification("Report downloaded as HTML file!", "success");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      addNotification("Failed to generate report. Please try again.", "error");
    } finally {
      setReportGenerating(false);
    }
  };

  // Handle Export to Excel
  const handleExportToExcel = async () => {
    if (!selectedClass || !selectedSession) {
      addNotification("Please select a class and session first.", "error");
      return;
    }

    setExporting(true);
    addNotification("Exporting to Excel...", "info");

    try {
      // Generate report data
      const reportData = generateAttendanceReport(selectedClass, selectedSession, attendanceRecords);
      
      // Export as CSV (Excel compatible)
      exportToExcel(reportData);
      
      addNotification("Data exported successfully! Check your downloads folder.", "success");
    } catch (error) {
      console.error("Error exporting data:", error);
      addNotification("Failed to export data. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleSelectClass = (cls) => {
    console.log('AttendanceReportsTab: Selected class:', cls.name, 'ID:', cls.id);
    setSelectedClass(cls);
    setCurrentView("classSessions");
  };

  const handleBackToClassList = () => {
    setSelectedClass(null);
    setSelectedSession(null);
    setCurrentView("classList");
  };

  const handleViewSessionDetails = (session) => {
    console.log('AttendanceReportsTab: Viewing session details:', {
      sessionId: session.id,
      className: session.className,
      startTime: session.startTime,
      totalPresent: session.totalPresent,
      totalStudents: session.totalStudents
    });
    setSelectedSession(session);
    setCurrentView("sessionDetails");
  };

  const handleBackToClassSessions = () => {
    setSelectedSession(null);
    setCurrentView("classSessions");
  };

  // Rest of your render functions remain the same...
  const renderClassList = () => (
    <>
    <AnimatePresence mode="wait">
    
          <motion.div
                key="classList-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex flex-col items-start justify-start relative"
                >
    <div className="flex flex-col items-center flex-grow overflow-y-auto gap-4 py-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 pr-2 w-full">
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
            <img className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" src={next} alt="view" />
          </div>
        ))
      )}
    </div>
    </motion.div>
    </AnimatePresence>
    </>
  );

  const renderClassSessions = () => (
    <>
    <AnimatePresence mode="wait">
    
          <motion.div
                key="classSession-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex flex-col items-start justify-start relative"
                >
    <div className="w-full flex flex-col h-full relative">
      {loading && <Spinner message="Loading sessions..." />}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBackToClassList}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Classes"
        >
          <img src={back} alt="back" className="w-5 h-5" />
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
                const totalPresent = session.totalPresent || 0;
                const totalStudentsInClass = session.totalStudents || 0;
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
    </motion.div>
    </AnimatePresence>
    </>
  );

  const renderSessionDetails = () => (
    <>
    <AnimatePresence mode="wait">
    
          <motion.div
                key="sessionDetails-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex flex-col items-start justify-start relative"
                >
    <div className="w-full flex flex-col h-full relative">
      {loading && <Spinner message="Loading attendance records..." />}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBackToClassSessions}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Back to Sessions"
        >
          <img src={back} alt="back" className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-bold text-blue-800">
          {selectedClass?.name} - {new Date(selectedSession?.startTime).toLocaleString()}
        </h2>
      </div>

      {/* Debug Information */}
      {/* <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>Debug Info:</strong> Found {attendanceRecords.length} attendance records | 
          Session ID: {selectedSession?.id} | 
          Expected Students: {selectedClass?.students?.length || 0}
        </p>
      </div> */}

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
                // IMPROVED: Match by both studentId and rollNo for better accuracy
                const record = attendanceRecords.find(rec => 
                  rec.studentId === student.uid || 
                  rec.studentRollNo === student.rollNo
                );
                
                const status = record ? 'Present' : 'Absent';
                const timeMarked = record?.timestamp?.toDate ? 
                  record.timestamp.toDate().toLocaleTimeString() : 
                  (record?.timestamp || '-');

                // Debug log for each student
                if (index === 0) {
                  console.log('AttendanceReportsTab: Sample student matching:', {
                    studentUid: student.uid,
                    studentRollNo: student.rollNo,
                    foundRecord: !!record,
                    recordData: record ? {
                      studentId: record.studentId,
                      studentRollNo: record.studentRollNo,
                      timestamp: record.timestamp
                    } : null
                  });
                }

                return (
                  <tr key={student.uid || student.rollNo} className="border-b hover:bg-gray-50 transition-colors">
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
            onClick={handleGenerateReport}
            className={`px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2 ${reportGenerating ? 'opacity-75 cursor-not-allowed' : ''}`}
            disabled={loading || reportGenerating}
        >
            {reportGenerating && <Spinner size="small" color="white" isVisible={true} />}
            {reportGenerating ? 'Generating...' : 'Generate Report'}
        </button>
        <button
            onClick={handleExportToExcel}
            className={`px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 ${exporting ? 'opacity-75 cursor-not-allowed' : ''}`}
            disabled={loading || exporting}
        >
            {exporting && <Spinner size="small" color="white" isVisible={true} />}
            {exporting ? 'Exporting...' : 'Export to Excel'}
        </button>
      </div>
    </div>
    </motion.div>
    </AnimatePresence>
    </>
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