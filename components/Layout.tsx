
import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { NotificationArea } from './NotificationArea';
import { UserProfile, AppNotification, AddNotificationHandler, NotificationType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((val: UserProfile) => UserProfile)) => void;
  notifications: AppNotification[];
  removeNotification: (id: string) => void;
  addNotification: AddNotificationHandler; // For AccountModal within Navbar
  transactionsHandled: number;
}

export const Layout: React.FC<LayoutProps> = ({ children, userProfile, setUserProfile, notifications, removeNotification, addNotification, transactionsHandled }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      <Navbar userProfile={userProfile} setUserProfile={setUserProfile} addNotification={addNotification} />
      <main className="flex-grow container mx-auto px-4 py-8 relative"> {/* Added relative for positioning notifications */}
        {children}
      </main>
      <NotificationArea notifications={notifications} removeNotification={removeNotification} />
      <Footer transactionsHandled={transactionsHandled} />
    </div>
  );
};
