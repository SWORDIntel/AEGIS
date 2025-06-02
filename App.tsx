
import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { EscrowDetailPage } from './pages/EscrowDetailPage';
import { AccountPage } from './pages/AccountPage';
import { Escrow, UserProfile, EscrowStatus, DefaultOutcome, AddEscrowInput, AppNotification, NotificationType } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateId } from './utils/helpers';

// Mock User Profile
const initialUserProfile: UserProfile = {
  id: 'user_001',
  username: 'PrivacyUserX',
  moneroPrivateKey: 'DEMO_SK_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  moneroPublicKey: 'DEMO_PK_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
  reputationScore: 85,
  settings: {
    useTor: false,
    moneroNodeUrl: 'http://localhost:18081 (Not Connected)',
  }
};

const App: React.FC = () => {
  const [escrows, setEscrows] = useLocalStorage<Escrow[]>('aegisEscrows', []);
  const [userProfile, setUserProfile] = useLocalStorage<UserProfile>('aegisUserProfile', initialUserProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const newNotification: AppNotification = {
      id: generateId(),
      message,
      type,
      timestamp: Date.now(),
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);


  const addEscrow = useCallback((newEscrowFields: AddEscrowInput) => {
    const escrowToAdd: Escrow = {
      id: generateId(),
      title: newEscrowFields.title,
      description: newEscrowFields.description,
      amountXMR: newEscrowFields.amountXMR,
      initiatorId: newEscrowFields.initiatorId,
      buyer: {
        id: newEscrowFields.buyerId,
        role: 'buyer',
        hasFunded: false,
        hasConfirmed: false,
      },
      seller: {
        id: newEscrowFields.sellerId,
        role: 'seller',
        hasFunded: false,
        hasConfirmed: false,
      },
      arbiterId: 'arbiter_MVP_001', // Default mock arbiter for MVP
      multiSigAddress: `mock_multisig_${generateId().substring(0,12)}`, // Mock multi-sig address
      status: EscrowStatus.PENDING_FUNDING,
      defaultOutcome: newEscrowFields.defaultOutcome,
      timerDurationHours: newEscrowFields.timerDurationHours,
      creationDate: new Date().toISOString(),
      lastUpdateDate: new Date().toISOString(),
      chatLog: [],
      arbiterInvolved: false,
      arbiterRuling: null,
    };
    setEscrows(prev => [escrowToAdd, ...prev]);
    addNotification(`Escrow "${escrowToAdd.title}" created successfully!`, 'success');
  }, [setEscrows, addNotification]);

  const updateEscrow = useCallback((updatedEscrow: Escrow, notificationMessage?: string) => {
    setEscrows(prev => prev.map(e => e.id === updatedEscrow.id ? {...updatedEscrow, lastUpdateDate: new Date().toISOString()} : e));
    if (notificationMessage) {
        addNotification(notificationMessage, 'info');
    }
  }, [setEscrows, addNotification]);
  
  const deleteEscrow = useCallback((escrowId: string) => {
    const escrowToDelete = escrows.find(e => e.id === escrowId);
    setEscrows(prev => prev.filter(e => e.id !== escrowId));
    if (escrowToDelete) {
        addNotification(`Escrow "${escrowToDelete.title}" deleted.`, 'warning');
    }
  }, [setEscrows, escrows, addNotification]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <svg className="animate-spin h-10 w-10 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-3 text-xl">Loading Aegis Protocol...</span>
      </div>
    );
  }

  return (
    <Layout 
        userProfile={userProfile} 
        setUserProfile={setUserProfile}
        notifications={notifications}
        removeNotification={removeNotification}
        addNotification={addNotification} // Pass addNotification for components like AccountModal inside Layout
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route 
          path="/dashboard" 
          element={
            <DashboardPage 
              escrows={escrows} 
              addEscrow={addEscrow}
              updateEscrow={updateEscrow} 
              deleteEscrow={deleteEscrow}
              currentUser={userProfile}
              addNotification={addNotification}
            />
          } 
        />
        <Route 
          path="/escrow/:id" 
          element={
            <EscrowDetailPage 
              escrows={escrows} 
              updateEscrow={updateEscrow}
              currentUser={userProfile}
              addNotification={addNotification}
            />
          } 
        />
        <Route path="/account" element={<AccountPage userProfile={userProfile} setUserProfile={setUserProfile} addNotification={addNotification} />} />
      </Routes>
    </Layout>
  );
};

export default App;
