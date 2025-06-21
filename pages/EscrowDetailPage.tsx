
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Escrow, ChatMessage, EscrowStatus, UserProfile, ArbiterRuling, DefaultOutcome, EscrowParticipant, AddNotificationHandler, BroadcastTxResponse, UserSettings } from '../types'; // Added BroadcastTxResponse, UserSettings
import { formatDate, generateId, getParticipant, getOtherParticipantUsername, getDaemonRpcUrl, broadcastMoneroTransaction } from '../utils/helpers'; // Added getDaemonRpcUrl, broadcastMoneroTransaction
import { ChevronLeft, Send, Paperclip, ShieldAlert, CheckCircle, XCircle, MessageSquare, DollarSign, Info, Clock, Users, AlertTriangle, Award, DivideSquare, TimerOff, ShieldCheck, ShieldX, HelpCircle, Loader2 } from 'lucide-react'; // Added Loader2
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';

interface EscrowDetailPageProps {
  escrows: Escrow[];
  updateEscrow: (updatedEscrow: Escrow, notificationMessage?: string) => void;
  currentUser: UserProfile;
  addNotification: AddNotificationHandler;
}

// Mock for getOtherParticipantUsername if needed, assuming no global user list for now
const mockAllUsers: UserProfile[] = [];


const ChatWindow: React.FC<{ 
    escrow: Escrow; 
    currentUser: UserProfile; 
    onSendMessage: (messageText: string) => void;
    onUploadEvidence: (messageText: string) => void;
}> = ({ escrow, currentUser, onSendMessage, onUploadEvidence }) => {
  const [newMessage, setNewMessage] = useState('');
  
  const canSubmitEvidence = [
    EscrowStatus.DISPUTE_INITIATED, 
    EscrowStatus.EVIDENCE_SUBMISSION, 
    EscrowStatus.ARBITER_REVIEW
  ].includes(escrow.status);

  const isChatDisabled = [
    EscrowStatus.COMPLETED_RELEASED, 
    EscrowStatus.COMPLETED_REFUNDED, 
    EscrowStatus.COMPLETED_SPLIT, 
    EscrowStatus.CANCELLED_UNFUNDED,
    EscrowStatus.TIMELOCK_DEFAULT_TRIGGERED 
  ].includes(escrow.status);

  const handleSend = () => {
    if (newMessage.trim() && !isChatDisabled) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };
  
  const handleSendAsEvidence = () => {
    if (newMessage.trim() && canSubmitEvidence && !isChatDisabled) {
      onUploadEvidence(newMessage.trim()); 
      setNewMessage('');
    }
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4 mt-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center"><MessageSquare size={20} className="mr-2 text-teal-400" />Secure Communication Log</h3>
      <div className="h-64 overflow-y-auto mb-3 p-2 bg-gray-800 rounded scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {escrow.chatLog.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No messages yet.</p>}
        {escrow.chatLog.map(msg => (
          <div key={msg.id} className={`mb-2 p-2 rounded-md max-w-[80%] ${msg.senderId === currentUser.id ? 'bg-teal-700 ml-auto' : 'bg-gray-600 mr-auto'}`}>
            <p className={`text-xs font-semibold ${msg.senderId === currentUser.id ? 'text-teal-100' : 'text-gray-200'}`}>{msg.senderUsername}{msg.isEvidence ? <span className="text-orange-300"> (Evidence)</span> : ""}</p>
            <p className="text-sm text-white">{msg.text}</p>
            <p className="text-xs text-gray-400 mt-1 text-right">{formatDate(msg.timestamp)}</p>
          </div>
        ))}
      </div>
      { !isChatDisabled && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow bg-gray-600 text-white border border-gray-500 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isChatDisabled}
          />
          <button onClick={handleSend} className="p-2 bg-teal-500 hover:bg-teal-400 text-white rounded-md transition-colors" title="Send Message" disabled={isChatDisabled}>
            <Send size={20} />
          </button>
           {canSubmitEvidence && !isChatDisabled ? ( // Ensure chat isn't disabled for evidence submission either
            <button onClick={handleSendAsEvidence} className="p-2 bg-orange-500 hover:bg-orange-400 text-white rounded-md transition-colors" title="Send as Evidence" disabled={isChatDisabled}>
              <Paperclip size={20} />
            </button>
          ) : null}
        </div>
      )}
       <p className="text-xs text-gray-500 mt-2">Chat logs can be submitted as Merkle-proofed evidence in a real system. Chat disabled for completed/cancelled escrows.</p>
    </div>
  );
};

