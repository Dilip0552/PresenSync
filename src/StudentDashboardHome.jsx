import React, { useState } from 'react';
import { Scan, History, UserCircle, X } from 'lucide-react'; 
import Spinner from './Spinner';

function StudentDashboardHome({ studentInfo, addNotification }) {
  const [attendanceHistory, setAttendanceHistory] = useState([
    { id: 1, class: 'Web Development 101', date: '2025-07-30', status: 'Present' },
    { id: 2, class: 'Data Structures & Algorithms', date: '2025-07-29', status: 'Absent' },
    { id: 3, class: 'Database Management', date: '2025-07-28', status: 'Late' },
    { id: 4, class: 'Mathematics 101', date: '2025-07-27', status: 'Present' },
    { id: 5, class: 'Physics Fundamentals', date: '2025-07-26', status: 'Present' },
  ]);

  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const handleScanQRForAttendance = async () => {
    addNotification("Initiating QR scan for attendance...", "info");
    setShowScannerModal(true); 
    setLoadingAttendance(true); 

    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); 

      const success = Math.random() > 0.2; 

      if (success) {
        const newRecord = {
          id: attendanceHistory.length + 1,
          class: "Current Live Session",
          date: new Date().toLocaleDateString('en-CA'), 
          status: "Present"
        };
        setAttendanceHistory(prev => [newRecord, ...prev]);
        addNotification("Attendance marked successfully!", "success");
      } else {
        addNotification("Attendance failed: Identity or location could not be verified.", "error");
      }

    } catch (error) {
      console.error("Error during attendance marking:", error);
      addNotification("An unexpected error occurred during attendance marking.", "error");
    } finally {
      setLoadingAttendance(false);
      setTimeout(() => setShowScannerModal(false), 1500); 
    }
  };

  const handleCancelScan = () => {
    if (!loadingAttendance) {
      setShowScannerModal(false);
      addNotification("QR scan cancelled.", "info");
    } else {
      addNotification("Cannot cancel while processing attendance.", "warning");
    }
  };


  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 sm:p-6 rounded-br-3xl"> 
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8"> 
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-4 sm:mb-0"> 
          Hello, {studentInfo.name.split(' ')[0]}!
        </h1>
        <div className="flex items-center space-x-2 sm:space-x-3 bg-white p-2 rounded-lg shadow-sm"> 
          <UserCircle size={24} sm:size={32} className="text-gray-600" /> 
          <span className="text-base sm:text-xl font-semibold text-gray-700">{studentInfo.id}</span> 
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-blue-100 rounded-xl shadow-lg mb-6 sm:mb-8"> 
        <p className="text-lg sm:text-xl text-blue-700 font-medium mb-4 sm:mb-6 text-center"> 
          Tap below to mark your attendance for the current class session.
        </p>
        <button
          onClick={handleScanQRForAttendance}
          disabled={loadingAttendance}
          className="flex items-center justify-center px-6 py-4 sm:px-10 sm:py-5 bg-blue-600 text-white rounded-lg text-lg sm:text-2xl font-semibold shadow-xl
                      hover:bg-blue-700 transition-colors duration-300 transform hover:scale-105 active:scale-100
                      disabled:bg-blue-300 disabled:cursor-not-allowed w-full max-w-sm" 
        >
          {loadingAttendance ? (
            <>
              Marking Attendance...
              <div className="ml-3 w-6 h-6 sm:ml-4 sm:w-7 sm:h-7"><Spinner /></div> 
            </>
          ) : (
            <>
              <Scan size={24} className="mr-3 sm:mr-4" />
              Scan QR for Attendance
            </>
          )}
        </button>
        {loadingAttendance && (
            <p className="mt-3 sm:mt-4 text-blue-700 font-medium text-sm sm:text-base text-center"> 
                Please wait, verifying identity and location...
            </p>
        )}
      </div>

      <div className="flex-grow bg-white p-4 sm:p-6 rounded-xl shadow-lg"> 
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center"> 
          <History size={24} className="mr-2 sm:mr-3 text-gray-600" /> 
          Recent Attendance
        </h2>
        {attendanceHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">No attendance records found yet.</p> 
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200"> 
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceHistory.slice(0, 5).map((record) => ( 
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.class}</td> 
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td> 
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm"> 
                      <span className={`px-2 py-0.5 sm:px-3 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                        ${record.status === 'Present' ? 'bg-green-100 text-green-800' :
                                          record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'}`
                      }>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showScannerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4"> 
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl text-center flex flex-col items-center relative max-w-md w-full"> 
            <button
              onClick={handleCancelScan}
              disabled={loadingAttendance}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={24} />
            </button>

            <h3 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-3 sm:mb-4">QR Scanner Active</h3> 
            <p className="text-gray-700 mb-4 sm:mb-6 text-base sm:text-lg">Point your camera at the teacher's QR code.</p> 
            <div className="w-64 h-64 sm:w-80 sm:h-80 bg-gray-200 flex items-center justify-center rounded-lg mb-4 sm:mb-6 border-2 border-dashed border-gray-400"> 
              {loadingAttendance ? (
                <Spinner size="lg" />
              ) : (
                <Scan size={48} sm:size={64} className="text-gray-500 animate-pulse" /> 
              )}
            </div>
            {loadingAttendance && (
                <p className="mb-4 text-blue-700 font-semibold text-sm sm:text-base text-center">
                    Processing facial recognition and GPS...
                </p>
            )}
            <button
              onClick={handleCancelScan}
              disabled={loadingAttendance}
              className="px-6 py-2 sm:px-8 sm:py-3 bg-red-500 text-white rounded-lg text-base sm:text-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
            >
              Cancel Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboardHome;