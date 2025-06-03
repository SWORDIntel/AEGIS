
import React, { useEffect } from 'react';
import { AppNotification, NotificationType } from '../types';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

interface NotificationItemProps {
  notification: AppNotification;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 7000); // Auto-dismiss after 7 seconds

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  let bgColor = 'bg-gray-700';
  let textColor = 'text-gray-100';
  let IconComponent = Info;

  switch (notification.type) {
    case 'success':
      bgColor = 'bg-green-600';
      textColor = 'text-white';
      IconComponent = CheckCircle;
      break;
    case 'error':
      bgColor = 'bg-red-600';
      textColor = 'text-white';
      IconComponent = AlertCircle;
      break;
    case 'warning':
      bgColor = 'bg-yellow-500';
      textColor = 'text-black';
      IconComponent = AlertTriangle;
      break;
    case 'info':
      bgColor = 'bg-blue-600';
      textColor = 'text-white';
      IconComponent = Info;
      break;
  }

  return (
    <div 
      className={`flex items-center justify-between w-full max-w-sm p-3 rounded-lg shadow-xl mb-3 ${bgColor} ${textColor} animate-fadeInRight`}
      role="alert"
    >
      <div className="flex items-center">
        <IconComponent size={20} className="mr-2 flex-shrink-0" />
        <p className="text-sm font-medium">{notification.message}</p>
      </div>
      <button 
        onClick={() => onDismiss(notification.id)} 
        className={`ml-3 p-1 rounded-full hover:bg-black/20 transition-colors`}
        aria-label="Dismiss notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};

interface NotificationAreaProps {
  notifications: AppNotification[];
  removeNotification: (id: string) => void;
}

export const NotificationArea: React.FC<NotificationAreaProps> = ({ notifications, removeNotification }) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-[100] w-full max-w-sm">
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onDismiss={removeNotification} 
        />
      ))}
    </div>
  );
};
