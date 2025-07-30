import React, { useState, useEffect } from 'react';
import { Bell, Info, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

function StudentNotifications({ studentInfo, addNotification }) {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'info', message: 'Welcome to your new dashboard! Explore the features.', date: '2025-07-30' },
    { id: 2, type: 'success', message: 'Your attendance for Web Dev 101 on 2025-07-30 was successfully marked.', date: '2025-07-30' },
    { id: 3, type: 'warning', message: 'You were marked late for Database Management on 2025-07-28.', date: '2025-07-28' },
    { id: 4, type: 'error', message: 'Failed to mark attendance for Physics on 2025-07-25. Please try again.', date: '2025-07-25' },
    { id: 5, type: 'info', message: 'Upcoming holiday: No classes on August 15th, 2025.', date: '2025-07-20' },
  ]);

  useEffect(() => {
    addNotification("Notifications loaded.", "info");
  }, [addNotification]);

  const getIcon = (type) => {
    const iconSize = 20; 
    const mobileIconSize = 18; 

    switch (type) {
      case 'info': return <Info size={mobileIconSize} className="sm:size-[20px] text-blue-500" />;
      case 'success': return <CheckCircle size={mobileIconSize} className="sm:size-[20px] text-green-500" />;
      case 'warning': return <AlertTriangle size={mobileIconSize} className="sm:size-[20px] text-yellow-500" />;
      case 'error': return <XCircle size={mobileIconSize} className="sm:size-[20px] text-red-500" />;
      default: return <Bell size={mobileIconSize} className="sm:size-[20px] text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 sm:p-6 rounded-br-3xl"> 
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-6 sm:mb-8 flex items-center"> {/* Adjusted font size and margin */}
        <Bell size={28} className="mr-2 sm:mr-3 text-blue-600" /> 
        My Notifications
      </h1>

      <div className="flex-grow bg-white p-4 sm:p-6 rounded-xl shadow-lg"> 
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">No new notifications.</p>
        ) : (
          <div className="space-y-3 sm:space-y-4"> 
            {notifications.map(notification => (
              <div
                key={notification.id}
                className="flex items-start p-3 sm:p-4 rounded-lg shadow-sm border" 
                style={{
                  borderColor: notification.type === 'info' ? '#ADD8E6' :
                               notification.type === 'success' ? '#90EE90' :
                               notification.type === 'warning' ? '#FFD700' :
                               notification.type === 'error' ? '#FFB6C1' : '#E0E0E0',
                  backgroundColor: notification.type === 'info' ? '#E0F2F7' :
                                   notification.type === 'success' ? '#E6FFE6' :
                                   notification.type === 'warning' ? '#FFFBE5' :
                                   notification.type === 'error' ? '#FFF0F0' : '#FFFFFF'
                }}
              >
                <div className="flex-shrink-0 mr-3 mt-0.5 sm:mr-4 sm:mt-1"> 
                  {getIcon(notification.type)}
                </div>
                <div className="flex-grow">
                  <p className="text-gray-800 text-sm sm:text-base">{notification.message}</p> 
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentNotifications;