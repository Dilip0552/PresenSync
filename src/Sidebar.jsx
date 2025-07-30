import React from 'react';
import { Link } from 'react-router-dom';

function Sidebar({ activeTab, setActiveTab, setShowSettings }) {
  const SidebarButton = ({ icon, label, tabName }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`w-full flex items-center px-5 py-3 rounded-xl text-lg font-medium transition-all duration-200
        ${activeTab === tabName ? "bg-blue-200 text-blue-800 shadow-sm" : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"}`}
    >
      <img src={icon} alt="" className="w-5 h-5 mr-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="col-span-1 p-6 bg-blue-50 rounded-tl-3xl rounded-bl-3xl flex flex-col justify-between shadow-lg">
      <div>
        <h1 className="text-4xl font-extrabold text-blue-800 mb-10 tracking-tight">PresenSync</h1>
        <nav className="space-y-3">
          <SidebarButton
            icon="/src/assets/layout.png" 
            label="Dashboard"
            tabName="dashboard"
          />
          <SidebarButton
            icon="/src/assets/plus.png"
            label="Create Session"
            tabName="createSession"
          />
          <SidebarButton
            icon="/src/assets/presentation.png"
            label="Manage Classes"
            tabName="manageClasses"
          />
          <SidebarButton
            icon="/src/assets/clock.png" 
            label="Attendance Reports"
            tabName="attendanceReports"
          />
        </nav>
      </div>
      <div className="w-full flex justify-center">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center justify-center px-4 py-3 text-lg text-gray-700 bg-white rounded-xl shadow-md hover:bg-gray-100 transition-all duration-200"
        >
          <img src="/src/assets/user.png" alt="Profile" className="w-5 h-5 mr-3" />
          Profile & Settings
        </button>
      </div>
    </div>
  );
}

export default Sidebar;