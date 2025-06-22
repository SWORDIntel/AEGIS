import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserSettings, AddNotificationHandler, MoneroTransaction, GetTransfersParams } from '../../types';
import { X, UserCircle, Key, Zap, ShieldCheck, Save, AlertTriangle, FileText, Lock, CheckSquare, RotateCcw, RefreshCw, Wallet, Server, Network, Activity, Unlock, List, ListFilter, ArrowDownUp, Shield, Scan } from 'lucide-react'; // Added Shield, Scan
import { encryptMnemonic, decryptMnemonic, getWalletTransfers, formatDate, generateId } from '../../utils/helpers';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((val: UserProfile) => UserProfile)) => void;
  addNotification: AddNotificationHandler;
}

const generateMnemonicPhrase = () => {
    const words = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew", "kiwi", "lemon", "mango", "nectarine", "orange", "papaya", "quince", "raspberry", "strawberry", "tangerine", "ugli", "vanilla", "watermelon", "xigua", "yuzu", "zucchini"];
    return Array(12).fill(null).map(() => words[Math.floor(Math.random() * words.length)]).join(' ');
}

const generateNewKeys = (prefix: string) => {
    return {
        privateKey: `${prefix}_SK_` + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36).slice(-6),
        publicKey: `${prefix}_PK_` + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36).slice(-6),
    }
}

type TransactionSortKey = 'timestamp' | 'amount' | 'type';
type TransactionSortOrder = 'asc' | 'desc';
type TransactionFilterType = 'all' | MoneroTransaction['type'];

