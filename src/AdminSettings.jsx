import React, { useState } from 'react';
import { Settings, User, Database, Shield, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import Spinner from './Spinner';

function AdminSettings({ addNotification }) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mock settings state - these would be fetched from the backend in a real app
  const [settings, setSettings] = useState({
    allowSelfRegistration: true,
    defaultUserRole: 'student',
    attendanceIpVerification: true,
    qrCodeExpiryMinutes: 5,
    maxFaceMatchDistance: 0.6,
  });

  const handleToggleChange = (settingName) => {
    setSettings(prev => ({
      ...prev,
      [settingName]: !prev[settingName]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    addNotification("Saving settings...", "info");

    try {
      // In a real application, you would make an API call here.
      // Example:
      // const response = await fetch(`${API_BASE_URL}/admin/settings`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${idToken}`,
      //   },
      //   body: JSON.stringify(settings),
      // });
      //
      // if (!response.ok) {
      //   throw new Error("Failed to save settings.");
      // }

      // Simulating a successful API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      addNotification("Settings saved successfully!", "success");
    } catch (error) {
      console.error("Error saving settings:", error);
      addNotification(`Failed to save settings: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
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
      
      {loading ? (
        <Spinner message="Loading settings..." />
      ) : (
        <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                <label htmlFor="maxFaceMatchDistance" className="text-gray-700 font-medium flex-grow">
                  Face Match Threshold (lower is stricter)
                </label>
                <input
                  type="number"
                  id="maxFaceMatchDistance"
                  name="maxFaceMatchDistance"
                  value={settings.maxFaceMatchDistance}
                  onChange={handleInputChange}
                  className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center space-x-4 mb-4 pb-2 border-b border-gray-200">
              <Shield size={24} className="text-red-600 flex-shrink-0" />
              <h3 className="font-semibold text-lg text-gray-800">Security Policies</h3>
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
            </div>
          </div>
        </div>
      )}

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