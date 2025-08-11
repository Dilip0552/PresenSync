
import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, BookOpen, CalendarCheck, Bell, Settings, LogOut, Menu, X, Edit, Trash2, Plus, Save } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc, collectionGroup, getDocs } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext';
import { signOut } from 'firebase/auth';
import Spinner from './Spinner';
import user from "./assets/user.png"

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

// Course Management Component
const CourseManagement = ({ addNotification, db, appId, teachers }) => {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [newCourse, setNewCourse] = useState({ className: '', teacherId: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db) {
      const coursesRef = collection(db, `artifacts/${appId}/public/data/classes`);
      const q = query(coursesRef);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedCourses = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setCourses(fetchedCourses);
        setLoadingCourses(false);
      }, (error) => {
        console.error("Error fetching courses:", error);
        addNotification("Failed to load courses.", "error");
        setLoadingCourses(false);
      });
      return () => unsubscribe();
    }
  }, [db, appId, addNotification]);

  const handleAddCourse = async () => {
    setLoadingAction(true);
    try {
      const coursesRef = collection(db, `artifacts/${appId}/public/data/classes`);
      await addDoc(coursesRef, newCourse);
      addNotification("Course added successfully.", "success");
      setNewCourse({ className: '', teacherId: '', description: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding course:", error);
      addNotification("Failed to add course.", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setNewCourse({ className: course.className, teacherId: course.teacherId, description: course.description });
  };

  const handleSaveCourse = async () => {
    if (!editingCourse) return;
    setLoadingAction(true);
    try {
      const courseRef = doc(db, `artifacts/${appId}/public/data/classes`, editingCourse.id);
      await updateDoc(courseRef, newCourse);
      addNotification("Course updated successfully.", "success");
      setEditingCourse(null);
    } catch (error) {
      console.error("Error updating course:", error);
      addNotification("Failed to update course.", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this course?");
    if (!confirmDelete) return;
    setLoadingAction(true);
    try {
      const courseRef = doc(db, `artifacts/${appId}/public/data/classes`, courseId);
      await deleteDoc(courseRef);
      addNotification("Course deleted successfully.", "success");
    } catch (error) {
      console.error("Error deleting course:", error);
      addNotification("Failed to delete course.", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md relative">
      {loadingAction && <Spinner message="Performing action..." />}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Course Management</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6">Administer courses, classes, and schedules.</p>

      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="mb-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus size={18} className="mr-2" /> Add New Course
      </button>

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <input
            type="text"
            placeholder="Class Name"
            value={newCourse.className}
            onChange={(e) => setNewCourse({ ...newCourse, className: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
          />
          <select
            value={newCourse.teacherId}
            onChange={(e) => setNewCourse({ ...newCourse, teacherId: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
          >
            <option value="">Select Teacher</option>
            {teachers.map(teacher => (
              <option key={teacher.uid} value={teacher.uid}>{teacher.fullName}</option>
            ))}
          </select>
          <textarea
            placeholder="Description"
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
          />
          <button
            onClick={handleAddCourse}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={loadingAction}
          >
            Save New Course
          </button>
        </div>
      )}

      {loadingCourses ? (
        <Spinner message="Loading courses..." />
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Class Name</th>
                <th className="px-6 py-3">Teacher</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No courses found.</td>
                </tr>
              ) : (
                courses.map(course => (
                  <tr key={course.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {editingCourse?.id === course.id ? (
                        <input
                          type="text"
                          value={newCourse.className}
                          onChange={(e) => setNewCourse({ ...newCourse, className: e.target.value })}
                          className="p-1 border rounded"
                        />
                      ) : (
                        course.className
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingCourse?.id === course.id ? (
                        <select
                          value={newCourse.teacherId}
                          onChange={(e) => setNewCourse({ ...newCourse, teacherId: e.target.value })}
                          className="p-1 border rounded"
                        >
                          <option value="">Select Teacher</option>
                          {teachers.map(teacher => (
                            <option key={teacher.uid} value={teacher.uid}>{teacher.fullName}</option>
                          ))}
                        </select>
                      ) : (
                        teachers.find(t => t.uid === course.teacherId)?.fullName || 'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingCourse?.id === course.id ? (
                        <textarea
                          value={newCourse.description}
                          onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                          className="p-1 border rounded"
                        />
                      ) : (
                        course.description
                      )}
                    </td>
                    <td className="px-6 py-4 flex space-x-2">
                      {editingCourse?.id === course.id ? (
                        <button
                          onClick={handleSaveCourse}
                          className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                          title="Save"
                          disabled={loadingAction}
                        >
                          <Save size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="p-1 rounded-full text-blue-600 hover:bg-blue-100"
                          title="Edit"
                          disabled={loadingAction}
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="p-1 rounded-full text-red-600 hover:bg-red-100"
                        title="Delete"
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
      )}
    </div>
  );
};

// Attendance Oversight Component
const AttendanceOversight = ({ addNotification, db, appId }) => {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [attendanceDetails, setAttendanceDetails] = useState({});

  useEffect(() => {
    if (db) {
      const sessionsQuery = query(collectionGroup(db, 'sessions'));
      const unsubscribe = onSnapshot(sessionsQuery, async (snapshot) => {
        const fetchedSessions = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), path: docSnap.ref.path }));
        setSessions(fetchedSessions);

        // Fetch attendance counts for each session
        const details = {};
        for (const session of fetchedSessions) {
          const attendanceRef = collection(db, `${session.path}/attendances`);
          const attendanceSnap = await getDocs(attendanceRef);
          details[session.id] = attendanceSnap.size;
        }
        setAttendanceDetails(details);
        setLoadingSessions(false);
      }, (error) => {
        console.error("Error fetching sessions:", error);
        addNotification("Failed to load sessions.", "error");
        setLoadingSessions(false);
      });
      return () => unsubscribe();
    }
  }, [db, addNotification]);

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Attendance Oversight</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6">Monitor attendance records across all classes.</p>

      {loadingSessions ? (
        <Spinner message="Loading sessions..." />
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Session ID</th>
                <th className="px-6 py-3">Class Name</th>
                <th className="px-6 py-3">Start Time</th>
                <th className="px-6 py-3">Attendance Count</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No sessions found.</td>
                </tr>
              ) : (
                sessions.map(session => (
                  <tr key={session.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">{session.id}</td>
                    <td className="px-6 py-4">{session.className || 'N/A'}</td>
                    <td className="px-6 py-4">{new Date(session.startTime).toLocaleString()}</td>
                    <td className="px-6 py-4">{attendanceDetails[session.id] || 0}</td>
                    <td className="px-6 py-4 capitalize">{session.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Announcements Component
const Announcements = ({ addNotification, db, appId }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db) {
      const announcementsRef = collection(db, `artifacts/${appId}/public/announcements`);
      const q = query(announcementsRef);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedAnnouncements = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setAnnouncements(fetchedAnnouncements);
        setLoadingAnnouncements(false);
      }, (error) => {
        console.error("Error fetching announcements:", error);
        addNotification("Failed to load announcements.", "error");
        setLoadingAnnouncements(false);
      });
      return () => unsubscribe();
    }
  }, [db, appId, addNotification]);

  const handleAddAnnouncement = async () => {
    setLoadingAction(true);
    try {
      const announcementsRef = collection(db, `artifacts/${appId}/public/announcements`);
      await addDoc(announcementsRef, {
        ...newAnnouncement,
        date: new Date().toISOString(),
      });
      addNotification("Announcement sent successfully.", "success");
      setNewAnnouncement({ title: '', message: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding announcement:", error);
      addNotification("Failed to send announcement.", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this announcement?");
    if (!confirmDelete) return;
    setLoadingAction(true);
    try {
      const announcementRef = doc(db, `artifacts/${appId}/public/announcements`, announcementId);
      await deleteDoc(announcementRef);
      addNotification("Announcement deleted successfully.", "success");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      addNotification("Failed to delete announcement.", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md relative">
      {loadingAction && <Spinner message="Performing action..." />}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Announcements & Notifications</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6">Send system-wide announcements to students.</p>

      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="mb-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus size={18} className="mr-2" /> Create New Announcement
      </button>

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <input
            type="text"
            placeholder="Title"
            value={newAnnouncement.title}
            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
          />
          <textarea
            placeholder="Message"
            value={newAnnouncement.message}
            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
            className="mb-2 p-2 border rounded w-full h-24"
          />
          <button
            onClick={handleAddAnnouncement}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={loadingAction}
          >
            Send Announcement
          </button>
        </div>
      )}

      {loadingAnnouncements ? (
        <Spinner message="Loading announcements..." />
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Message</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No announcements found.</td>
                </tr>
              ) : (
                announcements.map(announcement => (
                  <tr key={announcement.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">{announcement.title}</td>
                    <td className="px-6 py-4">{announcement.message}</td>
                    <td className="px-6 py-4">{new Date(announcement.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="p-1 rounded-full text-red-600 hover:bg-red-100"
                        title="Delete"
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
      )}
    </div>
  );
};

// Settings Component
const AdminSettings = ({ addNotification, db, appId }) => {
  const [settings, setSettings] = useState({ gpsRadius: 100, qrExpiration: 5, faceThreshold: 0.6 });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (db) {
      const settingsRef = doc(db, `artifacts/${appId}/public/settings`, 'appSettings');
      getDoc(settingsRef).then((docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
        setLoadingSettings(false);
      }).catch((error) => {
        console.error("Error fetching settings:", error);
        addNotification("Failed to load settings.", "error");
        setLoadingSettings(false);
      });
    }
  }, [db, appId, addNotification]);

  const handleSaveSettings = async () => {
    setLoadingAction(true);
    try {
      const settingsRef = doc(db, `artifacts/${appId}/public/settings`, 'appSettings');
      await setDoc(settingsRef, settings, { merge: true });
      addNotification("Settings updated successfully.", "success");
    } catch (error) {
      console.error("Error updating settings:", error);
      addNotification("Failed to update settings.", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md relative">
      {loadingAction && <Spinner message="Saving settings..." />}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Admin Settings</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6">Configure dashboard and system settings.</p>

      {loadingSettings ? (
        <Spinner message="Loading settings..." />
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">GPS Radius (meters)</label>
            <input
              type="number"
              value={settings.gpsRadius}
              onChange={(e) => setSettings({ ...settings, gpsRadius: parseInt(e.target.value) })}
              className="mt-1 p-2 border rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">QR Expiration (minutes)</label>
            <input
              type="number"
              value={settings.qrExpiration}
              onChange={(e) => setSettings({ ...settings, qrExpiration: parseInt(e.target.value) })}
              className="mt-1 p-2 border rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Face Match Threshold</label>
            <input
              type="number"
              step="0.01"
              value={settings.faceThreshold}
              onChange={(e) => setSettings({ ...settings, faceThreshold: parseFloat(e.target.value) })}
              className="mt-1 p-2 border rounded w-full"
            />
          </div>
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={loadingAction}
          >
            Save Settings
          </button>
        </div>
      )}
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

  const teachers = allUsers.filter(u => u.role === 'teacher');

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
          <CourseManagement
            addNotification={addNotification}
            db={db}
            appId={appId}
            teachers={teachers}
          />
        );
      case 'attendance-oversight':
        return (
          <AttendanceOversight
            addNotification={addNotification}
            db={db}
            appId={appId}
          />
        );
      case 'notifications':
        return (
          <Announcements
            addNotification={addNotification}
            db={db}
            appId={appId}
          />
        );
      case 'settings':
        return (
          <AdminSettings
            addNotification={addNotification}
            db={db}
            appId={appId}
          />
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
              src={user} // Placeholder image for admin profile
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
