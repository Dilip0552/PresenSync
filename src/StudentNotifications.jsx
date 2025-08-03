import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Info, XCircle, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext';
import Spinner from './Spinner';

function StudentNotifications({ addNotification }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const { db, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // Fetch notifications from Firestore
  useEffect(() => {
    if (!db || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const notificationsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    // Order by createdAt timestamp in descending order (most recent first)
    const q = query(notificationsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      addNotification("Failed to load notifications.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId, appId, addNotification]);

  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      const notificationDocRef = doc(db, `artifacts/${appId}/users/${userId}/notifications`, notificationId);
      await updateDoc(notificationDocRef, { read: true });
      addNotification("Notification marked as read.", "info");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      addNotification("Failed to mark notification as read.", "error");
    }
  }, [db, userId, appId, addNotification]);

  const handleDeleteNotification = useCallback(async (notificationId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this notification?");
    if (!confirmDelete) {
      return;
    }
    try {
      const notificationDocRef = doc(db, `artifacts/${appId}/users/${userId}/notifications`, notificationId);
      await deleteDoc(notificationDocRef);
      addNotification("Notification deleted.", "success");
    } catch (error) {
      console.error("Error deleting notification:", error);
      addNotification("Failed to delete notification.", "error");
    }
  }, [db, userId, appId, addNotification]);

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
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-6 sm:mb-8 flex items-center">
        <Bell size={28} className="mr-2 sm:mr-3 text-blue-600" />
        My Notifications
      </h1>

      {loading && <Spinner message="Loading notifications..." />}

      <div className="flex-grow bg-white p-4 sm:p-6 rounded-xl shadow-lg overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
        {notifications.length === 0 && !loading ? (
          <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">No new notifications.</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start p-3 sm:p-4 rounded-lg shadow-sm border relative ${notification.read ? 'opacity-70 bg-gray-50' : 'bg-white'}`}
                style={{
                  borderColor: notification.type === 'info' ? '#ADD8E6' :
                               notification.type === 'success' ? '#90EE90' :
                               notification.type === 'warning' ? '#FFD700' :
                               notification.type === 'error' ? '#FFB6C1' : '#E0E0E0',
                  backgroundColor: notification.type === 'info' ? '#E0F2F7' :
                                   notification.type === 'success' ? '#E6FFE6' :
                                   notification.type === 'warning' ? '#FFFBE5' :
                                   notification.type === 'error' ? '#FFF0F0' :
                                   notification.read ? '#F5F5F5' : '#FFFFFF'
                }}
              >
                <div className="flex-shrink-0 mr-3 mt-0.5 sm:mr-4 sm:mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-grow">
                  <p className="text-gray-800 text-sm sm:text-base">{notification.message}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-1 rounded-full text-blue-500 hover:bg-blue-100 transition-colors"
                      title="Mark as Read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotification(notification.id)}
                    className="p-1 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                    title="Delete Notification"
                  >
                    <Trash2 size={18} />
                  </button>
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
