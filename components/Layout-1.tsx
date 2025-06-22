
import React from 'react';
import { Navbar } from './Navbar-1'; // Points to the -1 version
import { Footer } from './Footer-1'; // Points to the -1 version
import { NotificationArea } from './NotificationArea-1'; // Points to the -1 version
import { UserProfile, AppNotification, AddNotificationHandler } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((val: UserProfile) => UserProfile)) => void;
  notifications: AppNotification[];
  removeNotification: (id: string) => void;
  addNotification: AddNotificationHandler; 
  transactionsHandled: number; 
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, 
    userProfile, 
    setUserProfile, 
    notifications, 
    removeNotification, 
    addNotification, 
    transactionsHandled 
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      <Navbar 
        userProfile={userProfile} 
        setUserProfile={setUserProfile} 
        addNotification={addNotification} // Pass to Navbar
      />
      <main className="flex-grow container mx-auto px-4 py-8 relative">
        {children}
      </main>
      <NotificationArea notifications={notifications} removeNotification={removeNotification} />
      <Footer transactionsHandled={transactionsHandled} /> 
    </div>
  );
};
