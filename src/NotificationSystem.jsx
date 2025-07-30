import React, { useEffect } from 'react';

function NotificationSystem({ notifications, setNotifications }) {
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 5000); 

      return () => clearTimeout(timer);
    }
  }, [notifications, setNotifications]); 

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`px-6 py-3 rounded-lg shadow-xl text-white font-medium flex items-center space-x-3
            ${notification.type === "success" ? "bg-green-500" :
             notification.type === "error" ? "bg-red-500" : "bg-blue-500"}`}
        >
          {notification.type === "success" && <img src="/src/assets/check-mark.png" style={{filter:"invert()"}} alt="Success" className="w-5 h-5" />}
          {notification.type === "error" && <img src="/src/assets/warning.png" style={{filter:"invert()"}} alt="Error" className="w-5 h-5" />}
          {notification.type === "info" && <img src="/src/assets/info.png" style={{filter:"invert()"}} alt="Info" className="w-5 h-5" />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            className="ml-auto text-white hover:text-gray-100 font-bold"
          >
            &times; 
          </button>
        </div>
      ))}
    </div>
  );
}

export default NotificationSystem;