import React from 'react';
import { LayoutDashboard, Clock, CheckCircle, Users } from 'lucide-react'; // Import icons from lucide-react

const DashboardCard = ({ title, value, icon: Icon, bgColor, textColor }) => (
  <div className={`bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 border-l-4 ${bgColor} transition-shadow duration-300 hover:shadow-lg`}>
    <div className={`p-3 rounded-full ${bgColor.replace('border-l-4', 'bg').replace('500','100')}`}>
      <Icon size={28} className={textColor.replace('text', 'text-opacity-80')} /> {/* Use Lucide Icon */}
    </div>
    <div>
      <h4 className="text-lg text-gray-500">{title}</h4>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

function DashboardOverview({ classes, totalSessions }) {
  const totalClasses = classes.length;
  const totalSessionsCount = totalSessions.length; // Renamed for clarity

  // Calculate total unique students across all classes
  const allStudents = new Set();
  classes.forEach(cls => {
    (cls.students || []).forEach(student => {
      allStudents.add(student.rollNo); // Assuming rollNo is unique across all students
    });
  });
  const totalStudentsOverall = allStudents.size;

  // Calculate overall attendance rate based on actual attendance records
  // This would ideally require a separate query to attendanceRecords collection for accurate counts
  // For now, we'll use the totalPresent and totalStudents from session data (if available)
  const overallPresentStudents = totalSessions.reduce((sum, session) => sum + (session.totalPresent || 0), 0);
  const overallTotalStudentsForSessions = totalSessions.reduce((sum, session) => sum + (session.totalStudents || 0), 0);

  const overallAttendanceRate = overallTotalStudentsForSessions > 0
    ? (overallPresentStudents / overallTotalStudentsForSessions) * 100
    : 0;

  const now = new Date();

  const upcomingSessions = totalSessions
    .filter(session => new Date(session.startTime) > now && session.status === 'active') // Filter active upcoming sessions
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 3); // Limit to 3 upcoming sessions

  const recentSessions = totalSessions
    .filter(session => new Date(session.startTime) <= now) // Filter sessions that have started or ended
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, 5); // Limit to 5 recent sessions

  return (
    <div className="space-y-8 p-2"> {/* Added some padding */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Total Classes"
          value={totalClasses}
          icon={LayoutDashboard} // Using Lucide icon
          bgColor="border-blue-500"
          textColor="text-blue-700"
        />
        <DashboardCard
          title="Total Sessions"
          value={totalSessionsCount}
          icon={Clock} // Using Lucide icon
          bgColor="border-purple-500"
          textColor="text-purple-700"
        />
        <DashboardCard
          title="Overall Attendance"
          value={`${overallAttendanceRate.toFixed(1)}%`}
          icon={CheckCircle} // Using Lucide icon
          bgColor="border-green-500"
          textColor="text-green-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Upcoming Sessions</h3>
          {upcomingSessions.length > 0 ? (
            <ul className="space-y-3">
              {upcomingSessions.map((session) => (
                <li key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700">{session.className}</span>
                    <span className="text-sm text-gray-500">{new Date(session.startTime).toLocaleString()}</span>
                  </div>
                  {/* The "Start Session" button functionality would typically be handled in CreateSessionTab or a dedicated session management page */}
                  <button className="mt-2 sm:mt-0 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors shadow-md">View Session</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No upcoming sessions. <br/> <span className="text-blue-500">Create a new session from the sidebar!</span></p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Recent Attendance Activity</h3>
          {recentSessions.length > 0 ? (
            <ul className="space-y-3">
              {recentSessions.map((session) => (
                <li key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700">{session.className}</span>
                    <span className="text-sm text-gray-500">{new Date(session.startTime).toLocaleString()}</span>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-md font-medium
                    ${session.totalPresent / (session.totalStudents || 1) > 0.8 ? 'bg-green-100 text-green-700' :
                      session.totalPresent / (session.totalStudents || 1) > 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {session.totalPresent || 0}/{(session.totalStudents || 0)} Present (
                    {(session.totalStudents > 0 ? ((session.totalPresent / session.totalStudents) * 100) : 0).toFixed(0)}%)
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;
