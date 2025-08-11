import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, where, getDocs, doc, writeBatch, getDoc } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";
import { Plus, Minus, BookOpen, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import back from "./assets/back.png";
import next from "./assets/next.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Utility functions for report generation and export
const generateAttendanceReport = (selectedClass, selectedSession, attendanceRecords) => {
  const enrolledStudents = selectedClass?.enrolledStudents?.map(id => {
    const studentData = attendanceRecords.find(rec => rec.studentId === id);
    return {
      uid: id,
      name: studentData?.studentName || 'Unknown Student',
      rollNo: studentData?.studentRollNo || 'N/A'
    };
  }) || [];

  const reportData = {
    sessionInfo: {
      className: selectedClass?.name,
      sessionDate: new Date(selectedSession?.startTime).toLocaleDateString(),
      sessionTime: new Date(selectedSession?.startTime).toLocaleTimeString(),
      sessionId: selectedSession?.id,
      totalStudents: enrolledStudents.length,
      totalPresent: attendanceRecords.length,
      totalAbsent: enrolledStudents.length - attendanceRecords.length,
      attendancePercentage: enrolledStudents.length > 0 ?
        ((attendanceRecords.length / enrolledStudents.length) * 100).toFixed(2) : 0
    },
    studentDetails: enrolledStudents.map((student, index) => {
      const record = attendanceRecords.find(rec => rec.studentId === student.uid);
      
      return {
        sNo: index + 1,
        name: student.name,
        rollNo: student.rollNo,
        status: record ? 'Present' : 'Absent',
        timeMarked: record?.timestamp?.toDate ?
          record.timestamp.toDate().toLocaleString() : '-'
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

function AdminClassManagement({ addNotification }) {
  const [allClasses, setAllClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('allClasses'); // allClasses, classSessions, sessionDetails, manageStudents
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

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
  
      // Get the class document to update its student list
      const classRef = doc(db, `artifacts/${appId}/users/${teacherId}/classes`, classId);
      const classSnap = await getDoc(classRef);
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
  
      // Also update the student's profile to include/remove the class
      const studentPrivateProfileRef = doc(db, `artifacts/${appId}/users/${studentId}/profile`, 'userProfile');
      const studentPublicProfileRef = doc(db, `artifacts/${appId}/public/data/allUserProfiles`, studentId);

      const studentData = allStudents.find(s => s.id === studentId);
      const currentEnrolledClasses = studentData?.enrolledClasses || [];
      
      let updatedEnrolledClasses;
      if (action === 'enroll') {
        updatedEnrolledClasses = [...new Set([...currentEnrolledClasses, classId])];
      } else {
        updatedEnrolledClasses = currentEnrolledClasses.filter(id => id !== classId);
      }
      
      batch.update(studentPrivateProfileRef, { enrolledClasses: updatedEnrolledClasses });
      batch.update(studentPublicProfileRef, { enrolledClasses: updatedEnrolledClasses });

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

  // Helper function to get students enrolled in the current class
  const getEnrolledStudents = (classId) => {
    const classData = allClasses.find(cls => cls.id === classId);
    if (!classData || !classData.enrolledStudents) return [];
    return allStudents.filter(student => classData.enrolledStudents.includes(student.id));
  };
  
  // Helper function to get students not enrolled in the current class
  const getAvailableStudents = (classId) => {
    const classData = allClasses.find(cls => cls.id === classId);
    if (!classData) return allStudents;
    const enrolledIds = new Set(classData.enrolledStudents);
    return allStudents.filter(student => !enrolledIds.has(student.id));
  };
  
  const handleGenerateReport = async () => {
    if (!selectedClass || !selectedSession) {
      addNotification("Please select a class and session first.", "error");
      return;
    }

    setReportGenerating(true);
    addNotification("Generating attendance report...", "info");

    try {
      const reportData = generateAttendanceReport(selectedClass, selectedSession, attendanceRecords);
      const doc = new jsPDF();
      doc.text("Attendance Report", 14, 15);
      doc.text(`Class: ${reportData.sessionInfo.className}`, 14, 25);
      doc.text(`Session: ${reportData.sessionInfo.sessionDate} at ${reportData.sessionInfo.sessionTime}`, 14, 30);
      doc.text(`Total Students: ${reportData.sessionInfo.totalStudents}`, 14, 35);
      doc.text(`Present: ${reportData.sessionInfo.totalPresent}`, 14, 40);
      doc.text(`Absent: ${reportData.sessionInfo.totalAbsent}`, 14, 45);
      doc.text(`Attendance %: ${reportData.sessionInfo.attendancePercentage}%`, 14, 50);

      autoTable(doc, {
        head: [["S. No.", "Student Name", "Roll No.", "Status", "Time Marked"]],
        body: reportData.studentDetails.map(student => [
          student.sNo,
          student.name,
          student.rollNo,
          student.status,
          student.timeMarked
        ]),
        startY: 60
      });

      doc.save(`Attendance_Report_${selectedClass.name}_${new Date(selectedSession.startTime).toLocaleDateString().replace(/\//g, '-')}.pdf`);
      addNotification("PDF report generated successfully!", "success");
    } catch (error) {
      console.error("Error generating report:", error);
      addNotification("Failed to generate report. Please try again.", "error");
    } finally {
      setReportGenerating(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!selectedClass || !selectedSession) {
      addNotification("Please select a class and session first.", "error");
      return;
    }
  
    setExporting(true);
    addNotification("Exporting to Excel...", "info");

    try {
      const reportData = generateAttendanceReport(selectedClass, selectedSession, attendanceRecords);
      
      const headers = ['S. No.', 'Student Name', 'Roll No.', 'Status', 'Time Marked'];
      const csvRows = [
        ['Attendance Report'],
        ['Class:', reportData.sessionInfo.className],
        ['Date:', reportData.sessionInfo.sessionDate],
        ['Time:', reportData.sessionInfo.sessionTime],
        ['Session ID:', reportData.sessionInfo.sessionId],
        [''],
        ['Summary:'],
        ['Total Students:', reportData.sessionInfo.totalStudents],
        ['Present:', reportData.sessionInfo.totalPresent],
        ['Absent:', reportData.sessionInfo.totalAbsent],
        ['Attendance %:', reportData.sessionInfo.attendancePercentage + '%'],
        [''],
        headers,
        ...reportData.studentDetails.map(student => [
          student.sNo,
          student.name,
          student.rollNo,
          student.status,
          student.timeMarked
        ])
      ];
      
      const csvContent = csvRows.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_${reportData.sessionInfo.className}_${reportData.sessionInfo.sessionDate.replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      addNotification("Data exported successfully! Check your downloads folder.", "success");
    } catch (error) {
      console.error("Error exporting data:", error);
      addNotification("Failed to export data. Please try again.", "error");
    } finally {
      setExporting(false);
    }
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
            {!loading && getEnrolledStudents(selectedClass.id).length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No students enrolled in this class.</td></tr>
            ) : (
              getEnrolledStudents(selectedClass.id).map((student) => {
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
    </>
  );

  const renderManageStudents = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { setView('allClasses'); }}
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