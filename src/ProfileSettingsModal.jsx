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

  return (
    <div className="fixed top-0 px-8 py-8 left-0 w-full h-full bg-transparent bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white w-full p-6 rounded-2xl shadow-2xl overflow-y-auto scrollbar-none h-full relative outline-2 outline-blue-200"
        style={{ scrollbarWidth: 'none' }}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer"
          onClick={() => setShowSettings(false)}
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">Profile & Settings</h2>

        <section className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Profile Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200"
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200"
            />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200"
            />
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Department"
              className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200"
            />
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Subject Taught"
              className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200"
            />
            <input
              type="text"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              placeholder="Employee ID"
              className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200"
            />
          </div>
        </section>

        <section className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Account Settings</h3>
          <div className="space-y-2">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Change Password"
              className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200"
            />
          </div>
        </section>

        <section className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Appearance</h3>
          <label className="flex items-center space-x-4">
            <span>Theme:</span>
            <select
              name="theme"
              value={formData.theme}
              onChange={handleChange}
              className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200 cursor-pointer"
            >
              <option>Light</option>
              <option>Dark</option>
            </select>
          </label>
        </section>

        <section className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Notifications</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="notifications"
              checked={formData.notifications}
              onChange={handleChange}
              className="mr-2 cursor-pointer"
            />
            Email Notifications
          </label>
        </section>

        <section className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Support & Feedback</h3>
          <textarea
            name="feedback"
            value={formData.feedback}
            onChange={handleChange}
            placeholder="Leave your feedback here..."
            className="px-2 py-2 rounded-lg border-2 border-blue-200 outline-blue-200 w-full"
            rows={3}
          />
        </section>
          <button className="font-medium border-2 border-blue-300 bg-blue-100 p-2 rounded w-full hover:bg-blue-200 cursor-pointer">
            Save Changes
          </button>

        <section className="text-red-600 mt-10">
          <h3 className="text-xl font-semibold mb-2">Danger Zone</h3>
          <button className="border border-red-600 p-2 rounded w-full hover:bg-red-50 cursor-pointer">
            Delete Account
          </button>
        </section>
      </div>
    </div>
  );
}

export default ProfileSettingsModal;
