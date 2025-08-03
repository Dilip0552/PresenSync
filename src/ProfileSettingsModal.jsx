import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useFirebase } from './FirebaseContext';
import Spinner from './Spinner';

function ProfileSettingsModal({ setShowSettings, addNotification }) {
  const { db, auth, userId } = useFirebase();
  const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    subject: '',
    employeeId: '',
    currentPassword: '', // For re-authentication
    newPassword: '',
    theme: 'Light',
    notifications: false,
    feedback: '',
    role: '', // To display user's role
  });
  const [loading, setLoading] = useState(true); // For initial profile loading in modal
  const [saving, setSaving] = useState(false); // For saving changes

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      // Ensure db and userId are available before attempting to fetch
      if (db && userId) {
        console.log("ProfileSettingsModal: Attempting to fetch user profile...");
        console.log("ProfileSettingsModal: userId:", userId);
        console.log("ProfileSettingsModal: appId:", appId);
        try {
          // Fetch from the private user profile location
          const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
          const docSnap = await getDoc(userProfileRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("ProfileSettingsModal: Fetched profile data:", data);
            setFormData({
              fullName: data.fullName || data.displayName || '', // Prioritize fullName, fallback to displayName
              email: data.email || auth.currentUser?.email || '',
              phone: data.phone || '',
              department: data.department || '',
              subject: data.subject || '',
              employeeId: data.employeeId || '',
              currentPassword: '',
              newPassword: '',
              theme: data.theme || 'Light',
              notifications: data.notifications || false,
              feedback: '',
              role: data.role || 'student', // Default if not found in profile
            });
            console.log("ProfileSettingsModal: Profile found and formData set.");
          } else {
            addNotification("Your profile data not found in Firestore. Please ensure your profile is complete.", "warning");
            console.warn("ProfileSettingsModal: Profile document does not exist at path:", userProfileRef.path);
            // Initialize with basic data if not found, to prevent blank fields
            setFormData(prev => ({
                ...prev,
                email: auth.currentUser?.email || '',
                fullName: auth.currentUser?.displayName || '', // Use auth.currentUser.displayName as fallback
                role: 'student' // Default role if profile is missing
            }));
          }
        } catch (error) {
          console.error("ProfileSettingsModal: Error fetching user profile:", error);
          addNotification("Failed to load profile data in settings.", "error");
        } finally {
          setLoading(false); // Finished initial loading attempt
        }
      } else {
          console.log("ProfileSettingsModal: db or userId not available for profile fetch. userId:", userId, "db:", db);
          // If db or userId are not available, we can't load, so stop loading state.
          setLoading(false);
      }
    };
    fetchUserProfile();
  }, [db, userId, appId, addNotification, auth.currentUser?.email]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = {
        fullName: formData.fullName, // Ensure fullName is saved
        phone: formData.phone,
        department: formData.department,
        subject: formData.subject,
        employeeId: formData.employeeId,
        theme: formData.theme,
        notifications: formData.notifications,
      };

      // Update private user profile
      const privateUserProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await updateDoc(privateUserProfileRef, updates);

      // Update public user profile for admin access
      const publicUserProfileRef = doc(db, `artifacts/${appId}/public/data/allUserProfiles`, userId);
      await updateDoc(publicUserProfileRef, updates);


      // Handle password change if newPassword is provided
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          addNotification("Please enter your current password to change it.", "error");
          setSaving(false);
          return;
        }
        const user = auth.currentUser;
        if (user && user.email) {
          const credential = EmailAuthProvider.credential(user.email, formData.currentPassword);
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, formData.newPassword);
          addNotification("Password updated successfully!", "success");
          setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' })); // Clear password fields
        } else {
          addNotification("Cannot change password without email or current user.", "error");
        }
      }

      addNotification("Profile settings saved successfully!", "success");
      setShowSettings(false);
    } catch (error) {
      console.error("Error saving profile settings:", error);
      let errorMessage = "Failed to save profile settings.";
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect current password.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log out and log in again to update your password.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "New password is too weak.";
      }
      addNotification(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      addNotification("Logged out successfully!", "success");
      setShowSettings(false); // Close modal on logout
      // navigate('/login'); // Assuming App.jsx handles redirection after logout
    } catch (error) {
      console.error("Logout error:", error);
      addNotification("Failed to log out.", "error");
    }
  }, [auth, addNotification, setShowSettings]);


  if (loading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-10 flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative p-6 sm:p-8 md:p-10 lg:p-12 outline-2 outline-blue-200 flex items-center justify-center">
          <Spinner message="Loading profile settings..." isVisible={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-inter">

      <div
        className="bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative p-6 sm:p-8 md:p-10 lg:p-12 outline-2 outline-blue-200"
        style={{ scrollbarWidth: 'none' }}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors"
          onClick={() => setShowSettings(false)}
          aria-label="Close settings modal"
          disabled={saving}
        >
          <X size={28} />
        </button>

        <h2 className="text-3xl font-bold mb-8 text-center text-blue-800">Profile & Settings</h2>

        <form onSubmit={handleSaveProfile}>
          <section className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Profile Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Your Full Name"
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  readOnly // Email from Firebase Auth is read-only here
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 bg-gray-100 cursor-not-allowed"
                  disabled
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 XXXXXXXXXX"
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                  readOnly // Role is read-only here
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 bg-gray-100 cursor-not-allowed capitalize"
                  disabled
                />
              </div>
              {formData.role === 'teacher' && (
                <>
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="Computer Science"
                      className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject Taught</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Data Structures"
                      className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                    <input
                      type="text"
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      placeholder="EMP12345"
                      className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                      disabled={saving}
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Account Security</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter current password for changes"
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Appearance</h3>
            <label htmlFor="theme" className="flex items-center space-x-4">
              <span className="text-lg font-medium text-gray-700">Theme:</span>
              <select
                id="theme"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                className="px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer transition-shadow"
                disabled={saving}
              >
                <option value="Light">Light</option>
                <option value="Dark">Dark</option>
              </select>
            </label>
          </section>

          <section className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Notifications</h3>
            <label htmlFor="notifications" className="flex items-center cursor-pointer text-lg text-gray-700">
              <input
                type="checkbox"
                id="notifications"
                name="notifications"
                checked={formData.notifications}
                onChange={handleChange}
                className="mr-3 w-5 h-5 accent-blue-600"
                disabled={saving}
              />
              Email Notifications
            </label>
          </section>

          <section className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Support & Feedback</h3>
            <label htmlFor="feedback" className="sr-only">Leave your feedback here</label>
            <textarea
              id="feedback"
              name="feedback"
              value={formData.feedback}
              onChange={handleChange}
              placeholder="Leave your feedback here..."
              className="px-4 py-3 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full resize-y"
              rows={4}
              disabled={saving}
            />
          </section>

          <button
            type="submit"
            className="w-full font-semibold text-lg py-3 rounded-lg transition-colors duration-300 bg-blue-600 text-white hover:bg-blue-700 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 relative"
            disabled={saving}
          >
            <Spinner size="small" color="white" isVisible={saving} />
            <span className={saving ? 'opacity-0' : ''}>Save Changes</span>
          </button>
        </form>

        <section className="mt-12">
          <h3 className="text-2xl font-semibold mb-4 text-red-700">Danger Zone</h3>
          <button
            type="button"
            className="w-full font-semibold text-lg py-3 rounded-lg transition-colors duration-300 border-2 border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            onClick={handleLogout}
            disabled={saving}
          >
            Logout
          </button>
        </section>
      </div>

    </div>
  );
}

export default ProfileSettingsModal;
