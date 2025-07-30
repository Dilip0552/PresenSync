import React from 'react';
import { useLocation } from 'react-router-dom';

function Header({ notifications }) {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("dashboard")) return "Dashboard Overview";
    if (path.includes("create-session")) return "Create New Session";
    if (path.includes("manage-classes")) return "Manage My Classes";
    if (path.includes("attendance-reports")) return "Attendance Reports";
    return "Teacher Dashboard"; 
  };

  return (
    <div className="w-full p-6 flex items-center justify-between border-b border-gray-200 bg-white shadow-sm">
      <h2 className="text-3xl font-semibold text-gray-800">{getPageTitle()}</h2>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
          />
          <img src="/src/assets/search-interface-symbol.png" alt="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        <button className="relative p-2 rounded-full hover:bg-gray-200 transition-colors">
          <img src="/src/assets/bell.png" alt="Notifications" className="w-6 h-6" />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500 animate-pulse"></span>
          )}
        </button>

        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold cursor-pointer hover:shadow-md transition-shadow">
          JD 
        </div>
      </div>
    </div>
  );
}

export default Header;