const ParticipantInfo: React.FC<{label: string, id: string, hasFunded?: boolean, hasConfirmed?: boolean, isCurrentUser: boolean}> = ({label, id, hasFunded, hasConfirmed, isCurrentUser}) => {
  return (
    <div className="bg-gray-700 p-3 rounded-md">
        <p className="text-sm text-gray-400">{label} {isCurrentUser && "(You)"}</p>
        <p className="text-md font-semibold text-white truncate" title={id}>{id}</p>
        {typeof hasFunded === 'boolean' && (
            <p className={`text-xs mt-1 flex items-center ${hasFunded ? 'text-green-400' : 'text-yellow-400'}`}>
                {hasFunded ? <CheckCircle size={14} className="mr-1"/> : <Clock size={14} className="mr-1"/>}
                Funding: {hasFunded ? 'Completed' : 'Pending'}
            </p>
        )}
        {typeof hasConfirmed === 'boolean' && (
            <p className={`text-xs mt-1 flex items-center ${hasConfirmed ? 'text-green-400' : 'text-yellow-400'}`}>
                {hasConfirmed ? <ShieldCheck size={14} className="mr-1"/> : <HelpCircle size={14} className="mr-1"/>}
                Confirmation: {hasConfirmed ? 'Confirmed' : 'Pending'}
            </p>
        )}
    </div>
  )
}


