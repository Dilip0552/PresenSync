import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, User, Menu } from 'lucide-react'; // Import Menu icon

function Header({ notifications, userProfile, setIsSidebarOpen }) { // Receive setIsSidebarOpen
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState("Dashboard");

  useEffect(() => {
    const getPageTitle = () => {
      const path = location.pathname;
      if (path.includes("/dashboard")) return "Dashboard Overview";
      if (path.includes("/create-session")) return "Create New Session";
      if (path.includes("/manage-classes")) return "Manage My Classes";
      if (path.includes("/attendance-reports")) return "Attendance Reports";
      if (path.includes("/profile")) return "My Profile";
      if (path.includes("/notifications")) return "My Notifications";
      if (path.includes("/attendance-report")) return "My Attendance Report";
      return "Dashboard";
    };
    setPageTitle(getPageTitle());
  }, [location.pathname]);

  const displayName = userProfile?.fullName || userProfile?.email || 'User';
  const displayEmail = userProfile?.email || 'N/A';
  const displayInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);


  return (
    <div className="w-full p-4 sm:p-6 flex items-center justify-between border-b border-gray-200 bg-white shadow-sm flex-wrap"> {/* Added flex-wrap */}
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden text-gray-600 hover:text-gray-800 p-2 rounded-md mr-3" // Show only on mobile
        aria-label="Open sidebar"
      >
        <Menu size={24} />
      </button>

      <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-3 sm:mb-0 flex-grow"> {/* flex-grow to push content */}
        {pageTitle}
      </h2>
      <div className="flex items-center space-x-3 sm:space-x-4 ml-auto"> {/* ml-auto to push to right */}
        <div className="relative flex-grow sm:flex-grow-0">
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow duration-200 text-sm"
          />
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button className="relative p-2 rounded-full hover:bg-gray-200 transition-colors">
          <Bell size={24} className="text-gray-600" />
          {notifications && notifications.length > 0 && (
            <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500 animate-pulse"></span>
          )}
        </button>

        <div className="flex items-center space-x-2 cursor-pointer group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm sm:text-base flex-shrink-0">
            {displayInitials}
          </div>
          <div className="hidden md:flex flex-col text-sm text-gray-700">
            <span className="font-semibold truncate max-w-[120px]">{displayName}</span>
            <span className="text-xs text-gray-500 truncate max-w-[120px]">{displayEmail}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
