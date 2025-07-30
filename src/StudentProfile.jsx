import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, BookOpen, Calendar, Edit2, Save } from 'lucide-react';

function StudentProfile({ studentInfo, addNotification, setStudentInfo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(studentInfo); 

  useEffect(() => {
      addNotification("Profile page loaded.", "info");
      setFormData(studentInfo);
  }, [studentInfo, addNotification]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    addNotification("Saving profile...", "info");
    setTimeout(() => {
      setStudentInfo(formData); 
      addNotification("Profile updated successfully!", "success");
      setIsEditing(false);
    }, 1500);
  };

  const handleEditSaveClick = () => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 sm:p-6 rounded-br-3xl"> 
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-6 sm:mb-8 flex items-center"> {/* Adjusted font size and margin */}
        <User size={28} className="mr-2 sm:mr-3 text-blue-600" />
        My Profile
      </h1>

      <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg flex-grow"> 
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 border-b pb-3 sm:pb-4"> 
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-0">Personal Information</h2> 
            <button
                onClick={handleEditSaveClick}
                className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md text-sm sm:text-base" 
            >
                {isEditing ? (
                    <>
                        <Save size={16} className="mr-1.5 sm:mr-2" /> Save
                    </>
                ) : (
                    <>
                        <Edit2 size={16} className="mr-1.5 sm:mr-2" /> Edit Profile
                    </>
                )}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-base sm:text-lg"> 
            <div className="col-span-full flex flex-col items-center mb-4 sm:mb-6"> 
                <img src={formData.profilePic} alt="Profile" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 sm:border-4 border-blue-200 shadow-md object-cover" /> 
                <span className="mt-2 sm:mt-3 font-semibold text-lg sm:text-xl text-gray-900">{formData.name}</span>
                <span className="text-gray-600 text-sm sm:text-md">{formData.program}</span> 
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center"> 
                <div className="flex items-center mb-2 sm:mb-0"> 
                  <Mail size={18} className="text-gray-500 mr-2 sm:mr-3" /> 
                  <span className="font-medium text-gray-700 mr-1 sm:mr-2">Email:</span> 
                </div>
                {isEditing ? (
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="flex-grow w-full px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base" 
                    />
                ) : (
                    <span className="text-gray-900 break-words sm:break-normal text-sm sm:text-base">{formData.email}</span> 
                )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
                <div className="flex items-center mb-2 sm:mb-0">
                  <Phone size={18} className="text-gray-500 mr-2 sm:mr-3" />
                  <span className="font-medium text-gray-700 mr-1 sm:mr-2">Phone:</span>
                </div>
                {isEditing ? (
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        placeholder="Add phone number"
                        className="flex-grow w-full px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                    />
                ) : (
                    <span className="text-gray-900 text-sm sm:text-base">{formData.phone || 'N/A'}</span>
                )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
                <div className="flex items-center mb-2 sm:mb-0">
                  <User size={18} className="text-gray-500 mr-2 sm:mr-3" />
                  <span className="font-medium text-gray-700 mr-1 sm:mr-2">Student ID:</span>
                </div>
                <span className="text-gray-900 text-sm sm:text-base">{formData.id}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
                <div className="flex items-center mb-2 sm:mb-0">
                  <BookOpen size={18} className="text-gray-500 mr-2 sm:mr-3" />
                  <span className="font-medium text-gray-700 mr-1 sm:mr-2">Program:</span>
                </div>
                <span className="text-gray-900 break-words sm:break-normal text-sm sm:text-base">{formData.program}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center">
                <div className="flex items-center mb-2 sm:mb-0">
                  <Calendar size={18} className="text-gray-500 mr-2 sm:mr-3" />
                  <span className="font-medium text-gray-700 mr-1 sm:mr-2">Enrolled Since:</span>
                </div>
                <span className="text-gray-900 text-sm sm:text-base">{formData.enrollmentDate}</span>
            </div>
           
        </div>

        {isEditing && (
            <div className="mt-6 sm:mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md text-base sm:text-lg" 
                >
                    <Save size={18} className="mr-1.5 sm:mr-2" /> Save Changes
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

export default StudentProfile;