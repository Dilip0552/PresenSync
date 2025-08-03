import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

function NotificationSystem({ notification }) {
  if (!notification) {
    return null; // Don't render anything if there's no active notification
  }

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-white" />;
      case 'error': return <XCircle size={20} className="text-white" />;
      case 'info': return <Info size={20} className="text-white" />;
      case 'warning': return <AlertTriangle size={20} className="text-white" />;
      default: return null;
    }
  };

  let bgColorClass = '';
  switch (notification.type) {
    case 'success':
      bgColorClass = 'bg-green-600';
      break;
    case 'error':
      bgColorClass = 'bg-red-600';
      break;
    case 'warning':
      bgColorClass = 'bg-yellow-600';
      break;
    case 'info':
    default:
      bgColorClass = 'bg-blue-600';
      break;
  }

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.id} // Key is crucial for AnimatePresence to track items
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl text-white font-medium flex items-center space-x-3 min-w-[250px] max-w-xs sm:max-w-md md:max-w-lg text-center ${bgColorClass}`}
          role="alert"
        >
          {getIcon(notification.type)}
          <span className="flex-grow text-sm sm:text-base">{notification.message}</span>
          {/* No close button needed here, as parent manages dismissal via timeout */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NotificationSystem;
