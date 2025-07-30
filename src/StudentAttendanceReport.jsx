import React, { useState, useEffect } from 'react';
import { ChartBar, CalendarDays, BookOpen, Clock, AlertTriangle } from 'lucide-react';

function StudentAttendanceReport({ studentInfo, addNotification }) {
  const [detailedAttendance, setDetailedAttendance] = useState([
    { id: 'att001', class: 'Web Development 101', date: '2025-07-30', time: '10:00 AM', status: 'Present' },
    { id: 'att002', class: 'Data Structures & Algorithms', date: '2025-07-29', time: '09:00 AM', status: 'Absent' },
    { id: 'att003', class: 'Database Management', date: '2025-07-28', time: '02:00 PM', status: 'Late', lateMinutes: 15 },
    { id: 'att004', class: 'Mathematics 101', date: '2025-07-27', time: '11:00 AM', status: 'Present' },
    { id: 'att005', class: 'Physics Fundamentals', date: '2025-07-26', time: '09:00 AM', status: 'Present' },
    { id: 'att006', class: 'Web Development 101', date: '2025-07-23', time: '10:00 AM', status: 'Present' },
    { id: 'att007', class: 'Data Structures & Algorithms', date: '2025-07-22', time: '09:00 AM', status: 'Absent' },
    { id: 'att008', class: 'Database Management', date: '2025-07-21', time: '02:00 PM', status: 'Present' },
    { id: 'att009', class: 'Mathematics 101', date: '2025-07-20', time: '11:00 AM', status: 'Present' },
    { id: 'att010', class: 'Physics Fundamentals', date: '2025-07-19', time: '09:00 AM', status: 'Late', lateMinutes: 5 },
    { id: 'att011', class: 'Web Development 101', date: '2025-07-16', time: '10:00 AM', status: 'Present' },
    { id: 'att012', class: 'Data Structures & Algorithms', date: '2025-07-15', time: '09:00 AM', status: 'Absent' },
    { id: 'att013', class: 'Database Management', date: '2025-07-14', time: '02:00 PM', status: 'Present' },
    { id: 'att014', class: 'Mathematics 101', date: '2025-07-13', time: '11:00 AM', status: 'Present' },
    { id: 'att015', class: 'Physics Fundamentals', date: '2025-07-12', time: '09:00 AM', status: 'Present' },
  ]);

  // Calculate overall statistics
  const totalClasses = detailedAttendance.length;
  const presentCount = detailedAttendance.filter(rec => rec.status === 'Present').length;
  const absentCount = detailedAttendance.filter(rec => rec.status === 'Absent').length;
  const lateCount = detailedAttendance.filter(rec => rec.status === 'Late').length;

  const presentPercentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 0;
  const absentPercentage = totalClasses > 0 ? ((absentCount / totalClasses) * 100).toFixed(1) : 0;
  const latePercentage = totalClasses > 0 ? ((lateCount / totalClasses) * 100).toFixed(1) : 0;

  useEffect(() => {
      addNotification("Attendance report loaded.", "info");
  }, [addNotification]);

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 sm:p-6 rounded-br-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-6 sm:mb-8 flex items-center">
        <ChartBar size={28} className="mr-2 sm:mr-3 text-blue-600" /> 
        My Attendance Report
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md text-center border border-green-200">
          <h3 className="text-base sm:text-xl font-semibold text-gray-700 mb-1 sm:mb-2">Present</h3>
          <p className="text-3xl sm:text-4xl font-bold text-green-600">{presentCount}</p>
          <p className="text-xs sm:text-sm text-gray-500">({presentPercentage}%)</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md text-center border border-red-200">
          <h3 className="text-base sm:text-xl font-semibold text-gray-700 mb-1 sm:mb-2">Absent</h3>
          <p className="text-3xl sm:text-4xl font-bold text-red-600">{absentCount}</p>
          <p className="text-xs sm:text-sm text-gray-500">({absentPercentage}%)</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md text-center border border-yellow-200">
          <h3 className="text-base sm:text-xl font-semibold text-gray-700 mb-1 sm:mb-2">Late</h3>
          <p className="text-3xl sm:text-4xl font-bold text-yellow-600">{lateCount}</p>
          <p className="text-xs sm:text-sm text-gray-500">({latePercentage}%)</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md text-center border border-blue-200">
          <h3 className="text-base sm:text-xl font-semibold text-gray-700 mb-1 sm:mb-2">Total Classes</h3>
          <p className="text-3xl sm:text-4xl font-bold text-blue-600">{totalClasses}</p>
          <p className="text-xs sm:text-sm text-gray-500">Records tracked</p>
        </div>
      </div>

      {/* Detailed Attendance List */}
      <div className="flex-grow bg-white p-4 sm:p-6 rounded-xl shadow-lg"> {/* Reduced mobile padding */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
          <CalendarDays size={24} className="mr-2 sm:mr-3 text-gray-600" /> {/* Smaller icon on mobile */}
          Detailed Attendance Log
        </h2>
        {detailedAttendance.length === 0 ? (
          <p className="text-gray-500 text-center py-6 sm:py-8">No detailed attendance records available.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200"> {/* Makes table scroll horizontally */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detailedAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.class}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">{record.time}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-0.5 sm:px-3 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                        ${record.status === 'Present' ? 'bg-green-100 text-green-800' :
                                          record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'}`
                      }>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-500">
                      {record.status === 'Late' && `Late by ${record.lateMinutes} min`}
                      {record.status === 'Absent' && `Reason not provided`}
                      {record.status === 'Present' && `-`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentAttendanceReport;