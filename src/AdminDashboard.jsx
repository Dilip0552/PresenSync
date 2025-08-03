import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, BookOpen, CalendarCheck, Bell, Settings, LogOut, Menu, X, Edit, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'; // Removed collectionGroup
import { useFirebase } from './FirebaseContext';
import { signOut } from 'firebase/auth'; // Only signOut is needed client-side for admin
import Spinner from './Spinner';

// Admin Overview Component
const AdminOverview = ({ stats, recentActivities }) => {
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
          {recentActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-3">No recent activities.</p>
          ) : (
            recentActivities.map(activity => (
              <li key={activity.id} className="py-3 flex items-start">
                <span className="flex-shrink-0 w-3 h-3 bg-blue-400 rounded-full mt-1.5 mr-3"></span>
                <div>
                  <p className="text-gray-800 font-medium">{activity.type}</p>
                  <p className="text-gray-600 text-sm">{activity.details}</p>
                  <p className="text-gray-400 text-xs mt-1">{activity.date}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

// User Management Component
const UserManagement = ({ users, addNotification, db, userId, auth, appId }) => {
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const handleEditRole = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setLoadingAction(true);
    try {
      // Update role in the private user profile
      const privateUserProfileRef = doc(db, `artifacts/${appId}/users/${editingUser.uid}/profile`, 'userProfile');
      await updateDoc(privateUserProfileRef, { role: newRole });

      // Update role in the public user profile for admin access
      const publicUserProfileRef = doc(db, `artifacts/${appId}/public/data/allUserProfiles`, editingUser.uid);
      await updateDoc(publicUserProfileRef, { role: newRole });

      addNotification(`Role for ${editingUser.fullName || editingUser.email} updated to ${newRole}.`, 'success');
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user role:", error);
      addNotification(`Failed to update role for ${editingUser.fullName || editingUser.email}.`, 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    // Prevent admin from deleting themselves
    if (userToDelete.uid === userId) {
      addNotification("You cannot delete your own admin account from here.", "error");
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete user "${userToDelete.fullName || userToDelete.email}"? This action is irreversible and will delete their account and data.`);
    if (!confirmDelete) {
      return;
    }

    setLoadingAction(true);
    try {
      // Delete user's profile document from private location
      const privateUserProfileRef = doc(db, `artifacts/${appId}/users/${userToDelete.uid}/profile`, 'userProfile');
      await deleteDoc(privateUserProfileRef);

      // Delete user's profile document from public location
      const publicUserProfileRef = doc(db, `artifacts/${appId}/public/data/allUserProfiles`, userToDelete.uid);
      await deleteDoc(publicUserProfileRef);

      // IMPORTANT: Deleting the Firebase Auth user requires server-side logic (e.g., Cloud Function)
      // as client-side `deleteUser(user)` only works for the currently signed-in user.
      // For a full solution, this would trigger a Cloud Function.
      addNotification(`User "${userToDelete.fullName || userToDelete.email}" (profile data) deleted. Firebase Auth user might still exist.`, 'warning');

    } catch (error) {
      console.error("Error deleting user:", error);
      addNotification(`Failed to delete user "${userToDelete.fullName || userToDelete.email}".`, 'error');
    } finally {
      setLoadingAction(false);
    }
  };


  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md relative">
      {loadingAction && <Spinner message="Performing action..." />}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">User Management</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6">Manage student, teacher, and admin accounts.</p>

      <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Full Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No users found.</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.uid} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{user.fullName || 'N/A'}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4 capitalize">
                    {editingUser?.uid === user.uid ? (
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="p-1 border rounded"
                        disabled={loadingAction}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      user.role
                    )}
                  </td>
                  <td className="px-6 py-4 flex space-x-2">
                    {editingUser?.uid === user.uid ? (
                      <button
                        onClick={handleSaveRole}
                        className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                        title="Save Role"
                        disabled={loadingAction}
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditRole(user)}
                        className="p-1 rounded-full text-blue-600 hover:bg-blue-100"
                        title="Edit Role"
                        disabled={loadingAction}
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="p-1 rounded-full text-red-600 hover:bg-red-100"
                      title="Delete User"
                      disabled={loadingAction}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


function AdminDashboard({ addNotification }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { db, auth, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // Fetch all user profiles from the new public collection
  useEffect(() => {
    if (db) {
      setLoadingUsers(true);
      const allUserProfilesRef = collection(db, `artifacts/${appId}/public/data/allUserProfiles`);
      const q = query(allUserProfilesRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedUsers = [];
        snapshot.forEach(docSnap => {
          fetchedUsers.push({ uid: docSnap.id, ...docSnap.data() });
        });
        setAllUsers(fetchedUsers);
        setLoadingUsers(false);
      }, (error) => {
        console.error("Error fetching all users:", error);
        addNotification("Failed to load user list.", "error");
        setLoadingUsers(false);
      });

      return () => unsubscribe();
    }
  }, [db, appId, addNotification]);


  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        const stats = [
          { label: 'Total Users', value: allUsers.length, icon: <Users size={24} className="text-blue-500" /> },
          { label: 'Teachers', value: allUsers.filter(u => u.role === 'teacher').length, icon: <BookOpen size={24} className="text-green-500" /> },
          { label: 'Students', value: allUsers.filter(u => u.role === 'student').length, icon: <Users size={24} className="text-purple-500" /> },
          { label: 'Admins', value: allUsers.filter(u => u.role === 'admin').length, icon: <LayoutDashboard size={24} className="text-red-500" /> },
        ];
        const recentActivities = [
          { id: 1, type: 'User Registered', details: 'John Smith (ID: STU1251) enrolled in Computer Science.', date: '2025-07-30 14:30' },
        ];
        return <AdminOverview stats={stats} recentActivities={recentActivities} />;
      case 'user-management':
        return (
          <UserManagement
            users={allUsers}
            addNotification={addNotification}
            db={db}
            userId={userId}
            auth={auth}
            appId={appId}
          />
        );
      case 'course-management':
        return (
          <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Course Management</h2>
            <p className="text-sm sm:text-base text-gray-600">Administer courses, classes, and schedules.</p>
            <p className="text-gray-500 mt-4"> (Implementation coming soon)</p>
          </div>
        );
      case 'attendance-oversight':
        return (
          <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Attendance Oversight</h2>
            <p className="text-sm sm:text-base text-gray-600">Monitor attendance records across all classes.</p>
            <p className="text-gray-500 mt-4"> (Implementation coming soon)</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Announcements & Notifications</h2>
            <p className="text-sm sm:text-base text-gray-600">Send system-wide announcements to students.</p>
            <p className="text-gray-500 mt-4"> (Implementation coming soon)</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Admin Settings</h2>
            <p className="text-sm sm:text-base text-gray-600">Configure dashboard and system settings.</p>
            <p className="text-gray-500 mt-4"> (Implementation coming soon)</p>
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      addNotification("Admin logged out successfully!", "success");
    } catch (error) {
      console.error("Admin logout error:", error);
      addNotification("Failed to log out admin.", "error");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
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
            onClick={handleLogout}
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
              src="/src/assets/user.png" // Placeholder image for admin profile
              alt="Admin Profile"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-blue-400"
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {loadingUsers ? (
            <Spinner message="Loading user data for admin dashboard..." />
          ) : (
            renderContent()
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
