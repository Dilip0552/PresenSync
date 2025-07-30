import React, { useState } from 'react';
import { X } from 'lucide-react';

function ProfileSettingsModal({ setShowSettings }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    subject: '',
    employeeId: '',
    password: '',
    theme: 'Light', 
    notifications: false,
    feedback: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Profile Settings Saved:', formData);
    setShowSettings(false); 
  };

  return (
    <div className="fixed inset-0 bg-white bg-opacity-10 flex items-center justify-center z-50 p-4">
    
      <div
        className="bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative p-6 sm:p-8 md:p-10 lg:p-12  outline-2 outline-blue-200"
        style={{ scrollbarWidth: 'none' }} 
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors"
          onClick={() => setShowSettings(false)}
          aria-label="Close settings modal"
        >
          <X size={28} /> 
        </button>

        <h2 className="text-3xl font-bold mb-8 text-center text-blue-800">Profile & Settings</h2>

        <form onSubmit={handleSubmit}>
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
                  placeholder="Dilip Suthar"
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="dilip.suthar@sitare.org"
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
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
                  placeholder="+91 9078903432"
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                />
              </div>
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
                />
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Account Settings</h3>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Change Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter new password"
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
              />
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
            />
          </section>

          <button
            type="submit" 
            className="w-full font-semibold text-lg py-3 rounded-lg transition-colors duration-300
                       bg-blue-600 text-white hover:bg-blue-700 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Save Changes
          </button>
        </form>

        <section className="mt-12"> 
          <h3 className="text-2xl font-semibold mb-4 text-red-700">Danger Zone</h3>
          <button
            type="button" 
            className="w-full font-semibold text-lg py-3 rounded-lg transition-colors duration-300
                       border-2 border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            onClick={() => alert("Delete Account functionality to be implemented!")}
          >
            Delete Account
          </button>
        </section>
      </div>
      
    </div>
  );
}

export default ProfileSettingsModal;