import React, { useState } from 'react';
import { LayoutDashboard, Users, BookOpen, CalendarCheck, Bell, Settings, LogOut, Menu, X } from 'lucide-react';

const AdminOverview = ({ addNotification }) => {
  const stats = [
    { label: 'Total Students', value: 1250, icon: <Users size={24} className="text-blue-500" /> },
    { label: 'Active Courses', value: 45, icon: <BookOpen size={24} className="text-green-500" /> },
    { label: 'Pending Registrations', value: 8, icon: <Bell size={24} className="text-yellow-500" /> },
    { label: 'Recent Absences', value: 15, icon: <CalendarCheck size={24} className="text-red-500" /> },
  ];

  const recentActivities = [
    { id: 1, type: 'User Registered', details: 'John Smith (ID: STU1251) enrolled in Computer Science.', date: '2025-07-30 14:30' },
    { id: 2, type: 'Course Updated', details: 'Web Dev 101 syllabus updated by Admin.', date: '2025-07-29 10:15' },
    { id: 3, type: 'Attendance Marked', details: 'All students for Database Management marked present.', date: '2025-07-29 09:00' },
    { id: 4, type: 'New Announcement', details: 'Holiday on August 15th announced to all students.', date: '2025-07-28 16:00' },
  ];

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Dashboard Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-blue-50 p-4 rounded-lg shadow-sm flex items-center space-x-4">
            <div className="flex-shrink-0">
              {stat.icon}
            </div>
            <div>
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activities</h3>
        <ul className="divide-y divide-gray-200">
          {recentActivities.map(activity => (
            <li key={activity.id} className="py-3 flex items-start">
              <span className="flex-shrink-0 w-3 h-3 bg-blue-400 rounded-full mt-1.5 mr-3"></span>
              <div>
                <p className="text-gray-800 font-medium">{activity.type}</p>
                <p className="text-gray-600 text-sm">{activity.details}</p>
                <p className="text-gray-400 text-xs mt-1">{activity.date}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};


function AdminDashboard({ addNotification }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminOverview addNotification={addNotification} />;
      case 'user-management':
        return (
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">User Management</h2>
            <p className="text-sm sm:text-base text-gray-600">Manage student and faculty accounts here.</p>
          </div>
        );
      case 'course-management':
        return (
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Course Management</h2>
            <p className="text-sm sm:text-base text-gray-600">Administer courses, classes, and schedules.</p>
          </div>
        );
      case 'attendance-oversight':
        return (
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Attendance Oversight</h2>
            <p className="text-sm sm:text-base text-gray-600">Monitor attendance records across all classes.</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Announcements & Notifications</h2>
            <p className="text-sm sm:text-base text-gray-600">Send system-wide announcements to students.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Settings</h2>
            <p className="text-sm sm:text-base text-gray-600">Configure dashboard and system settings.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const handleSidebarItemClick = (section) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100"> 
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-blue-800 text-white flex flex-col p-4 shadow-lg
          transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:shadow-none`} 
      >
        <div className="flex justify-between items-center mb-6 lg:mb-8 border-b border-blue-700 pb-4">
          <div className="text-xl sm:text-2xl font-semibold">Admin Panel</div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-300 p-1 rounded-md"
            aria-label="Close sidebar"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex-grow">
          <ul>
            <li className="mb-1 sm:mb-2">
              <button
                onClick={() => handleSidebarItemClick('overview')}
                className={`flex items-center w-full p-2 sm:p-3 rounded-lg text-left text-sm sm:text-base transition-colors duration-200
                  ${activeSection === 'overview' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-700'}`}
              >
                <LayoutDashboard size={18} className="mr-2 sm:mr-3" />
                Dashboard
              </button>
            </li>
            <li className="mb-1 sm:mb-2">
              <button
                onClick={() => handleSidebarItemClick('user-management')}
                className={`flex items-center w-full p-2 sm:p-3 rounded-lg text-left text-sm sm:text-base transition-colors duration-200
                  ${activeSection === 'user-management' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-700'}`}
              >
                <Users size={18} className="mr-2 sm:mr-3" />
                User Management
              </button>
            </li>
            <li className="mb-1 sm:mb-2">
              <button
                onClick={() => handleSidebarItemClick('course-management')}
                className={`flex items-center w-full p-2 sm:p-3 rounded-lg text-left text-sm sm:text-base transition-colors duration-200
                  ${activeSection === 'course-management' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-700'}`}
              >
                <BookOpen size={18} className="mr-2 sm:mr-3" />
                Course Management
              </button>
            </li>
            <li className="mb-1 sm:mb-2">
              <button
                onClick={() => handleSidebarItemClick('attendance-oversight')}
                className={`flex items-center w-full p-2 sm:p-3 rounded-lg text-left text-sm sm:text-base transition-colors duration-200
                  ${activeSection === 'attendance-oversight' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-700'}`}
              >
                <CalendarCheck size={18} className="mr-2 sm:mr-3" />
                Attendance Oversight
              </button>
            </li>
            <li className="mb-1 sm:mb-2">
              <button
                onClick={() => handleSidebarItemClick('notifications')}
                className={`flex items-center w-full p-2 sm:p-3 rounded-lg text-left text-sm sm:text-base transition-colors duration-200
                  ${activeSection === 'notifications' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-700'}`}
              >
                <Bell size={18} className="mr-2 sm:mr-3" />
                Announcements
              </button>
            </li>
            <li className="mb-1 sm:mb-2">
              <button
                onClick={() => handleSidebarItemClick('settings')}
                className={`flex items-center w-full p-2 sm:p-3 rounded-lg text-left text-sm sm:text-base transition-colors duration-200
                  ${activeSection === 'settings' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-700'}`}
              >
                <Settings size={18} className="mr-2 sm:mr-3" />
                Settings
              </button>
            </li>
          </ul>
        </nav>
        {/* Logout Button */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-blue-700">
          <button
            onClick={() => { addNotification("Admin logged out.", "info"); console.log("Admin Logged Out"); /* Implement actual logout logic */ }}
            className="flex items-center w-full p-2 sm:p-3 rounded-lg text-left text-red-300 hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base"
          >
            <LogOut size={18} className="mr-2 sm:mr-3" />
            Logout
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <div className="flex-1 flex flex-col bg-gray-50 overflow-auto">
        <header className="bg-white shadow-sm p-3 sm:p-4 flex justify-between items-center z-10">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-800 mr-3 p-1 rounded-md"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800 capitalize flex-grow">
            {activeSection.replace('-', ' ')}
          </h1>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-xs sm:text-base text-gray-700 hidden sm:block">Admin User</span>
            <img
              src="/src/assets/user.png"
              alt="Admin Profile"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-blue-400"
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;