export const EscrowDetailPage: React.FC<EscrowDetailPageProps> = ({ escrows, updateEscrow, currentUser, addNotification }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<{ type: string; title: string; message: string | React.ReactNode; data?: any; confirmButtonClass?: string, confirmButtonText?: string } | null>(null);

  // State for transaction broadcasting
  const [signedTxHex, setSignedTxHex] = useState<string>(""); // Placeholder - to be populated by preceding steps
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastTxId, setBroadcastTxId] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  useEffect(() => {
    const foundEscrow = escrows.find(e => e.id === id);
    if (foundEscrow) {
      setEscrow(foundEscrow);
    } else {
      addNotification(`Escrow with ID ${id} not found. Redirecting to dashboard.`, 'error');
      navigate('/dashboard'); 
    }
  }, [id, escrows, navigate, addNotification]);

  const handleSendMessage = useCallback((messageText: string) => {
    if (!escrow) return;
    const newMessage: ChatMessage = {
      id: generateId(),
      escrowId: escrow.id,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      text: messageText,
      timestamp: new Date().toISOString(),
      isEvidence: false,
    };
    const updatedEscrow = { ...escrow, chatLog: [...escrow.chatLog, newMessage] };
    setEscrow(updatedEscrow); // Optimistic update
    updateEscrow(updatedEscrow, `Message sent in "${escrow.title}"`);
  }, [escrow, currentUser, updateEscrow]);

  const handleUploadEvidence = useCallback((messageText: string) => {
    if (!escrow) return;
    const newMessage: ChatMessage = {
      id: generateId(),
      escrowId: escrow.id,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      text: messageText,
      timestamp: new Date().toISOString(),
      isEvidence: true,
    };
    const updatedEscrow = { ...escrow, chatLog: [...escrow.chatLog, newMessage] };
    setEscrow(updatedEscrow); // Optimistic update
    updateEscrow(updatedEscrow, `Evidence submitted in "${escrow.title}"`);
    addNotification('Evidence submitted (conceptually marked in chat).', 'info');
  }, [escrow, currentUser, updateEscrow, addNotification]);

  const handleAction = (actionType: string, data?: any) => {
    if (!escrow) return;
    let updatedEscrow = { ...escrow };
    let notificationMessage = '';

    switch (actionType) {
      case 'fund_buyer':
        updatedEscrow.buyer.hasFunded = true;
        notificationMessage = `Buyer funded escrow: "${escrow.title}"`;
        if (updatedEscrow.seller.hasFunded) updatedEscrow.status = EscrowStatus.ACTIVE;
        else updatedEscrow.status = EscrowStatus.BUYER_FUNDED;
        break;
      case 'fund_seller':
        updatedEscrow.seller.hasFunded = true;
        // For MVP simplicity, seller funding also implies they confirmed their part (e.g. item ready)
        updatedEscrow.seller.hasConfirmed = true; 
        notificationMessage = `Seller funded & confirmed item for escrow: "${escrow.title}"`;
        if (updatedEscrow.buyer.hasFunded) updatedEscrow.status = EscrowStatus.ACTIVE;
        else updatedEscrow.status = EscrowStatus.SELLER_CONFIRMED_ITEM;
        break;
      case 'confirm_buyer': // Buyer confirms satisfaction
        updatedEscrow.buyer.hasConfirmed = true;
        notificationMessage = `Buyer confirmed satisfaction for: "${escrow.title}"`;
        if (updatedEscrow.seller.hasConfirmed) {
            updatedEscrow.status = EscrowStatus.COMPLETED_RELEASED;
            updatedEscrow.resolutionDetails = "Mutual agreement: Buyer confirmed satisfaction, Seller confirmed shipment/service.";
        } else {
            updatedEscrow.status = EscrowStatus.AWAITING_PARTICIPANT_ACTION;
        }
        break;
      case 'confirm_seller': // Seller confirms shipment/service
        updatedEscrow.seller.hasConfirmed = true;
        notificationMessage = `Seller confirmed shipment/service for: "${escrow.title}"`;
        if (updatedEscrow.buyer.hasConfirmed) {
            updatedEscrow.status = EscrowStatus.COMPLETED_RELEASED;
            updatedEscrow.resolutionDetails = "Mutual agreement: Seller confirmed shipment/service, Buyer confirmed satisfaction.";
        } else {
            updatedEscrow.status = EscrowStatus.AWAITING_PARTICIPANT_ACTION;
        }
        break;
      case 'initiate_dispute':
        updatedEscrow.status = EscrowStatus.DISPUTE_INITIATED;
        updatedEscrow.arbiterInvolved = true;
        updatedEscrow.disputeReason = data?.reason || "Dispute initiated by user.";
        notificationMessage = `Dispute initiated for: "${escrow.title}"`;
        break;
      case 'rule_for_buyer':
        updatedEscrow.status = EscrowStatus.COMPLETED_REFUNDED;
        updatedEscrow.arbiterRuling = 'buyer';
        updatedEscrow.resolutionDetails = "Arbiter decision: Ruled in favor of Buyer.";
        notificationMessage = `Arbiter ruled for Buyer in: "${escrow.title}"`;
        break;
      case 'rule_for_seller':
        updatedEscrow.status = EscrowStatus.COMPLETED_RELEASED;
        updatedEscrow.arbiterRuling = 'seller';
        updatedEscrow.resolutionDetails = "Arbiter decision: Ruled in favor of Seller.";
        notificationMessage = `Arbiter ruled for Seller in: "${escrow.title}"`;
        break;
      case 'rule_for_split':
        updatedEscrow.status = EscrowStatus.COMPLETED_SPLIT;
        updatedEscrow.arbiterRuling = 'split';
        updatedEscrow.resolutionDetails = "Arbiter decision: Ruled for a 50/50 split.";
        notificationMessage = `Arbiter ruled for 50/50 split in: "${escrow.title}"`;
        break;
      case 'timelock_expiry':
        if (escrow.defaultOutcome === DefaultOutcome.BUYER_REFUND) {
            updatedEscrow.status = EscrowStatus.COMPLETED_REFUNDED;
            updatedEscrow.resolutionDetails = "Timelock expired: Default outcome - Full refund to Buyer.";
        } else if (escrow.defaultOutcome === DefaultOutcome.SPLIT_50_50) {
            updatedEscrow.status = EscrowStatus.COMPLETED_SPLIT;
            updatedEscrow.resolutionDetails = "Timelock expired: Default outcome - 50/50 Split.";
        } else { // DefaultOutcome.SELLER_FAVOR
            updatedEscrow.status = EscrowStatus.COMPLETED_RELEASED;
            updatedEscrow.resolutionDetails = "Timelock expired: Default outcome - Full release to Seller.";
        }
        updatedEscrow.status = EscrowStatus.TIMELOCK_DEFAULT_TRIGGERED; // More specific status
        notificationMessage = `Timelock expired, default outcome applied for: "${escrow.title}"`;
        break;
      default:
        console.warn('Unknown action:', actionType);
        return;
    }
    
    setEscrow(updatedEscrow); // Optimistic update
    updateEscrow(updatedEscrow, notificationMessage);
    setActionToConfirm(null); // Close confirmation modal
  };

  const requestActionConfirmation = (type: string, title: string, message: string | React.ReactNode, data?:any, confirmButtonClass?: string, confirmButtonText?: string) => {
    setActionToConfirm({ type, title, message, data, confirmButtonClass, confirmButtonText });
  };

  const handleBroadcastFundingTx = async () => {
    if (!signedTxHex.trim()) {
      addNotification("No signed transaction available to broadcast. Please paste the hex.", "warning");
      return;
    }
    if (!currentUser.settings?.moneroNodeUrl) {
      addNotification("Monero Wallet RPC URL not set in your profile settings.", "error");
      return;
    }

    setIsBroadcasting(true);
    setBroadcastError(null);
    setBroadcastTxId(null);
    addNotification("Broadcasting transaction...", "info");

    const walletRpcUrl = currentUser.settings.moneroNodeUrl;
    const derivedDaemonUrl = getDaemonRpcUrl(walletRpcUrl);

    if (!derivedDaemonUrl) {
        addNotification("Could not derive Monero Daemon URL from Wallet RPC URL.", "error");
        setIsBroadcasting(false);
        return;
    }

    try {
      const result = await broadcastMoneroTransaction(derivedDaemonUrl, signedTxHex);
      if (result.success) {
        setBroadcastTxId(result.tx_hash || 'Broadcasted (TXID not returned by daemon)');
        addNotification(`Transaction broadcast successfully. TXID: ${result.tx_hash || '(N/A)'}`, 'success');
        // TODO: Update escrow status locally (e.g., to AWAITING_FUNDING_CONFIRMATION or similar)
        // This might involve calling a prop function like `updateEscrowStatus` or refetching escrow data
        // For now, just log and notify:
        console.log("Transaction broadcast success, escrow status should be updated.", result);
        if (escrow && escrow.status === EscrowStatus.PENDING_FUNDING && userRole === 'buyer') { // Conceptual update
            handleAction('fund_buyer'); // This existing handler updates status
        } else if (escrow && escrow.status === EscrowStatus.PENDING_FUNDING && userRole === 'seller') {
            handleAction('fund_seller');
        }

      } else {
        const errorMsg = `Broadcast failed: ${result.reason || result.status || 'Unknown daemon error'}`;
        setBroadcastError(errorMsg);
        addNotification(errorMsg, "error");
      }
    } catch (error: any) {
      console.error("Broadcast transaction error:", error);
      const errorMsg = `Broadcast error: ${error.message || 'Unknown error'}`;
      setBroadcastError(errorMsg);
      addNotification(errorMsg, "error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (!escrow) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <svg className="animate-spin h-8 w-8 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2">Loading escrow details...</span>
      </div>
    );
  }

  const userRole = getParticipant(escrow, currentUser.id);
  const otherPartyUsername = getOtherParticipantUsername(escrow, currentUser, mockAllUsers);

  const canFund = (role: 'buyer' | 'seller') => {
    if (role === 'buyer') return !escrow.buyer.hasFunded && (escrow.status === EscrowStatus.PENDING_FUNDING || escrow.status === EscrowStatus.SELLER_CONFIRMED_ITEM);
    if (role === 'seller') return !escrow.seller.hasFunded && (escrow.status === EscrowStatus.PENDING_FUNDING || escrow.status === EscrowStatus.BUYER_FUNDED);
    return false;
  }

  const canConfirm = (role: 'buyer' | 'seller') => {
    if (escrow.status !== EscrowStatus.ACTIVE && escrow.status !== EscrowStatus.AWAITING_PARTICIPANT_ACTION) return false;
    if (role === 'buyer') return !escrow.buyer.hasConfirmed;
    if (role === 'seller') return !escrow.seller.hasConfirmed;
    return false;
  }

  const canInitiateDispute = userRole !== 'observer' && 
    (escrow.status === EscrowStatus.ACTIVE || 
     escrow.status === EscrowStatus.AWAITING_PARTICIPANT_ACTION ||
     escrow.status === EscrowStatus.BUYER_FUNDED ||
     escrow.status === EscrowStatus.SELLER_CONFIRMED_ITEM
    ) && !escrow.arbiterInvolved;

  const isTerminalState = [
    EscrowStatus.COMPLETED_RELEASED, 
    EscrowStatus.COMPLETED_REFUNDED, 
    EscrowStatus.COMPLETED_SPLIT, 
    EscrowStatus.CANCELLED_UNFUNDED,
    EscrowStatus.TIMELOCK_DEFAULT_TRIGGERED
  ].includes(escrow.status);

  const statusColorMapping: Record<EscrowStatus, string> = {
    [EscrowStatus.PENDING_FUNDING]: 'text-yellow-400',
    [EscrowStatus.BUYER_FUNDED]: 'text-blue-400',
    [EscrowStatus.SELLER_CONFIRMED_ITEM]: 'text-blue-400',
    [EscrowStatus.AWAITING_PARTICIPANT_ACTION]: 'text-blue-400',
    [EscrowStatus.ACTIVE]: 'text-sky-400',
    [EscrowStatus.DISPUTE_INITIATED]: 'text-red-400',
    [EscrowStatus.EVIDENCE_SUBMISSION]: 'text-red-400',
    [EscrowStatus.ARBITER_REVIEW]: 'text-red-500',
    [EscrowStatus.RESOLUTION_REACHED]: 'text-purple-400',
    [EscrowStatus.COMPLETED_RELEASED]: 'text-green-400',
    [EscrowStatus.COMPLETED_REFUNDED]: 'text-green-400',
    [EscrowStatus.COMPLETED_SPLIT]: 'text-green-400',
    [EscrowStatus.CANCELLED_UNFUNDED]: 'text-gray-500',
    [EscrowStatus.TIMELOCK_DEFAULT_TRIGGERED]: 'text-purple-500',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-teal-400 hover:text-teal-300 mb-6 transition-colors">
        <ChevronLeft size={20} className="mr-1" /> Back to Dashboard
      </button>

      <div className="bg-gray-800 shadow-xl rounded-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
          <h1 className="text-3xl font-bold text-teal-400 truncate" title={escrow.title}>{escrow.title}</h1>
          <span className={`text-lg font-semibold px-3 py-1 rounded-full ${statusColorMapping[escrow.status] || 'text-gray-300'}`}>
            {escrow.status}
          </span>
        </div>
        
        <p className="text-gray-400 mb-6 text-sm">{escrow.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-md">
                <p className="text-sm text-gray-400 flex items-center"><DollarSign size={16} className="mr-1 text-teal-400"/> Amount</p>
                <p className="text-xl font-bold text-white">{escrow.amountXMR} XMR</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-md">
                <p className="text-sm text-gray-400 flex items-center"><Clock size={16} className="mr-1 text-teal-400"/> Timer Duration</p>
                <p className="text-xl font-bold text-white">{escrow.timerDurationHours} Hours</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-md">
                <p className="text-sm text-gray-400 flex items-center"><Info size={16} className="mr-1 text-teal-400"/> Default Outcome (on Timeout)</p>
                <p className="text-md font-semibold text-white">{escrow.defaultOutcome}</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-md">
                <p className="text-sm text-gray-400 flex items-center"><ShieldAlert size={16} className="mr-1 text-teal-400"/> Arbiter</p>
                <p className="text-md font-semibold text-white truncate" title={escrow.arbiterId}>{escrow.arbiterId} {escrow.arbiterInvolved ? "(Involved)" : "(Standing By)"}</p>
            </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-200 mb-3 flex items-center"><Users size={22} className="mr-2 text-teal-400"/>Participants</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
           <ParticipantInfo label="Buyer" id={escrow.buyer.id} hasFunded={escrow.buyer.hasFunded} hasConfirmed={escrow.buyer.hasConfirmed} isCurrentUser={currentUser.id === escrow.buyer.id} />
           <ParticipantInfo label="Seller" id={escrow.seller.id} hasFunded={escrow.seller.hasFunded} hasConfirmed={escrow.seller.hasConfirmed} isCurrentUser={currentUser.id === escrow.seller.id} />
        </div>
        
        <p className="text-xs text-gray-500 mb-1">Multi-Sig Address (Mock): <span className="font-mono text-gray-400">{escrow.multiSigAddress}</span></p>
        <p className="text-xs text-gray-500 mb-6">Created: {formatDate(escrow.creationDate)} | Last Update: {formatDate(escrow.lastUpdateDate)}</p>

        {/* Transaction Broadcasting Section - Conceptual Placement */}
        {/* This button would ideally only show when appropriate (e.g. status is PENDING_FUNDING and user is the funder) */}
        {/* For now, let's assume it's for the buyer to fund conceptually */}
        {(escrow.status === EscrowStatus.PENDING_FUNDING || escrow.status === EscrowStatus.SELLER_CONFIRMED_ITEM) && userRole === 'buyer' && !escrow.buyer.hasFunded && (
          <div className="my-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-300 mb-3">Fund Escrow (Step 2: Broadcast)</h3>
            <p className="text-xs text-gray-400 mb-2">
              (Conceptual) Assuming you have signed the funding transaction in Step 1 (e.g., via your Monero wallet software).
              Enter the signed transaction hex below to broadcast it.
            </p>
            <textarea
              className="w-full p-2 bg-gray-600 text-white border border-gray-500 rounded-md mb-3 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700"
              rows={3}
              placeholder="Paste signed transaction hex here..."
              value={signedTxHex}
              onChange={(e) => setSignedTxHex(e.target.value)}
              disabled={isBroadcasting}
            />
            <button
              onClick={handleBroadcastFundingTx}
              disabled={isBroadcasting || !signedTxHex.trim() || !currentUser.settings?.moneroNodeUrl}
              className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isBroadcasting ? (
                <Loader2 size={20} className="mr-2 animate-spin" />
              ) : (
                <Send size={20} className="mr-2" />
              )}
              {isBroadcasting ? 'Broadcasting...' : 'Broadcast Funding Transaction'}
            </button>
            {!currentUser.settings?.moneroNodeUrl && (
                <p className="text-xs text-red-400 mt-1">Monero Wallet RPC URL not set in your profile. Cannot determine daemon URL.</p>
            )}
            {broadcastTxId && (
              <p className="text-sm text-green-400 mt-2">Broadcast successful! TXID: <span className="font-mono break-all">{broadcastTxId}</span></p>
            )}
            {broadcastError && (
              <p className="text-sm text-red-400 mt-2">Broadcast Error: {broadcastError}</p>
            )}
          </div>
        )}


        {!isTerminalState && (
            <>
                <h3 className="text-xl font-semibold text-gray-200 mb-3 flex items-center"><AlertTriangle size={22} className="mr-2 text-yellow-400"/>Your Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {/* Simplified funding buttons - actual funding would be via the broadcast mechanism above */}
                    {userRole === 'buyer' && canFund('buyer') && (
                        <button
                            onClick={() => addNotification("Please use the 'Broadcast Funding Transaction' section after signing your transaction.", "info")}
                            className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                            title="This is now handled by the broadcast section"
                        >
                            Fund Escrow (Buyer) - See Broadcast Section
                        </button>
                    )}
                     {userRole === 'seller' && canFund('seller') && (
                         <button
                            onClick={() => addNotification("Please use the 'Broadcast Funding Transaction' section after signing your transaction (if applicable for seller-side funding).", "info")}
                            className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                            title="This is now handled by the broadcast section"
                         >
                            Fund Escrow (Seller) - See Broadcast Section
                         </button>
                     )}
                    {userRole === 'buyer' && canConfirm('buyer') && (
                         <button onClick={() => requestActionConfirmation('confirm_buyer', 'Confirm Satisfaction', 'Are you sure you are satisfied with the item/service and want to release funds to the seller?', undefined, 'bg-sky-500 hover:bg-sky-400', 'Confirm & Release')} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-2 px-4 rounded-md transition-colors">Confirm Satisfaction</button>
                    )}
                     {userRole === 'seller' && canConfirm('seller') && (
                        <button onClick={() => requestActionConfirmation('confirm_seller', 'Confirm Shipment/Service', 'Are you sure you have shipped the item / completed the service as agreed?', undefined, 'bg-sky-500 hover:bg-sky-400', 'Confirm Shipment/Service')} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-2 px-4 rounded-md transition-colors">Confirm Shipment/Service</button>
                    )}
                    {canInitiateDispute && (
                        <button onClick={() => {
                            const reason = prompt("Please briefly state the reason for initiating the dispute:");
                            if (reason !== null) { // User didn't cancel prompt
                               requestActionConfirmation('initiate_dispute', 'Initiate Dispute', `Are you sure you want to initiate a dispute? Reason: "${reason || 'No reason provided'}" This will involve the arbiter.`, { reason }, 'bg-red-600 hover:bg-red-500', 'Initiate Dispute')
                            }
                        }} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">Initiate Dispute</button>
                    )}
                </div>
            </>
        )}

        {escrow.arbiterInvolved && escrow.status === EscrowStatus.DISPUTE_INITIATED && !isTerminalState && (
             <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-300 mb-3 flex items-center"><ShieldAlert size={20} className="mr-2"/>Mock Arbiter Actions (For Demo)</h3>
                <p className="text-xs text-gray-400 mb-3">These buttons simulate an arbiter's decision.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <button onClick={() => requestActionConfirmation('rule_for_buyer', 'Arbiter: Rule for Buyer', 'Simulate arbiter ruling in favor of the Buyer (funds refunded).', undefined, 'bg-blue-600 hover:bg-blue-500', 'Rule for Buyer')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center justify-center"><Award size={16} className="mr-1"/> For Buyer</button>
                    <button onClick={() => requestActionConfirmation('rule_for_seller', 'Arbiter: Rule for Seller', 'Simulate arbiter ruling in favor of the Seller (funds released).', undefined, 'bg-purple-600 hover:bg-purple-500', 'Rule for Seller')} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center justify-center"><Award size={16} className="mr-1"/> For Seller</button>
                    <button onClick={() => requestActionConfirmation('rule_for_split', 'Arbiter: Rule for 50/50 Split', 'Simulate arbiter ruling for a 50/50 split of funds.', undefined, 'bg-indigo-600 hover:bg-indigo-500', 'Rule for Split')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center justify-center"><DivideSquare size={16} className="mr-1"/> 50/50 Split</button>
                    <button onClick={() => requestActionConfirmation('timelock_expiry', 'Simulate Timelock Expiry', 'Simulate the escrow timer expiring during a dispute, triggering the default outcome.', undefined, 'bg-orange-600 hover:bg-orange-500', 'Simulate Timelock')} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center justify-center"><TimerOff size={16} className="mr-1"/>Timelock</button>
                </div>
            </div>
        )}
        
        {isTerminalState && escrow.resolutionDetails && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-teal-300 mb-2 flex items-center">
                    {escrow.status === EscrowStatus.COMPLETED_RELEASED || escrow.status === EscrowStatus.COMPLETED_REFUNDED || escrow.status === EscrowStatus.COMPLETED_SPLIT ? <CheckCircle size={20} className="mr-2"/> : <XCircle size={20} className="mr-2"/>}
                    Escrow Resolution
                </h3>
                <p className="text-gray-300">{escrow.resolutionDetails}</p>
                {escrow.arbiterRuling && <p className="text-sm text-gray-400 mt-1">Arbiter final ruling: <span className="font-semibold">{escrow.arbiterRuling}</span></p>}
            </div>
        )}


        <ChatWindow escrow={escrow} currentUser={currentUser} onSendMessage={handleSendMessage} onUploadEvidence={handleUploadEvidence} />

      </div>

      {actionToConfirm && (
        <ConfirmActionModal
          isOpen={!!actionToConfirm}
          onClose={() => setActionToConfirm(null)}
          onConfirm={() => handleAction(actionToConfirm.type, actionToConfirm.data)}
          title={actionToConfirm.title}
          message={actionToConfirm.message}
          confirmButtonClass={actionToConfirm.confirmButtonClass}
          confirmButtonText={actionToConfirm.confirmButtonText}
        />
      )}
    </div>
  );
};
