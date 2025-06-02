
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, UserCircle, Settings, LogOut, Menu, X } from 'lucide-react';
import { UserProfile, AddNotificationHandler } from '../types';
import { AccountModal } from './modals/AccountModal';

interface NavbarProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((val: UserProfile) => UserProfile)) => void;
  addNotification: AddNotificationHandler;
}

export const Navbar: React.FC<NavbarProps> = ({ userProfile, setUserProfile, addNotification }) => {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    // { name: 'Create Escrow', path: '/escrow/new' }, // Or use modal
  ];

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
            <div className="hidden md:flex items-center space-x-4">
              {navLinks.map(link => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <button 
                onClick={() => setIsAccountModalOpen(true)}
                className="flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <UserCircle size={20} className="mr-1" />
                {userProfile.username}
              </button>
               {/* Mock Logout */}
              <button
                onClick={() => {
                  addNotification("Mock Logout: User session would be cleared.", 'info');
                  alert("Mock Logout: In a real app, this would clear session/keys.")
                }}
                className="flex items-center text-gray-300 hover:bg-red-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                title="Logout (Simulated)"
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
                  {link.name}
                </Link>
              ))}
              <button 
                onClick={() => { setIsAccountModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                <UserCircle size={20} className="mr-1" />
                {userProfile.username} (Account)
              </button>
              <button
                onClick={() => { 
                  addNotification("Mock Logout: User session would be cleared.", 'info');
                  alert("Mock Logout: In a real app, this would clear session/keys."); 
                  setIsMobileMenuOpen(false); 
                }}
                className="w-full text-left flex items-center text-gray-300 hover:bg-red-600 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                title="Logout (Simulated)"
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
    </>
  );
};
