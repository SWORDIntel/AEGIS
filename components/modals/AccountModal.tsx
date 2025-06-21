import React, { useState, useEffect } from 'react'; // Added useEffect
import { UserProfile, UserSettings, AddNotificationHandler, MoneroTransaction, GetTransfersParams } from '../../types'; // Added MoneroTransaction, GetTransfersParams
import { X, UserCircle, Key, Zap, ShieldCheck, Save, AlertTriangle, FileText, Lock, CheckSquare, RotateCcw, RefreshCw, Wallet, Server, Network, Activity, Unlock, List } from 'lucide-react'; // Added RotateCcw, RefreshCw, Wallet, Server, Network, Activity, Unlock, List
import { encryptMnemonic, decryptMnemonic, getWalletTransfers, formatDate } from '../../utils/helpers'; // Added getWalletTransfers and formatDate
import { useLocalStorage } from '../../hooks/useLocalStorage'; // Assuming this path

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((val: UserProfile) => UserProfile)) => void;
  addNotification: AddNotificationHandler;
}

// Mock mnemonic generation for demo
const generateMockMnemonic = () => {
    const words = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew", "kiwi", "lemon", "mango", "nectarine", "orange", "papaya", "quince", "raspberry", "strawberry", "tangerine", "ugli", "vanilla", "watermelon", "xigua", "yuzu", "zucchini"];
    return Array(12).fill(null).map(() => words[Math.floor(Math.random() * words.length)]).join(' ');
}

