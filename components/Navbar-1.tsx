
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, UserCircle, LogOut, Menu, X, Gavel, ActivitySquare } from 'lucide-react'; // Added Gavel, ActivitySquare
import { UserProfile, AddNotificationHandler } from '../types';
import { AccountModal } from './modals/AccountModal-1'; // Points to -1 version
import { SystemMonitorModal } from './modals/SystemMonitorModal'; // Assumes non -1 version is current

interface NavbarProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((val: UserProfile) => UserProfile)) => void;
  addNotification: AddNotificationHandler;
}

export const Navbar: React.FC<NavbarProps> = ({ userProfile, setUserProfile, addNotification }) => {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSystemMonitorModalOpen, setIsSystemMonitorModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isArbiter = userProfile.id === 'arbiter_MVP_001'; 

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
  ];

  if (isArbiter) {
    navLinks.push({ name: 'Arbiter Panel', path: '/arbiter' });
  }

  return (
    <>
      <nav className="bg-gray-800 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center text-teal-400 hover:text-teal-300 transition-colors">
              <Shield size={32} className="mr-2" />
              <span className="font-bold text-xl">Aegis Protocol</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map(link => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  {link.name === 'Arbiter Panel' && <Gavel size={18} className="mr-1.5" />}
                  {link.name}
                </Link>
              ))}
              <button
                onClick={() => setIsSystemMonitorModalOpen(true)}
                className="flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                title="System Monitor"
              >
                <ActivitySquare size={20} className="mr-1" />
                Monitor
              </button>
              <button 
                onClick={() => setIsAccountModalOpen(true)}
                className="flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <UserCircle size={20} className="mr-1" />
                {userProfile.username}
              </button>
              <button
                onClick={() => {
                  addNotification("You have been logged out. User session would be cleared.", 'info');
                  setUserProfile(prev => ({ ...prev, id: 'logged_out_user', username: 'Guest' })); 
                }}
                className="flex items-center text-gray-300 hover:bg-red-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-300 hover:text-white focus:outline-none">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map(link => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  {link.name === 'Arbiter Panel' && <Gavel size={18} className="inline mr-1.5 mb-0.5" />}
                  {link.name}
                </Link>
              ))}
              <button 
                onClick={() => { setIsSystemMonitorModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                <ActivitySquare size={20} className="mr-1" />
                System Monitor
              </button>
              <button 
                onClick={() => { setIsAccountModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                <UserCircle size={20} className="mr-1" />
                {userProfile.username} (Account)
              </button>
              <button
                onClick={() => { 
                  addNotification("You have been logged out. User session would be cleared.", 'info');
                  setUserProfile(prev => ({ ...prev, id: 'logged_out_user', username: 'Guest' }));
                  setIsMobileMenuOpen(false); 
                }}
                className="w-full text-left flex items-center text-gray-300 hover:bg-red-600 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                title="Logout"
              >
                <LogOut size={20} className="mr-1" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
      <AccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        addNotification={addNotification}
      />
      <SystemMonitorModal
        isOpen={isSystemMonitorModalOpen}
        onClose={() => setIsSystemMonitorModalOpen(false)}
      />
    </>
  );
};