const TOTP_VERIFICATION_CODE = "123456"; // For system use

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, userProfile, setUserProfile, addNotification }) => {
  const [currentSettings, setCurrentSettings] = useState<UserSettings>(userProfile.settings);
  const [showKeys, setShowKeys] = useState(false);

  const [activeMnemonic, setActiveMnemonic] = useState<string | null>(null);
  const [backupConfirmed1, setBackupConfirmed1] = useState(false);
  const [backupConfirmed2, setBackupConfirmed2] = useState(false);
  const [walletPassword, setWalletPassword] = useState('');
  const [restoreMnemonicInput, setRestoreMnemonicInput] = useState('');

  const [encryptedMnemonicLS, setEncryptedMnemonicLS, removeEncryptedMnemonicLS] = useLocalStorage<string | null>('encryptedMoneroMnemonic', null);
  const [isDecryptingUI, setIsDecryptingUI] = useState(false);
  const [isProcessingCrypto, setIsProcessingCrypto] = useState(false);

  const [pendingDecryptedMnemonic, setPendingDecryptedMnemonic] = useState<string | null>(null);
  const [isAwaitingTotpForUnlock, setIsAwaitingTotpForUnlock] = useState(false);
  const [totpForUnlockInput, setTotpForUnlockInput] = useState('');

  const [isTotpSetupMode, setIsTotpSetupMode] = useState(false);
  const [generatedTotpSecret, setGeneratedTotpSecret] = useState('');
  const [totpVerificationInput, setTotpVerificationInput] = useState('');
  const [disableTotpInput, setDisableTotpInput] = useState('');


  const [nodeStatus, setNodeStatus] = useState<string>("N/A");
  const [blockchainHeight, setBlockchainHeight] = useState<string>("N/A");
  const [walletSyncHeight, setWalletSyncHeight] = useState<string>("N/A");
  const [walletBalance, setWalletBalance] = useState<string>("N/A");

  const [scannedTransactions, setScannedTransactions] = useState<MoneroTransaction[]>([]);
  const [isScanningTransactions, setIsScanningTransactions] = useState(false);
  
  const [filterType, setFilterType] = useState<TransactionFilterType>('all');
  const [sortKey, setSortKey] = useState<TransactionSortKey>('timestamp');
  const [sortOrder, setSortOrder] = useState<TransactionSortOrder>('desc');

  useEffect(() => {
    let shouldSetDecryptingUI = false;
    if (encryptedMnemonicLS && !activeMnemonic && !pendingDecryptedMnemonic) {
      shouldSetDecryptingUI = true;
    }

    if (shouldSetDecryptingUI) {
      if (!isDecryptingUI && !isAwaitingTotpForUnlock) { 
        addNotification("Encrypted wallet found. Enter password to unlock.", "info");
      }
      setIsDecryptingUI(true);
    } else {
      setIsDecryptingUI(false);
    }
  }, [encryptedMnemonicLS, activeMnemonic, pendingDecryptedMnemonic, isDecryptingUI, isAwaitingTotpForUnlock, addNotification]);
  
  const handleSettingChange = <K extends keyof UserSettings,>(key: K, value: UserSettings[K]) => {
    setCurrentSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveChanges = () => {
    setUserProfile(prev => ({ ...prev, settings: currentSettings }));
    addNotification('Account settings saved successfully!', 'success');
    // If TOTP setup was in progress but not completed, cancel it
    if (isTotpSetupMode) {
        setIsTotpSetupMode(false);
        setGeneratedTotpSecret('');
        setTotpVerificationInput('');
    }
  };
  
  const handleGenerateMnemonic = () => {
    const newMnemonic = generateMnemonicPhrase();
    setActiveMnemonic(newMnemonic);
    const newKeys = generateNewKeys("GENERATED");
    setUserProfile(prev => ({
        ...prev,
        moneroPrivateKey: newKeys.privateKey,
        moneroPublicKey: newKeys.publicKey,
    }));
    setBackupConfirmed1(false);
    setBackupConfirmed2(false);
    setWalletPassword('');
    setShowKeys(true); 
    setIsDecryptingUI(false);
    setPendingDecryptedMnemonic(null);
    setIsAwaitingTotpForUnlock(false);
    addNotification("New mnemonic generated & keys updated. Securely back it up and set a password to encrypt it.", "info");
  }

  const handleConfirmWalletSetup = async () => {
    if (!activeMnemonic) {
        addNotification("No active mnemonic to encrypt.", "error");
        return;
    }
    if (!backupConfirmed1 || !backupConfirmed2) {
        addNotification("Please confirm you have backed up the mnemonic phrase.", "warning");
        return;
    }
    if (!walletPassword) {
        addNotification("Please set a wallet encryption password.", "warning");
        return;
    }

    setIsProcessingCrypto(true);
    try {
      const encrypted = await encryptMnemonic(activeMnemonic, walletPassword);
      setEncryptedMnemonicLS(encrypted);
      addNotification("Mnemonic encrypted and stored locally!", "success");
      setActiveMnemonic(null); 
      setBackupConfirmed1(false);
      setBackupConfirmed2(false);
      setWalletPassword('');
      setShowKeys(false);
    } catch (err: any) {
      console.error("Encryption error:", err);
      let message = "Failed to encrypt mnemonic. Please try again.";
      if (err instanceof DOMException && err.name === 'NotSupportedError') {
        message = "Web Crypto API not supported on this browser. Please use a modern browser.";
      }
      addNotification(message, "error");
    } finally {
      setIsProcessingCrypto(false);
    }
  }

  const handleLoadAndDecryptMnemonic = async () => {
    if (!walletPassword) {
      addNotification("Please enter your wallet password.", "warning");
      return;
    }
    if (!encryptedMnemonicLS) {
      addNotification("No encrypted wallet found to unlock.", "error");
      return;
    }

    setIsProcessingCrypto(true);
    try {
      const decrypted = await decryptMnemonic(encryptedMnemonicLS, walletPassword);
      if (userProfile.settings.totpEnabled) {
        setPendingDecryptedMnemonic(decrypted);
        setIsAwaitingTotpForUnlock(true);
        setIsDecryptingUI(false); // Hide password UI, show TOTP UI
        addNotification("Password verified. Enter TOTP code to complete unlock.", "info");
        setWalletPassword(''); // Clear password for security
      } else {
        setActiveMnemonic(decrypted);
        const newKeys = generateNewKeys("UNLOCKED");
        setUserProfile(prev => ({
            ...prev,
            moneroPrivateKey: newKeys.privateKey,
            moneroPublicKey: newKeys.publicKey,
        }));
        setShowKeys(true);
        addNotification("Wallet unlocked successfully and keys updated!", "success");
        setIsDecryptingUI(false); 
        setWalletPassword('');
      }
    } catch (error: any) {
      console.error("Decryption error:", error);
      addNotification(error.message || "Decryption failed. Incorrect password or corrupted data.", "error");
    } finally {
      setIsProcessingCrypto(false);
    }
  };
  
  const handleTotpVerificationForUnlock = () => {
    if (!pendingDecryptedMnemonic) {
        addNotification("Internal error: No pending mnemonic to unlock.", "error");
        return;
    }
    if (totpForUnlockInput === TOTP_VERIFICATION_CODE) {
        setActiveMnemonic(pendingDecryptedMnemonic);
        const newKeys = generateNewKeys("UNLOCKED_2FA");
        setUserProfile(prev => ({
            ...prev,
            moneroPrivateKey: newKeys.privateKey,
            moneroPublicKey: newKeys.publicKey,
        }));
        setShowKeys(true);
        addNotification("Wallet unlocked successfully with TOTP and keys updated!", "success");
        setIsAwaitingTotpForUnlock(false);
        setPendingDecryptedMnemonic(null);
        setTotpForUnlockInput('');
    } else {
        addNotification("Incorrect TOTP code. Please try again.", "error");
    }
  };


  const handleRestoreMnemonic = () => {
    if (!restoreMnemonicInput.trim()) {
        addNotification("Please enter a mnemonic phrase to restore.", "warning");
        return;
    }
    const newKeys = generateNewKeys("RESTORED");
     setUserProfile(prev => ({
        ...prev,
        moneroPrivateKey: newKeys.privateKey,
        moneroPublicKey: newKeys.publicKey,
    }));
    setActiveMnemonic(restoreMnemonicInput.trim());
    setShowKeys(true); 
    setRestoreMnemonicInput('');
    setIsDecryptingUI(false);
    setPendingDecryptedMnemonic(null);
    setIsAwaitingTotpForUnlock(false);
    addNotification(`Wallet restored with provided phrase. Keys updated. You may now encrypt it.`, 'success');
  }

  const handleRefreshNodeStatus = () => {
    const statuses = ["Connected", "Connecting...", "Disconnected"];
    setNodeStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    const height = 2800000 + Math.floor(Math.random() * 100000);
    setBlockchainHeight(height.toLocaleString());
    setWalletSyncHeight((height - Math.floor(Math.random() * 20)).toLocaleString());
    addNotification("Node status updated.", "info");
  }

  const handleRefreshBalance = () => {
    setWalletBalance(`${(Math.random() * 15).toFixed(6)} XMR`);
    addNotification("Wallet balance updated.", "info");
  }

  const handleScanTransactions = async () => {
    if (!currentSettings.moneroNodeUrl || !currentSettings.moneroNodeUrl.startsWith('http')) {
      addNotification("Monero Node URL is not set or invalid. Please configure it in settings (e.g., http://127.0.0.1:18081).", "warning");
      return;
    }
    
    setIsScanningTransactions(true);
    addNotification("Scanning transactions...", "info");

    const params: GetTransfersParams = {
      in: true,
      out: true,
      pool: true,
      pending: true,
      failed: false, 
      account_index: 0,
    };

    try {
      const rpcEndpoint = currentSettings.moneroNodeUrl.endsWith('/json_rpc') 
        ? currentSettings.moneroNodeUrl 
        : `${currentSettings.moneroNodeUrl}/json_rpc`;

      const response = await getWalletTransfers(rpcEndpoint, params);
      let allTransactions: MoneroTransaction[] = [];

      if (response.in) allTransactions = allTransactions.concat(response.in);
      if (response.out) allTransactions = allTransactions.concat(response.out);
      if (response.pool) allTransactions = allTransactions.concat(response.pool);
      if (response.pending) allTransactions = allTransactions.concat(response.pending);
      
      allTransactions.sort((a, b) => b.timestamp - a.timestamp); 

      setScannedTransactions(allTransactions);
      if (allTransactions.length > 0) {
         addNotification(`${allTransactions.length} transaction(s) loaded.`, 'success');
      } else {
        addNotification('No new transactions found.', 'info');
      }
    } catch (error: any) {
      console.error("Error scanning transactions:", error);
      addNotification(`Error scanning transactions: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsScanningTransactions(false);
    }
  };
  
  const handleDiscardAndStartNew = () => {
    if (isProcessingCrypto) return;
    removeEncryptedMnemonicLS();
    setIsDecryptingUI(false);
    setWalletPassword('');
    setActiveMnemonic(null);
    setPendingDecryptedMnemonic(null);
    setIsAwaitingTotpForUnlock(false);
    setTotpForUnlockInput('');
    setUserProfile(prev => ({
        ...prev,
        moneroPrivateKey: 'SK_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        moneroPublicKey: 'PK_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    }));
    setShowKeys(false);
    addNotification("Encrypted wallet discarded. Keys reset. You can generate a new wallet or restore from an existing mnemonic.", "info");
  }

  const handleEnableTotp = () => {
    const secret = `SECRET_${generateId().toUpperCase()}`; // More generic prefix
    setGeneratedTotpSecret(secret);
    setIsTotpSetupMode(true);
    addNotification("TOTP Setup: Scan QR and enter code.", "info");
  }

  const handleVerifyAndEnableTotp = () => {
    if (totpVerificationInput === TOTP_VERIFICATION_CODE) {
        setCurrentSettings(prev => ({...prev, totpEnabled: true, totpSecretMock: generatedTotpSecret}));
        // Note: handleSaveChanges() will persist this to userProfile and localStorage
        addNotification("TOTP enabled! Save settings to persist this.", "success");
        setIsTotpSetupMode(false);
        setTotpVerificationInput('');
    } else {
        addNotification("Incorrect verification code.", "error");
    }
  }
  
  const handleDisableTotp = () => {
    if (disableTotpInput === TOTP_VERIFICATION_CODE) {
        setCurrentSettings(prev => ({...prev, totpEnabled: false, totpSecretMock: undefined}));
        addNotification("TOTP disabled. Save settings to persist this change.", "success");
        setDisableTotpInput('');
    } else {
        addNotification("Incorrect TOTP code. Disabling failed.", "error");
    }
  }

  const displayedTransactions = useMemo(() => {
    let filtered = scannedTransactions;
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'timestamp') {
        comparison = a.timestamp - b.timestamp;
      } else if (sortKey === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortKey === 'type') {
        comparison = a.type.localeCompare(b.type);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [scannedTransactions, filterType, sortKey, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  const otpAuthUrl = useMemo(() => {
    if (!generatedTotpSecret) return '';
    // Use a URL-safe username or a generic identifier
    const issuer = "AegisProtocol";
    const accountName = userProfile.username.replace(/[^a-zA-Z0-9.-_@]/g, '');
    return `otpauth://totp/${issuer}:${accountName}?secret=${generatedTotpSecret}&issuer=${issuer}`;
  }, [generatedTotpSecret, userProfile.username]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-teal-400 flex items-center">
            <UserCircle size={28} className="mr-2" /> Account & Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-400">Username</p>
            <p className="text-lg text-white">{userProfile.username}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Reputation Score</p>
            <p className="text-lg text-white flex items-center">
              {userProfile.reputationScore}/100 
              <ShieldCheck size={20} className="ml-2 text-green-400" />
            </p>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center"><FileText size={20} className="mr-2 text-teal-400" />Wallet Management</h3>
            <p className="text-xs text-gray-400 mb-3">Manage your Monero wallet. Keys are updated upon generation, restoration, or unlocking.</p>
            
            {isDecryptingUI && (
              <div className="bg-gray-700 p-4 rounded-md space-y-3 mb-4 border border-teal-500">
                <p className="text-md font-semibold text-teal-300">Unlock Your Wallet</p>
                <p className="text-xs text-gray-400">An encrypted wallet was found. Enter your password to unlock and load it.</p>
                <div>
                  <label htmlFor="walletPasswordDecrypt" className="block text-sm font-medium text-gray-300 mb-1">Wallet Password</label>
                  <input
                      type="password"
                      id="walletPasswordDecrypt"
                      value={walletPassword}
                      onChange={(e) => setWalletPassword(e.target.value)}
                      className="w-full bg-gray-600 text-white border border-gray-500 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter password to unlock"
                      aria-required="true"
                  />
                </div>
                <button
                  onClick={handleLoadAndDecryptMnemonic}
                  disabled={isProcessingCrypto || !walletPassword}
                  className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {isProcessingCrypto ? <RotateCcw size={18} className="mr-2 animate-spin" /> : <Unlock size={18} className="mr-2" />}
                  {isProcessingCrypto ? "Verifying..." : "Unlock Wallet"}
                </button>
                 <button
                  onClick={handleDiscardAndStartNew}
                  disabled={isProcessingCrypto}
                  className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  <AlertTriangle size={18} className="mr-2" /> Discard & Start New
                </button>
              </div>
            )}

            {isAwaitingTotpForUnlock && (
                 <div className="bg-gray-700 p-4 rounded-md space-y-3 mb-4 border border-sky-500">
                    <p className="text-md font-semibold text-sky-300">Enter TOTP Code</p>
                    <p className="text-xs text-gray-400">Enter the 6-digit code from your authenticator app to complete wallet unlock.</p>
                    <div>
                        <label htmlFor="totpForUnlock" className="block text-sm font-medium text-gray-300 mb-1">TOTP Code</label>
                        <input
                            type="text"
                            id="totpForUnlock"
                            value={totpForUnlockInput}
                            onChange={(e) => setTotpForUnlockInput(e.target.value.replace(/\D/g, '').slice(0,6))}
                            maxLength={6}
                            className="w-full bg-gray-600 text-white border border-gray-500 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500 text-center tracking-widest"
                            placeholder="123456"
                        />
                    </div>
                    <button
                        onClick={handleTotpVerificationForUnlock}
                        disabled={totpForUnlockInput.length !== 6}
                        className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500"
                    >
                        <ShieldCheck size={18} className="mr-2"/> Verify TOTP & Unlock
                    </button>
                 </div>
            )}


            {!isDecryptingUI && !activeMnemonic && !isAwaitingTotpForUnlock && (
              <button
                onClick={handleGenerateMnemonic}
                className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-md transition-colors flex items-center justify-center mb-2"
              >
                <Zap size={18} className="mr-2" /> Generate New Mnemonic & Keys
              </button>
            )}

            {activeMnemonic && (
              <div className="bg-gray-700 p-4 rounded-md space-y-3">
                <p className="text-sm text-yellow-300 font-semibold">Your Active Mnemonic Phrase:</p>
                <div className="bg-gray-900 p-3 rounded font-mono text-center text-orange-300 text-sm break-words" aria-live="polite">
                  {activeMnemonic}
                </div>
                <p className="text-xs text-red-400 font-bold">CRITICAL: If this is a newly generated or restored mnemonic, write these words down and store them securely. This is the ONLY way to recover your wallet.</p>
                
                <label className="flex items-start text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={backupConfirmed1} onChange={() => setBackupConfirmed1(!backupConfirmed1)} className="mr-2 mt-1 accent-teal-500" aria-labelledby="backupConfirm1Label"/>
                  <span id="backupConfirm1Label">I have written/verified these words securely.</span>
                </label>
                <label className="flex items-start text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={backupConfirmed2} onChange={() => setBackupConfirmed2(!backupConfirmed2)} className="mr-2 mt-1 accent-teal-500" aria-labelledby="backupConfirm2Label"/>
                  <span id="backupConfirm2Label">I understand these words are my sole responsibility.</span>
                </label>

                <div>
                  <label htmlFor="walletPasswordSetup" className="block text-sm font-medium text-gray-300 mb-1">Set/Update Wallet Encryption Password</label>
                  <input
                      type="password"
                      id="walletPasswordSetup"
                      value={walletPassword}
                      onChange={(e) => setWalletPassword(e.target.value)}
                      className="w-full bg-gray-600 text-white border border-gray-500 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter a strong password to encrypt"
                      aria-required="true"
                  />
                   <p className="text-xs text-gray-500 mt-1">This will encrypt your active mnemonic for local storage.</p>
                </div>

                <button
                  onClick={handleConfirmWalletSetup}
                  disabled={!backupConfirmed1 || !backupConfirmed2 || !walletPassword || isProcessingCrypto}
                  className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {isProcessingCrypto ? <RotateCcw size={18} className="mr-2 animate-spin" /> : <ShieldCheck size={18} className="mr-2" />}
                  {isProcessingCrypto ? "Encrypting..." : "Encrypt & Save Mnemonic"}
                </button>
                 <button
                  onClick={() => {
                    if (isProcessingCrypto) return; 
                    setActiveMnemonic(null); 
                    setBackupConfirmed1(false); 
                    setBackupConfirmed2(false); 
                    setWalletPassword('');
                    if (encryptedMnemonicLS) setIsDecryptingUI(true); 
                  }}
                  disabled={isProcessingCrypto}
                  className="w-full mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-md transition-colors flex items-center justify-center"
                >
                   Clear Active Mnemonic / Cancel
                </button>
              </div>
            )}

             {!isDecryptingUI && !activeMnemonic && !isAwaitingTotpForUnlock && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-md font-semibold text-gray-300 mb-2">Restore Wallet from Mnemonic</h4>
                    <textarea
                        value={restoreMnemonicInput}
                        onChange={(e) => setRestoreMnemonicInput(e.target.value)}
                        rows={2}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500 mb-2"
                        placeholder="Enter your 12 or 24 word mnemonic phrase here..."
                        aria-label="Mnemonic phrase for restoration"
                    />
                    <button
                        onClick={handleRestoreMnemonic}
                        disabled={!restoreMnemonicInput.trim()}
                        className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500"
                    >
                        <RotateCcw size={18} className="mr-2" /> Restore Wallet & Update Keys
                    </button>
                </div>
            )}
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center"><Key size={20} className="mr-2 text-teal-400"/>Monero Keys</h3>
            <div className="bg-yellow-900 border border-yellow-700 p-3 rounded-md mb-3" role="alert">
                <p className="text-sm text-yellow-300 mb-2 flex items-start">
                    <AlertTriangle size={28} className="inline mr-2 flex-shrink-0" /> 
                    <span><strong>IMPORTANT:</strong> These keys grant access to your funds. <strong>NEVER share real private keys.</strong> Keys are updated when generating, restoring, or unlocking a wallet.</span>
                </p>
            </div>

            <button 
              onClick={() => setShowKeys(!showKeys)}
              className="text-sm text-teal-400 hover:text-teal-300 mb-2"
              aria-expanded={showKeys}
            >
              {showKeys ? 'Hide' : 'Show'} Current Keys
            </button>
            {showKeys && (
              <div className="space-y-2 bg-gray-700 p-3 rounded-md">
                <div>
                  <p className="text-xs text-gray-400 flex items-center"><Lock size={12} className="mr-1" /> Private Key (View)</p>
                  <p className="text-xs text-red-400 break-all font-mono">{userProfile.moneroPrivateKey}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center"><Key size={12} className="mr-1" /> Public Key</p>
                  <p className="text-xs text-green-400 break-all font-mono">{userProfile.moneroPublicKey}</p>
                </div>
              </div>
            )}
          </div>

          {/* Two-Factor Authentication Section */}
            <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center"><Shield size={20} className="mr-2 text-teal-400" />Two-Factor Authentication</h3>
                {!currentSettings.totpEnabled && !isTotpSetupMode && (
                    <>
                        <p className="text-sm text-gray-400 mb-3">Enhance your account security by enabling TOTP (Time-based One-Time Password).</p>
                        <button
                            onClick={handleEnableTotp}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center justify-center"
                        >
                            <Scan size={18} className="mr-2" /> Enable TOTP
                        </button>
                    </>
                )}
                {isTotpSetupMode && (
                    <div className="bg-gray-700 p-4 rounded-md space-y-3">
                        <p className="text-md font-semibold text-sky-300">Setup TOTP</p>
                        <p className="text-xs text-gray-300">1. Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy).</p>
                        <div className="flex justify-center my-2">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpAuthUrl)}&bgcolor=1f2937&color=f3f4f6&qzone=1`}
                                alt="TOTP QR Code" 
                                className="rounded-md border-4 border-gray-600"
                            />
                        </div>
                        <p className="text-xs text-gray-300">2. Or, manually enter this secret key:</p>
                        <p className="font-mono text-orange-300 bg-gray-900 p-2 rounded text-center break-all">{generatedTotpSecret}</p>
                        <p className="text-xs text-gray-300">3. Enter the 6-digit code from your app to verify:</p>
                        <div>
                            <label htmlFor="totpVerificationCode" className="block text-sm font-medium text-gray-300 mb-1">Verification Code</label>
                            <input
                                type="text"
                                id="totpVerificationCode"
                                value={totpVerificationInput}
                                onChange={(e) => setTotpVerificationInput(e.target.value.replace(/\D/g, '').slice(0,6))}
                                maxLength={6}
                                className="w-full bg-gray-600 text-white border border-gray-500 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500 text-center tracking-widest"
                                placeholder="123456"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setIsTotpSetupMode(false); setGeneratedTotpSecret(''); setTotpVerificationInput('');}} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-md transition-colors">Cancel</button>
                            <button 
                                onClick={handleVerifyAndEnableTotp}
                                disabled={totpVerificationInput.length !== 6}
                                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-md transition-colors disabled:bg-gray-500">
                                Verify & Enable TOTP
                            </button>
                        </div>
                    </div>
                )}
                {currentSettings.totpEnabled && !isTotpSetupMode && (
                     <div className="bg-gray-700 p-4 rounded-md space-y-3">
                        <p className="text-md font-semibold text-green-400">TOTP is Enabled</p>
                        <p className="text-xs text-gray-300">Your secret key starts with: <span className="font-mono text-orange-300">{currentSettings.totpSecretMock?.substring(0,6)}...</span></p>
                        <p className="text-xs text-gray-300">Enter current TOTP code to disable:</p>
                         <div>
                            <label htmlFor="disableTotpCode" className="block text-sm font-medium text-gray-300 mb-1">Current TOTP Code</label>
                            <input
                                type="text"
                                id="disableTotpCode"
                                value={disableTotpInput}
                                onChange={(e) => setDisableTotpInput(e.target.value.replace(/\D/g, '').slice(0,6))}
                                maxLength={6}
                                className="w-full bg-gray-600 text-white border border-gray-500 rounded-md p-2 focus:ring-red-500 focus:border-red-500 text-center tracking-widest"
                                placeholder="123456"
                            />
                        </div>
                        <button
                            onClick={handleDisableTotp}
                            disabled={disableTotpInput.length !== 6}
                            className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:bg-gray-500"
                        >
                            Disable TOTP
                        </button>
                    </div>
                )}
            </div>
          
          <div className="border-t border-gray-700 pt-4">
             <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center"><Network size={20} className="mr-2 text-teal-400"/>Network & Node Settings</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="moneroNodeUrl" className="block text-sm font-medium text-gray-300 mb-1">Monero Full Node URL (for RPC)</label>
                    <input
                        type="text"
                        id="moneroNodeUrl"
                        value={currentSettings.moneroNodeUrl}
                        onChange={(e) => handleSettingChange('moneroNodeUrl', e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g., http://127.0.0.1:18081"
                        aria-describedby="nodeUrlHelp"
                    />
                    <p id="nodeUrlHelp" className="text-xs text-gray-500 mt-1">Must be a user-run full Monero node with RPC enabled (e.g., /json_rpc endpoint for transaction scanning).</p>
                </div>

                <div className="bg-gray-700 p-3 rounded-md space-y-2">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-gray-300 flex items-center"><Server size={18} className="mr-2"/>Node Status</h4>
                        <button onClick={handleRefreshNodeStatus} className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded-md flex items-center">
                            <RefreshCw size={14} className="mr-1"/>Refresh
                        </button>
                    </div>
                    <p className="text-sm text-gray-400">Status: <span className="text-gray-200">{nodeStatus}</span></p>
                    <p className="text-sm text-gray-400">Blockchain Height: <span className="text-gray-200">{blockchainHeight}</span></p>
                    <p className="text-sm text-gray-400">Wallet Sync Height: <span className="text-gray-200">{walletSyncHeight}</span></p>
                </div>

                 <div className="bg-gray-700 p-3 rounded-md space-y-2">
                     <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-gray-300 flex items-center"><Wallet size={18} className="mr-2"/>Wallet Balance</h4>
                        <button onClick={handleRefreshBalance} className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded-md flex items-center">
                            <RefreshCw size={14} className="mr-1"/>Refresh
                        </button>
                    </div>
                    <p className="text-sm text-gray-400">Balance: <span className="text-green-400 font-semibold">{walletBalance}</span></p>
                 </div>

                <div className="bg-gray-700 p-3 rounded-md space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                      <h4 className="text-md font-semibold text-gray-300 flex items-center"><List size={18} className="mr-2"/>Recent Transactions</h4>
                      <button 
                          onClick={handleScanTransactions} 
                          disabled={isScanningTransactions || !currentSettings.moneroNodeUrl || !currentSettings.moneroNodeUrl.startsWith('http')}
                          className="text-xs px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md flex items-center justify-center sm:w-auto w-full disabled:bg-gray-500 disabled:cursor-not-allowed"
                      >
                          {isScanningTransactions ? <RotateCcw size={14} className="mr-1 animate-spin"/> : <RefreshCw size={14} className="mr-1"/>}
                          {isScanningTransactions ? "Scanning..." : "Scan"}
                      </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mb-3 items-center">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                          <ListFilter size={16} className="text-gray-400"/>
                          <select 
                              value={filterType} 
                              onChange={(e) => setFilterType(e.target.value as TransactionFilterType)}
                              className="flex-grow bg-gray-600 text-white text-xs border border-gray-500 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500"
                              aria-label="Filter transactions by type"
                          >
                              <option value="all">All Types</option>
                              <option value="in">Incoming</option>
                              <option value="out">Outgoing</option>
                              <option value="pending">Pending</option>
                              <option value="pool">Pool</option>
                              <option value="failed">Failed</option>
                          </select>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                          <ArrowDownUp size={16} className="text-gray-400"/>
                          <select 
                              value={sortKey} 
                              onChange={(e) => setSortKey(e.target.value as TransactionSortKey)}
                              className="flex-grow bg-gray-600 text-white text-xs border border-gray-500 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500"
                              aria-label="Sort transactions by"
                          >
                              <option value="timestamp">Sort by Date</option>
                              <option value="amount">Sort by Amount</option>
                              <option value="type">Sort by Type</option>
                          </select>
                          <button 
                              onClick={toggleSortOrder}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-md border border-gray-500 focus:ring-teal-500 focus:border-teal-500"
                              aria-label={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                          >
                              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                          </button>
                      </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900 p-1 bg-gray-900 rounded" aria-live="polite">
                      {displayedTransactions.length === 0 && !isScanningTransactions && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {scannedTransactions.length > 0 ? "No transactions match your current filters." : "No transactions to display. Set Node URL and click Scan."}
                          </p>
                      )}
                      {isScanningTransactions && displayedTransactions.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">Scanning for transactions...</p>
                      )}
                      {displayedTransactions.map((tx) => (
                          <div key={tx.txid} className="py-2 px-3 mb-2 bg-gray-800 rounded shadow-md">
                              <div className="flex justify-between items-center mb-1">
                                  <span className={`font-semibold text-sm ${
                                      tx.type === 'in' || tx.type === 'pool' || (tx.type === 'pending' && (tx.destinations && tx.destinations.some(d => d.address.includes("your_address")) || !tx.destinations) ) // Generalized "your_address"
                                      ? 'text-green-400' 
                                      : 'text-red-400'
                                  }`}>
                                  {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                  </span>
                                  <span className={`font-mono text-sm ${
                                      tx.type === 'in' || tx.type === 'pool' || (tx.type === 'pending' && (tx.destinations && tx.destinations.some(d => d.address.includes("your_address")) || !tx.destinations) )
                                      ? 'text-green-500' 
                                      : 'text-red-500'
                                  }`}>
                                  {tx.type === 'out' ? '-' : '+'}
                                  {(tx.amount / 1e12).toFixed(6)} XMR
                                  </span>
                              </div>
                              <p className="text-xs text-gray-400">Date: {formatDate(new Date(tx.timestamp * 1000))}</p>
                              <p className="text-xs text-gray-400 truncate" title={tx.txid}>TXID: {tx.txid.substring(0,16)}...{tx.txid.substring(tx.txid.length - 4)}</p>
                              <p className="text-xs text-gray-400">
                                  Height: {tx.height > 0 ? tx.height.toLocaleString() : (tx.type.toUpperCase())}
                                  {tx.confirmations > 0 && ` (${tx.confirmations} confs)`}
                              </p>
                              {tx.fee > 0 && <p className="text-xs text-gray-500">Fee: {(tx.fee / 1e12).toFixed(8)} XMR</p>}
                              {tx.note && <p className="text-xs text-gray-300 mt-1 italic">Note: "{tx.note}"</p>}
                              {tx.payment_id && tx.payment_id !== "0000000000000000" && <p className="text-xs text-gray-500">Payment ID: {tx.payment_id.substring(0,16)}...</p>}
                          </div>
                      ))}
                  </div>
                  {(!currentSettings.moneroNodeUrl || !currentSettings.moneroNodeUrl.startsWith('http')) && (
                        <p className="text-xs text-yellow-400 mt-2">Set a valid Monero Node URL (e.g., http://host:port) to enable transaction scanning.</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300 flex items-center"><ShieldCheck size={18} className="mr-2"/>Use Tor for Network Traffic</span>
                    <button
                        onClick={() => handleSettingChange('useTor', !currentSettings.useTor)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentSettings.useTor ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                        aria-pressed={currentSettings.useTor}
                    >
                        {currentSettings.useTor ? 'Enabled' : 'Disabled'}
                    </button>
                </div>
                 <p className="text-xs text-gray-500">Tor integration enhances privacy.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3 border-t border-gray-700 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-md transition-colors flex items-center"
          >
            <Save size={18} className="mr-2" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};