// Generate new mock keys
const generateNewMockKeys = (prefix: string) => {
    return {
        privateKey: `${prefix}_SK_` + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36).slice(-6),
        publicKey: `${prefix}_PK_` + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36).slice(-6),
    }
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, userProfile, setUserProfile, addNotification }) => {
  const [currentSettings, setCurrentSettings] = useState<UserSettings>(userProfile.settings);
  const [showKeys, setShowKeys] = useState(false);

  // Conceptual Wallet Setup State
  const [mockMnemonic, setMockMnemonic] = useState<string | null>(null);
  const [backupConfirmed1, setBackupConfirmed1] = useState(false);
  const [backupConfirmed2, setBackupConfirmed2] = useState(false);
  const [walletPassword, setWalletPassword] = useState('');
  
  // Mnemonic restoration state
  const [restoreMnemonicInput, setRestoreMnemonicInput] = useState('');

  // Local storage for encrypted mnemonic
  const [encryptedMnemonicLS, setEncryptedMnemonicLS, removeEncryptedMnemonicLS] = useLocalStorage<string | null>('encryptedMoneroMnemonic', null);
  const [isDecryptingUI, setIsDecryptingUI] = useState(false); // To show password field for decryption UI state
  const [isProcessingCrypto, setIsProcessingCrypto] = useState(false); // For loading state on buttons

  // Mock Node Status State
  const [nodeStatus, setNodeStatus] = useState<string>("N/A");
  const [blockchainHeight, setBlockchainHeight] = useState<string>("N/A");
  const [walletSyncHeight, setWalletSyncHeight] = useState<string>("N/A");

  // Mock Wallet Balance State
  const [walletBalance, setWalletBalance] = useState<string>("N/A");

  // Transaction Scanning State
  const [scannedTransactions, setScannedTransactions] = useState<MoneroTransaction[]>([]);
  const [isScanningTransactions, setIsScanningTransactions] = useState(false);
  // const [lastScannedHeight, setLastScannedHeight] = useState<number | null>(null); // Optional for future optimization

  useEffect(() => {
    if (encryptedMnemonicLS && !mockMnemonic && !userProfile.moneroPrivateKey) { // Only prompt for decryption if no mnemonic is active AND no keys are loaded (implying wallet is locked)
      setIsDecryptingUI(true);
      addNotification("Encrypted wallet found. Enter password to unlock.", "info");
    } else {
      setIsDecryptingUI(false);
    }
  }, [encryptedMnemonicLS, mockMnemonic, userProfile.moneroPrivateKey]); // Adjust dependencies

  const handleSettingChange = <K extends keyof UserSettings,>(key: K, value: UserSettings[K]) => {
    setCurrentSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveChanges = () => {
    setUserProfile(prev => ({ ...prev, settings: currentSettings }));
    addNotification('Account settings saved successfully!', 'success');
  };
  
  const handleGenerateMnemonic = () => {
    setMockMnemonic(generateMockMnemonic());
    const newKeys = generateNewMockKeys("GENERATED");
    setUserProfile(prev => ({
        ...prev,
        moneroPrivateKey: newKeys.privateKey,
        moneroPublicKey: newKeys.publicKey,
    }));
    setBackupConfirmed1(false);
    setBackupConfirmed2(false);
    setShowKeys(true); // Show keys after generating new ones
    addNotification("Mock mnemonic generated and demo keys updated. Securely back it up!", "info");
  }

  const handleConfirmWalletSetup = () => {
    if (mockMnemonic && !backupConfirmed1 && !backupConfirmed2) {
        addNotification("Please confirm you have backed up the mnemonic phrase.", "warning");
        return;
    }
    if (mockMnemonic && (!backupConfirmed1 || !backupConfirmed2)) {
        addNotification("Please acknowledge both backup confirmations.", "warning");
        return;
    }
     if (mockMnemonic && !walletPassword) {
        addNotification("Please set a conceptual wallet encryption password.", "warning");
        return;
    }

    if (mockMnemonic && walletPassword) {
      setIsProcessingCrypto(true);
      encryptMnemonic(mockMnemonic, walletPassword)
        .then(encrypted => {
          try {
            setEncryptedMnemonicLS(encrypted); // This could also fail if localStorage is full
            addNotification("Mnemonic encrypted and stored securely!", "success");
            setMockMnemonic(null);
            setBackupConfirmed1(false);
            setBackupConfirmed2(false);
            setWalletPassword('');
            setShowKeys(false);
            setIsDecryptingUI(false); // Ensure decrypt UI is hidden
          } catch (storageError) {
            console.error("Local storage error:", storageError);
            addNotification("Failed to save encrypted mnemonic to local storage. Storage might be full or unavailable.", "error");
          }
        })
        .catch(err => {
          console.error("Encryption error:", err);
          let message = "Failed to encrypt mnemonic. Please try again.";
          if (err instanceof DOMException && err.name === 'NotSupportedError') {
            message = "Web Crypto API not supported on this browser. Please use a modern browser.";
          }
          addNotification(message, "error");
        })
        .finally(() => {
          setIsProcessingCrypto(false);
        });
    } else {
      addNotification("Mnemonic or password missing for setup.", "error"); // Should be caught by button disabled state mostly
    }
  }

  const handleLoadAndDecryptMnemonic = async () => {
    if (!walletPassword) {
      addNotification("Please enter your wallet password.", "warning");
      return;
    }
    if (!encryptedMnemonicLS) {
      addNotification("No encrypted wallet found to unlock.", "error"); // Changed message
      return;
    }

    setIsProcessingCrypto(true);
    try {
      const decrypted = await decryptMnemonic(encryptedMnemonicLS, walletPassword);
      setMockMnemonic(decrypted);
      const newKeys = generateNewMockKeys("DECRYPTED");
      setUserProfile(prev => ({
          ...prev,
          moneroPrivateKey: newKeys.privateKey,
          moneroPublicKey: newKeys.publicKey,
      }));
      setShowKeys(true);
      addNotification("Wallet unlocked successfully and demo keys updated!", "success"); // Changed message
      setIsDecryptingUI(false);
      setWalletPassword('');
    } catch (error) {
      console.error("Decryption error:", error);
      let message = "Decryption failed. Incorrect password or corrupted data. Please try again.";
      if (error instanceof DOMException && error.name === 'NotSupportedError') {
        message = "Web Crypto API not supported on this browser. Please use a modern browser.";
      } else if (error instanceof Error && error.message.toLowerCase().includes('decryption failed')) {
         // Specific error from our decryptMnemonic function
        message = "Decryption failed. Incorrect password or corrupted data.";
      }
      addNotification(message, "error");
      // setWalletPassword(''); // Optionally clear password on failure
    } finally {
      setIsProcessingCrypto(false);
    }
  };

  const handleRestoreMnemonic = () => {
    if (!restoreMnemonicInput.trim()) {
        addNotification("Please enter a mnemonic phrase to restore.", "warning");
        return;
    }
    // In a real app, validate mnemonic and derive keys. Here, just set new mock keys.
    const newKeys = generateNewMockKeys("RESTORED");
     setUserProfile(prev => ({
        ...prev,
        moneroPrivateKey: newKeys.privateKey,
        moneroPublicKey: newKeys.publicKey,
    }));
    setShowKeys(true); // Show keys after restoring
    addNotification(`Conceptual wallet restored with demo phrase "${restoreMnemonicInput.substring(0,15)}..."! Demo keys updated.`, 'success');
    setRestoreMnemonicInput('');
  }

  const handleRefreshNodeStatus = () => {
    const statuses = ["Connected (Mock)", "Connecting... (Mock)", "Disconnected (Mock)"];
    setNodeStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    const height = 2000000 + Math.floor(Math.random() * 500000);
    setBlockchainHeight(height.toLocaleString());
    setWalletSyncHeight((height - Math.floor(Math.random() * 10)).toLocaleString());
    addNotification("Mock node status updated.", "info");
  }

  const handleRefreshBalance = () => {
    setWalletBalance(`${(Math.random() * 10).toFixed(6)} XMR`);
    addNotification("Mock wallet balance updated.", "info");
  }

  const handleScanTransactions = async () => {
    if (!currentSettings.moneroNodeUrl) {
      addNotification("Monero Node URL is not set. Please configure it in settings.", "warning");
      return;
    }
    // As discussed, private view key and address are not directly needed for get_transfers
    // if the wallet is open in the RPC server.

    setIsScanningTransactions(true);
    addNotification("Scanning transactions...", "info");

    const params: GetTransfersParams = {
      in: true,
      out: true,
      pool: true,
      pending: true,
      failed: false, // Set to true if you want to see failed transactions
      account_index: 0, // Assuming primary account
      // filter_by_height: !!lastScannedHeight, // Future optimization
      // min_height: lastScannedHeight ? lastScannedHeight + 1 : undefined, // Future optimization
    };

    try {
      const response = await getWalletTransfers(currentSettings.moneroNodeUrl + (currentSettings.moneroNodeUrl.endsWith('/') ? 'json_rpc' : '/json_rpc'), params);
      let allTransactions: MoneroTransaction[] = [];

      if (response.in) allTransactions = allTransactions.concat(response.in);
      if (response.out) allTransactions = allTransactions.concat(response.out);
      if (response.pool) allTransactions = allTransactions.concat(response.pool);
      if (response.pending) allTransactions = allTransactions.concat(response.pending);
      if (response.failed) allTransactions = allTransactions.concat(response.failed); // If requested

      allTransactions.sort((a, b) => b.timestamp - a.timestamp); // Newest first

      setScannedTransactions(allTransactions);
      if (allTransactions.length > 0) {
         addNotification(`${allTransactions.length} transaction(s) loaded.`, 'success');
        // const latestTx = allTransactions.reduce((latest, tx) => tx.height > latest.height ? tx : latest, allTransactions[0]);
        // if (latestTx.height > 0) setLastScannedHeight(latestTx.height); // Future optimization
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
            <p className="text-sm text-gray-400">Reputation Score (Mock)</p>
            <p className="text-lg text-white flex items-center">
              {userProfile.reputationScore}/100 
              <ShieldCheck size={20} className="ml-2 text-green-400" />
            </p>
          </div>

          {/* Conceptual Wallet Setup Section */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center"><FileText size={20} className="mr-2 text-teal-400" />Conceptual Wallet Management</h3>
            <p className="text-xs text-gray-400 mb-3">This section simulates generating, encrypting, backing up, and restoring a Monero wallet. New demo keys are assigned on generation/restoration/decryption.</p>
            
            {isDecryptingUI && !mockMnemonic && (
              <div className="bg-gray-700 p-4 rounded-md space-y-3 mb-4 border border-teal-500">
                <p className="text-md font-semibold text-teal-300">Unlock Your Wallet</p>
                <p className="text-xs text-gray-400">An encrypted wallet was found. Enter your password to unlock and load it.</p>
                <div>
                  <label htmlFor="walletPasswordDecrypt" className="block text-sm font-medium text-gray-300 mb-1">Wallet Password</label>
                  <input
                      type="password"
                      id="walletPasswordDecrypt" // Unique ID
                      value={walletPassword}
                      onChange={(e) => setWalletPassword(e.target.value)}
                      className="w-full bg-gray-600 text-white border border-gray-500 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter password to unlock"
                  />
                </div>
                <button
                  onClick={handleLoadAndDecryptMnemonic}
                  disabled={isProcessingCrypto || !walletPassword}
                  className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {isProcessingCrypto ? <RotateCcw size={18} className="mr-2 animate-spin" /> : <Unlock size={18} className="mr-2" />}
                  {isProcessingCrypto ? "Unlocking..." : "Unlock Wallet"}
                </button>
                 <button
                  onClick={() => {
                    if (isProcessingCrypto) return;
                    removeEncryptedMnemonicLS();
                    setIsDecryptingUI(false);
                    setWalletPassword('');
                    addNotification("Encrypted wallet removed. You can now generate a new one or restore.", "info");
                  }}
                  disabled={isProcessingCrypto}
                  className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  <AlertTriangle size={18} className="mr-2" /> Discard & Start New
                </button>
              </div>
            )}

            {!mockMnemonic && !isDecryptingUI && (
              <button
                onClick={handleGenerateMnemonic}
                className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-md transition-colors flex items-center justify-center mb-2"
              >
                <Zap size={18} className="mr-2" /> Generate New Mnemonic & Demo Keys
              </button>
            )}

            {mockMnemonic && ( // This block shows when a mnemonic is generated OR successfully decrypted
              <div className="bg-gray-700 p-4 rounded-md space-y-3">
                <p className="text-sm text-yellow-300 font-semibold">Your Mock Mnemonic Phrase:</p>
                <div className="bg-gray-900 p-3 rounded font-mono text-center text-orange-300 text-sm break-words">
                  {mockMnemonic}
                </div>
                <p className="text-xs text-red-400 font-bold">CRITICAL: Write these words down in order and store them in multiple secure, offline locations. This is the ONLY way to recover your conceptual wallet.</p>
                
                <label className="flex items-start text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={backupConfirmed1} onChange={() => setBackupConfirmed1(!backupConfirmed1)} className="mr-2 mt-1 accent-teal-500" />
                  I have written these words down securely.
                </label>
                <label className="flex items-start text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={backupConfirmed2} onChange={() => setBackupConfirmed2(!backupConfirmed2)} className="mr-2 mt-1 accent-teal-500" />
                  I understand these words are my sole responsibility and Aegis Protocol cannot recover them.
                </label>

                <div>
                  <label htmlFor="walletPasswordSetup" className="block text-sm font-medium text-gray-300 mb-1">Set Wallet Encryption Password (Conceptual)</label>
                  <input
                      type="password"
                      id="walletPasswordSetup" // Unique ID
                      value={walletPassword}
                      onChange={(e) => setWalletPassword(e.target.value)}
                      className="w-full bg-gray-600 text-white border border-gray-500 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter a strong password"
                  />
                   <p className="text-xs text-gray-500 mt-1">This will encrypt your mnemonic for local storage.</p>
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
                    setMockMnemonic(null);
                    setBackupConfirmed1(false);
                    setBackupConfirmed2(false);
                    setWalletPassword('');
                    if (encryptedMnemonicLS && !userProfile.moneroPrivateKey) setIsDecryptingUI(true); // Revert to unlock prompt if applicable
                  }}
                  disabled={isProcessingCrypto}
                  className="w-full mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                   Cancel Mnemonic Process
                </button>
              </div>
            )}

            {/* Restore Mnemonic Section */}
             {!mockMnemonic && !isDecryptingUI && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-md font-semibold text-gray-300 mb-2">Restore Wallet from Mnemonic (Mock)</h4>
                    <textarea
                        value={restoreMnemonicInput}
                        onChange={(e) => setRestoreMnemonicInput(e.target.value)}
                        rows={2}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500 mb-2"
                        placeholder="Enter your 12 or 24 word mnemonic phrase here..."
                    />
                    <button
                        onClick={handleRestoreMnemonic}
                        className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-md transition-colors flex items-center justify-center"
                    >
                        <RotateCcw size={18} className="mr-2" /> Restore Wallet & Update Demo Keys
                    </button>
                </div>
            )}
          </div>


          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center"><Key size={20} className="mr-2 text-teal-400"/>Monero Keys (DEMO ONLY)</h3>
            <div className="bg-yellow-900 border border-yellow-700 p-3 rounded-md mb-3">
                <p className="text-sm text-yellow-300 mb-2 flex items-start">
                    <AlertTriangle size={28} className="inline mr-2 flex-shrink-0" /> 
                    <span><strong>IMPORTANT:</strong> These are placeholder strings for demonstration. <strong>NEVER share real private keys.</strong> New demo keys are assigned when generating or restoring a mnemonic.</span>
                </p>
            </div>

            <button 
              onClick={() => setShowKeys(!showKeys)}
              className="text-sm text-teal-400 hover:text-teal-300 mb-2"
            >
              {showKeys ? 'Hide' : 'Show'} Current Demo Keys
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
          
          <div className="border-t border-gray-700 pt-4">
             <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center"><Network size={20} className="mr-2 text-teal-400"/>Network & Node Settings (Conceptual)</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="moneroNodeUrl" className="block text-sm font-medium text-gray-300 mb-1">Monero Full Node URL</label>
                    <input
                        type="text"
                        id="moneroNodeUrl"
                        value={currentSettings.moneroNodeUrl}
                        onChange={(e) => handleSettingChange('moneroNodeUrl', e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g., http://127.0.0.1:18081"
                    />
                    <p className="text-xs text-gray-500 mt-1">Client should interact with a user-run full Monero node.</p>
                </div>

                <div className="bg-gray-700 p-3 rounded-md space-y-2">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-gray-300 flex items-center"><Server size={18} className="mr-2"/>Node Status (Mock)</h4>
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
                        <h4 className="text-md font-semibold text-gray-300 flex items-center"><Wallet size={18} className="mr-2"/>Wallet Balance (Mock)</h4>
                        <button onClick={handleRefreshBalance} className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded-md flex items-center">
                            <RefreshCw size={14} className="mr-1"/>Refresh
                        </button>
                    </div>
                    <p className="text-sm text-gray-400">Balance: <span className="text-green-400 font-semibold">{walletBalance}</span></p>
                 </div>

                {/* Transaction Scanning Section */}
                <div className="bg-gray-700 p-3 rounded-md space-y-2">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-gray-300 flex items-center"><List size={18} className="mr-2"/>Recent Transactions</h4>
                        <button
                            onClick={handleScanTransactions}
                            disabled={isScanningTransactions || !currentSettings.moneroNodeUrl}
                            className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isScanningTransactions ? <RotateCcw size={14} className="mr-1 animate-spin"/> : <RefreshCw size={14} className="mr-1"/>}
                            {isScanningTransactions ? "Scanning..." : "Scan"}
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900 p-1 bg-gray-900 rounded">
                        {scannedTransactions.length === 0 && !isScanningTransactions && (
                            <p className="text-sm text-gray-500 text-center py-4">No transactions to display.</p>
                        )}
                        {isScanningTransactions && scannedTransactions.length === 0 && (
                             <p className="text-sm text-gray-500 text-center py-4">Scanning for transactions...</p>
                        )}
                        {scannedTransactions.map((tx) => (
                            <div key={tx.txid} className="py-2 px-3 mb-2 bg-gray-800 rounded shadow-md">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`font-semibold text-sm ${
                                        tx.type === 'in' || tx.type === 'pool' || tx.type === 'pending' && !tx.destinations // Simple heuristic for incoming-like
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                    }`}>
                                    {tx.type === 'in' ? 'Incoming' :
                                     tx.type === 'out' ? 'Outgoing' :
                                     tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                    </span>
                                    <span className={`font-mono text-sm ${
                                        tx.type === 'in' || tx.type === 'pool' || tx.type === 'pending' && !tx.destinations
                                        ? 'text-green-500'
                                        : 'text-red-500'
                                    }`}>
                                    {tx.type === 'out' ? '-' : '+'}
                                    {(tx.amount / 1e12).toFixed(6)} XMR
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Date: {formatDate(new Date(tx.timestamp * 1000))}</p>
                                <p className="text-xs text-gray-400 truncate" title={tx.txid}>TXID: {tx.txid.substring(0,20)}...{tx.txid.substring(tx.txid.length - 4)}</p>
                                <p className="text-xs text-gray-400">
                                    Height: {tx.height > 0 ? tx.height.toLocaleString() : (tx.type === 'pool' || tx.type === 'pending' ? tx.type.toUpperCase() : 'N/A')}
                                    {tx.confirmations !== undefined && tx.confirmations >= 0 && ` (${tx.confirmations} confs)`}
                                </p>
                                {tx.fee > 0 && <p className="text-xs text-gray-500">Fee: {(tx.fee / 1e12).toFixed(8)} XMR</p>}
                                {tx.note && <p className="text-xs text-gray-300 mt-1 italic">Note: "{tx.note}"</p>}
                                {tx.payment_id && tx.payment_id !== "0000000000000000" && <p className="text-xs text-gray-500">Payment ID: {tx.payment_id}</p>}
                            </div>
                        ))}
                    </div>
                    {!currentSettings.moneroNodeUrl && (
                         <p className="text-xs text-yellow-400 mt-2">Set Monero Node URL to enable transaction scanning.</p>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300 flex items-center"><ShieldCheck size={18} className="mr-2"/>Use Tor for Network Traffic</span>
                    <button
                        onClick={() => handleSettingChange('useTor', !currentSettings.useTor)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentSettings.useTor ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                    >
                        {currentSettings.useTor ? 'Enabled' : 'Disabled'}
                    </button>
                </div>
                 <p className="text-xs text-gray-500">Tor integration enhances privacy (conceptual feature).</p>
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