
import React, { useEffect } from 'react';
import { UserProfile, AddNotificationHandler } from '../types';
import { AccountModal } from '../components/modals/AccountModal'; // Re-using modal for now

interface AccountPageProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((val: UserProfile) => UserProfile)) => void;
  addNotification: AddNotificationHandler;
}

export const AccountPage: React.FC<AccountPageProps> = ({ userProfile, setUserProfile, addNotification }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(true); // Open modal by default when navigating here

  useEffect(() => {
    if(!isModalOpen) {
      // For now, let's just allow it to be closed.
    }
  }, [isModalOpen]);

  return (
    <div className="p-6 bg-gray-800 shadow-xl rounded-lg">
      <h1 className="text-3xl font-bold text-teal-400 mb-4">Account Settings</h1>
      <p className="text-gray-300 mb-6">
        Manage your profile, security settings, and application preferences.
      </p>
      
      <div className="bg-gray-700 p-4 rounded-md">
        <p className="text-lg text-white">Username: {userProfile.username}</p>
        <p className="text-sm text-gray-400">Reputation: {userProfile.reputationScore}/100</p>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-md transition-colors"
        >
            Open Full Account Details & Settings
        </button>
      </div>

      {!isModalOpen && (
        <div className="mt-8 text-center text-gray-500">
            <p>(Account details modal closed. More settings will appear here in future versions.)</p>
        </div>
      )}

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        addNotification={addNotification} // Pass to the modal
      />
    </div>
  );
};