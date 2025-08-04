import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, QrCode, Users, FileText, Bell, User, Settings, LogOut, X } from 'lucide-react';

function Sidebar({ activeTab, setActiveTab, setShowSettings, handleLogout, userRole, isSidebarOpen, setIsSidebarOpen }) {
  const navigate = useNavigate();

  const handleNavigation = (path, tabName) => {
    setActiveTab(tabName);
    navigate(path);
    setIsSidebarOpen(false); // Close sidebar on navigation click (for mobile)
  };

  const navItems = {
    teacher: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/teacher/dashboard', tab: 'dashboard' },
      { name: 'Create Session', icon: QrCode, path: '/teacher/create-session', tab: 'createSession' },
      { name: 'Manage Classes', icon: Users, path: '/teacher/manage-classes', tab: 'manageClasses' },
      { name: 'Attendance Reports', icon: FileText, path: '/teacher/attendance-reports', tab: 'attendanceReports' },
    ],
    student: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard', tab: 'dashboard' },
      { name: 'My Profile', icon: User, path: '/student/profile', tab: 'profile' },
      { name: 'Notifications', icon: Bell, path: '/student/notifications', tab: 'notifications' },
      { name: 'Attendance Report', icon: FileText, path: '/student/attendance-report', tab: 'attendanceReport' },
    ],
    admin: [
      { name: 'Admin Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', tab: 'dashboard' },
      // Add more admin specific routes here
    ]
  };

  const currentNavItems = navItems[userRole] || [];

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <>
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)} // Close sidebar when clicking overlay
        ></motion.div>
      )}

      {/* Mobile Sidebar (fixed, animated) */}
      <motion.div
        className={`bg-gradient-to-b from-indigo-700 to-blue-800 text-white p-6 shadow-lg flex flex-col
          fixed inset-y-0 left-0 z-50 w-64 md:hidden`} /* Only visible on mobile */
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : -256 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="flex items-center mb-10 mt-4 justify-between">
          <div className="flex items-center">
            <img src="/public/vite.svg" alt="PresenSync Logo" className="h-10 w-10 mr-3" />
            <h1 className="text-2xl font-bold">PresenSync</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-white hover:text-gray-300 p-2 rounded-md"
            aria-label="Close sidebar"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-grow">
          <ul className="space-y-3">
            {currentNavItems.map((item, index) => (
              <motion.li
                key={item.tab}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
              >
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center p-3 rounded-xl transition-all duration-200 ${
                      activeTab === item.tab || isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'hover:bg-indigo-500 hover:bg-opacity-70 text-indigo-100'
                    }`
                  }
                  onClick={() => handleNavigation(item.path, item.tab)}
                >
                  <item.icon size={20} className="mr-3" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              </motion.li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto pt-6 border-t border-indigo-600">
          <button
            onClick={() => { setShowSettings(true); setIsSidebarOpen(false); }}
            className="flex items-center w-full p-3 rounded-xl transition-all duration-200 hover:bg-indigo-500 hover:bg-opacity-70 text-indigo-100 mb-3"
          >
            <Settings size={20} className="mr-3" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={() => { handleLogout(); setIsSidebarOpen(false); }}
            className="flex items-center w-full p-3 rounded-xl transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-md"
          >
            <LogOut size={20} className="mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Desktop Sidebar (always visible on md and up) */}
      <div
        className="hidden md:flex flex-col bg-gradient-to-b from-indigo-700 to-blue-800 text-white p-6 shadow-lg rounded-tl-3xl rounded-bl-3xl"
        style={{ minWidth: '256px' }} /* Ensure fixed width on desktop */
      >
        <div className="flex items-center mb-10 mt-4 justify-center">
          <img src="/public/vite.svg" alt="PresenSync Logo" className="h-10 w-10 mr-3" />
          <h1 className="text-2xl font-bold">PresenSync</h1>
        </div>

        <nav className="flex-grow">
          <ul className="space-y-3">
            {currentNavItems.map((item, index) => (
              <li key={item.tab}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center p-3 rounded-xl transition-all duration-200 ${
                      activeTab === item.tab || isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'hover:bg-indigo-500 hover:bg-opacity-70 text-indigo-100'
                    }`
                  }
                  // FIX: Pass a function reference to onClick, not a direct call
                  onClick={() => handleNavigation(item.path, item.tab)}
                >
                  <item.icon size={20} className="mr-3" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto pt-6 border-t border-indigo-600">
          <button
            onClick={() => { setShowSettings(true); setIsSidebarOpen(false); }}
            className="flex items-center w-full p-3 rounded-xl transition-all duration-200 hover:bg-indigo-500 hover:bg-opacity-70 text-indigo-100 mb-3"
          >
            <Settings size={20} className="mr-3" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={() => { handleLogout(); setIsSidebarOpen(false); }}
            className="flex items-center w-full p-3 rounded-xl transition-all duration-300 bg-red-600 hover:bg-red-700 text-white shadow-md"
          >
            <LogOut size={20} className="mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
