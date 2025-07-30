import React, { useState } from 'react';
import { LayoutDashboard, ClipboardList, User, Bell, LogOut, Settings, Menu, X } from 'lucide-react';

import StudentDashboardHome from './StudentDashboardHome';
import StudentAttendanceReport from './StudentAttendanceReport';
import StudentProfile from './StudentProfile';
import StudentNotifications from './StudentNotifications';
import Spinner from './Spinner'; 

function StudentDashboard({ addNotification }) {
  const [activeTab, setActiveTab] = useState('home'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [studentInfo, setStudentInfo] = useState({
    id: "STD12345",
    name: "Dilip Suthar",
    email: "dilip.suthar@sitare.org",
    program: "B.Tech Computer Science",
    enrollmentDate: "2023-09-01",
    profilePic: "/src/assets/user.png" 
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <StudentDashboardHome studentInfo={studentInfo} addNotification={addNotification} />;
      case 'attendance':
        return <StudentAttendanceReport studentInfo={studentInfo} addNotification={addNotification} />;
      case 'profile':
        return <StudentProfile studentInfo={studentInfo} addNotification={addNotification} setStudentInfo={setStudentInfo} />;
      case 'notifications':
        return <StudentNotifications studentInfo={studentInfo} addNotification={addNotification} />;
      case 'settings':
        return (
            <div className="p-8 bg-white rounded-xl shadow-lg flex-grow flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Settings</h2>
                <p className="text-gray-600 text-lg text-center">Settings options will be available here soon!</p>
            </div>
        );
      default:
        return <StudentDashboardHome studentInfo={studentInfo} addNotification={addNotification} />;
    }
  };

  const handleLogout = () => {
    addNotification("Logging out...", "info");
    setTimeout(() => {
      addNotification("Logged out successfully!", "success");
      console.log("Student logged out.");
    }, 1000);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      <header className="bg-blue-800 text-white p-4 flex items-center justify-between md:hidden shadow-md">
        <div className="flex items-center">
          <img src={studentInfo.profilePic} alt="Profile" className="w-8 h-8 rounded-full border-2 border-white mr-2" />
          <span className="font-bold text-lg">{studentInfo.name}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white focus:outline-none">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <nav className={`fixed inset-y-0 left-0 z-40 w-70 bg-blue-800 text-white flex-col p-6 shadow-lg
                      transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                      transition-transform duration-300 ease-in-out
                      md:relative md:translate-x-0 md:flex md:w-[280px]`} 
      >
        <div className="hidden md:flex items-center mb-10">
          <img src={studentInfo.profilePic} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white mr-3" />
          <div>
            <span className="block font-bold text-xl">{studentInfo.name}</span>
            <span className="block text-sm text-blue-200">{studentInfo.program}</span>
          </div>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(false)} 
          className="absolute top-4 right-4 text-white md:hidden focus:outline-none"
        >
          <X size={24} />
        </button>

        <ul className="flex-grow space-y-3 mt-8 md:mt-0"> 
          <li>
            <button
              onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }}
              className={`flex items-center w-full p-3 rounded-lg text-lg font-medium transition-colors
                          ${activeTab === 'home' ? 'bg-blue-600 shadow-md' : 'hover:bg-blue-700'}`}
            >
              <LayoutDashboard size={20} className="mr-3" /> Dashboard
            </button>
          </li>
          <li>
            <button
              onClick={() => { setActiveTab('attendance'); setIsSidebarOpen(false); }}
              className={`flex items-center w-full p-3 rounded-lg text-lg font-medium transition-colors
                          ${activeTab === 'attendance' ? 'bg-blue-600 shadow-md' : 'hover:bg-blue-700'}`}
            >
              <ClipboardList size={20} className="mr-3" /> Attendance Report
            </button>
          </li>
          <li>
            <button
              onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
              className={`flex items-center w-full p-3 rounded-lg text-lg font-medium transition-colors
                          ${activeTab === 'profile' ? 'bg-blue-600 shadow-md' : 'hover:bg-blue-700'}`}
            >
              <User size={20} className="mr-3" /> My Profile
            </button>
          </li>
          <li>
            <button
              onClick={() => { setActiveTab('notifications'); setIsSidebarOpen(false); }}
              className={`flex items-center w-full p-3 rounded-lg text-lg font-medium transition-colors
                          ${activeTab === 'notifications' ? 'bg-blue-600 shadow-md' : 'hover:bg-blue-700'}`}
            >
              <Bell size={20} className="mr-3" /> Notifications
            </button>
          </li>
          <li>
            <button
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              className={`flex items-center w-full p-3 rounded-lg text-lg font-medium transition-colors
                          ${activeTab === 'settings' ? 'bg-blue-600 shadow-md' : 'hover:bg-blue-700'}`}
            >
              <Settings size={20} className="mr-3" /> Settings
            </button>
          </li>
        </ul>

        <div className="mt-auto pt-6 border-t border-blue-700">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-lg text-lg font-medium text-blue-200 hover:bg-blue-700 transition-colors"
          >
            <LogOut size={20} className="mr-3" /> Logout
          </button>
        </div>
      </nav>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default StudentDashboard;