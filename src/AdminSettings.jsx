import React, { useState } from 'react';
import { Settings, User, Database, Shield, Save, Mail, Code, Key } from 'lucide-react';
import { motion } from 'framer-motion';
import Spinner from './Spinner';
import { useFirebase } from './FirebaseContext';
import { updatePassword } from 'firebase/auth';

function AdminSettings({ addNotification }) {
  const { auth } = useFirebase();
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Mock settings state - these would be fetched from the backend in a real app
  const [settings, setSettings] = useState({
    // User Management
    allowSelfRegistration: true,
    defaultUserRole: 'student',
    
    // System Configuration
    maintenanceMode: false,
    appVersion: '1.0.0', // Read-only
    
    // Email Notifications
    emailNewUserRegistration: true,
    emailPasswordReset: true,
    
    // Security & Attendance
    attendanceIpVerification: true,
    qrCodeExpiryMinutes: 5,
    faceMatchThreshold: 0.6,
    gpsRadiusMeters: 100,
  });

  const handleToggleChange = (settingName) => {
    setSettings(prev => ({
      ...prev,
      [settingName]: !prev[settingName]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    addNotification("Saving settings...", "info");

    try {
      // In a real application, you would make an API call here.
      // For now, we simulate a successful save.
      console.log("Saving new settings:", settings);

      await new Promise(resolve => setTimeout(resolve, 1500));

      addNotification("Settings saved successfully!", "success");
    } catch (error) {
      console.error("Error saving settings:", error);
      addNotification(`Failed to save settings: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addNotification("New passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 6) {
        addNotification("Password must be at least 6 characters long.", "error");
        return;
    }

    setIsPasswordChanging(true);
    try {
        const user = auth.currentUser;
        if (user) {
            await updatePassword(user, newPassword);
            addNotification("Password updated successfully!", "success");
            setNewPassword('');
            setConfirmPassword('');
        } else {
            addNotification("No authenticated user found. Please log in again.", "error");
        }
    } catch (error) {
        console.error("Password change error:", error);
        let errorMessage = "Failed to change password.";
        if (error.code === 'auth/weak-password') {
            errorMessage = "The new password is too weak.";
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = "Please re-authenticate to change your password. Log out and log back in.";
        }
        addNotification(errorMessage, "error");
    } finally {
        setIsPasswordChanging(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 bg-white rounded-lg shadow-md h-full flex flex-col"
    >
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Settings size={24} className="text-blue-600" /> Admin Settings
      </h2>
      
      <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        
        {/* Admin Account Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center space-x-4 mb-4 pb-2 border-b border-gray-200">
            <Key size={24} className="text-blue-600 flex-shrink-0" />
            <h3 className="font-semibold text-lg text-gray-800">Admin Account Settings</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-gray-700 font-medium mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                minLength="6"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                required
              />
            </div>
            <button
              type="submit"
              className={`px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2 ${
                isPasswordChanging ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              disabled={isPasswordChanging}
            >
              {isPasswordChanging && <Spinner size="small" color="white" isVisible={true} />}
              {isPasswordChanging ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* User Management Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center space-x-4 mb-4 pb-2 border-b border-gray-200">
            <User size={24} className="text-purple-600 flex-shrink-0" />
            <h3 className="font-semibold text-lg text-gray-800">User Management</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="allowSelfRegistration" className="text-gray-700 font-medium flex-grow">
                Allow New User Self-Registration
              </label>
              <button
                id="allowSelfRegistration"
                onClick={() => handleToggleChange('allowSelfRegistration')}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  settings.allowSelfRegistration ? 'bg-green-500' : 'bg-gray-200'
                }`}
                disabled={isSaving}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    settings.allowSelfRegistration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label htmlFor="defaultUserRole" className="block text-gray-700 font-medium mb-2">
                Default New User Role
              </label>
              <select
                id="defaultUserRole"
                name="defaultUserRole"
                value={settings.defaultUserRole}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* System Configuration Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center space-x-4 mb-4 pb-2 border-b border-gray-200">
            <Database size={24} className="text-green-600 flex-shrink-0" />
            <h3 className="font-semibold text-lg text-gray-800">System Configuration</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="maintenanceMode" className="text-gray-700 font-medium flex-grow">
                Maintenance Mode
              </label>
              <button
                id="maintenanceMode"
                onClick={() => handleToggleChange('maintenanceMode')}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-200'
                }`}
                disabled={isSaving}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Application Version</span>
              <span className="text-gray-500 font-mono">{settings.appVersion}</span>
            </div>
          </div>
        </div>

        {/* Email Notifications Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center space-x-4 mb-4 pb-2 border-b border-gray-200">
            <Mail size={24} className="text-indigo-600 flex-shrink-0" />
            <h3 className="font-semibold text-lg text-gray-800">Email Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="emailNewUserRegistration" className="text-gray-700 font-medium flex-grow">
                Send Notification on New User Registration
              </label>
              <button
                id="emailNewUserRegistration"
                onClick={() => handleToggleChange('emailNewUserRegistration')}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  settings.emailNewUserRegistration ? 'bg-green-500' : 'bg-gray-200'
                }`}
                disabled={isSaving}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    settings.emailNewUserRegistration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="emailPasswordReset" className="text-gray-700 font-medium flex-grow">
                Send Notification on Password Reset Request
              </label>
              <button
                id="emailPasswordReset"
                onClick={() => handleToggleChange('emailPasswordReset')}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  settings.emailPasswordReset ? 'bg-green-500' : 'bg-gray-200'
                }`}
                disabled={isSaving}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    settings.emailPasswordReset ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>


        {/* Security & Attendance Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center space-x-4 mb-4 pb-2 border-b border-gray-200">
            <Shield size={24} className="text-red-600 flex-shrink-0" />
            <h3 className="font-semibold text-lg text-gray-800">Security & Attendance</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="attendanceIpVerification" className="text-gray-700 font-medium flex-grow">
                Enforce IP Address Verification for Attendance
              </label>
              <button
                id="attendanceIpVerification"
                onClick={() => handleToggleChange('attendanceIpVerification')}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  settings.attendanceIpVerification ? 'bg-green-500' : 'bg-gray-200'
                }`}
                disabled={isSaving}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    settings.attendanceIpVerification ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="qrCodeExpiryMinutes" className="text-gray-700 font-medium flex-grow">
                QR Code Expiry Time (minutes)
              </label>
              <input
                type="number"
                id="qrCodeExpiryMinutes"
                name="qrCodeExpiryMinutes"
                value={settings.qrCodeExpiryMinutes}
                onChange={handleInputChange}
                className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center"
                min="1"
                disabled={isSaving}
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="faceMatchThreshold" className="text-gray-700 font-medium flex-grow">
                Face Match Threshold (lower is stricter)
              </label>
              <input
                type="number"
                id="faceMatchThreshold"
                name="faceMatchThreshold"
                value={settings.faceMatchThreshold}
                onChange={handleInputChange}
                className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center"
                step="0.05"
                min="0.1"
                max="1.0"
                disabled={isSaving}
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="gpsRadiusMeters" className="text-gray-700 font-medium flex-grow">
                GPS Verification Radius (meters)
              </label>
              <input
                type="number"
                id="gpsRadiusMeters"
                name="gpsRadiusMeters"
                value={settings.gpsRadiusMeters}
                onChange={handleInputChange}
                className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center"
                min="1"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleSaveSettings}
          className={`px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2 ${
            isSaving ? 'opacity-75 cursor-not-allowed' : ''
          }`}
          disabled={isSaving}
        >
          {isSaving ? <Spinner size="small" color="white" isVisible={true} /> : <Save size={18} />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </motion.div>
  );
}

export default AdminSettings;