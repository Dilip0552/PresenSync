import React from 'react';

const DashboardCard = ({ title, value, icon, bgColor, textColor }) => (
  <div className={`bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 border-l-4 ${bgColor} transition-shadow duration-300 hover:shadow-lg`}>
    <div className={`p-3 rounded-full ${bgColor.replace('border-l-4', 'bg').replace('500','100')}`}> 
      <img src={icon} alt={title} className="w-8 h-8" />
    </div>
    <div>
      <h4 className="text-lg text-gray-500">{title}</h4>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

function DashboardOverview({ classes, totalSessions }) {
  const totalClasses = classes.length;
  const totalAttendanceRecords = totalSessions.length;
  const totalStudentsOverall = 100; 
  const overallPresentStudents = totalSessions.reduce((sum, session) => sum + session.totalPresent, 0);
  const overallTotalStudentsForSessions = totalSessions.reduce((sum, session) => sum + session.totalStudents, 0);
  const overallAttendanceRate = overallTotalStudentsForSessions > 0
    ? (overallPresentStudents / overallTotalStudentsForSessions) * 100
    : 0;

  const upcomingSessions = totalSessions
    .filter(session => new Date(session.dateAndTime) > new Date())
    .sort((a, b) => new Date(a.dateAndTime) - new Date(b.dateAndTime))
    .slice(0, 3); 

  const recentSessions = totalSessions
    .sort((a, b) => new Date(b.dateAndTime) - new Date(a.dateAndTime))
    .slice(0, 5); 

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Total Classes"
          value={totalClasses}
          icon="/src/assets/presentation.png"
          bgColor="border-blue-500"
          textColor="text-blue-700"
        />
        <DashboardCard
          title="Total Sessions"
          value={totalAttendanceRecords}
          icon="/src/assets/clock.png" 
          bgColor="border-purple-500"
          textColor="text-purple-700"
        />
        <DashboardCard
          title="Overall Attendance"
          value={`${overallAttendanceRate.toFixed(1)}%`}
          icon="/src/assets/approval-stamp.png" 
          bgColor="border-green-500"
          textColor="text-green-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Upcoming Sessions</h3>
          {upcomingSessions.length > 0 ? (
            <ul className="space-y-3">
              {upcomingSessions.map((session, index) => (
                <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700">{session.className}</span>
                    <span className="text-sm text-gray-500">{session.dateAndTime}</span>
                  </div>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors shadow-md">Start Session</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No upcoming sessions. <br/> <button className="text-blue-500 hover:underline">Create a new session?</button></p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Recent Attendance Activity</h3>
          {recentSessions.length > 0 ? (
            <ul className="space-y-3">
              {recentSessions.map((session, index) => (
                <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700">{session.className}</span>
                    <span className="text-sm text-gray-500">{session.dateAndTime}</span>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-md font-medium
                    ${session.presentPercent > 80 ? 'bg-green-100 text-green-700' :
                      session.presentPercent > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {session.totalPresent}/{session.totalStudents} Present ({session.presentPercent}%)
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