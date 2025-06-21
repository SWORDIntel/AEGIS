
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Escrow, ChatMessage, EscrowStatus, UserProfile, ArbiterRuling, DefaultOutcome, EscrowParticipant, AddNotificationHandler, BroadcastTxResponse } from '../types';
import { formatDate, generateId, getParticipant, getOtherParticipantUsername, getDaemonRpcUrl, broadcastMoneroTransaction, initiateEmergencyOverride } from '../utils/helpers';
import { ChevronLeft, Send, Paperclip, ShieldAlert, CheckCircle, XCircle, MessageSquare, DollarSign, Info, Clock, Users, AlertTriangle, Award, DivideSquare, TimerOff, ShieldCheck, ShieldX, HelpCircle, FileText, Filter as FilterIcon, Loader2, ExternalLink, Zap } from 'lucide-react';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import { EscrowTimer } from '../components/EscrowTimer'; // Added import

interface EscrowDetailPageProps {
  escrows: Escrow[];
  updateEscrow: (updatedEscrow: Escrow, notificationMessage?: string) => void;
  currentUser: UserProfile;
  addNotification: AddNotificationHandler;
}

const mockAllUsers: UserProfile[] = []; // Assuming no global user list for now

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center px-4 py-2 font-medium text-sm rounded-t-lg transition-colors
                ${isActive 
                  ? 'bg-gray-700 text-teal-400 border-b-2 border-teal-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'}`}
  >
    {icon && <span className="mr-2">{icon}</span>}
    {label}
  </button>
);


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
    <div className="bg-gray-750 rounded-b-lg p-4"> {/* Matched bg with tab content areas */}
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
           {canSubmitEvidence && !isChatDisabled ? ( 
            <button onClick={handleSendAsEvidence} className="p-2 bg-orange-500 hover:bg-orange-400 text-white rounded-md transition-colors" title="Send as Evidence" disabled={isChatDisabled}>
              <Paperclip size={20} />
            </button>
          ) : null}
        </div>
      )}
       <p className="text-xs text-gray-500 mt-2">Chat logs can be submitted as evidence. Chat is disabled for completed or cancelled escrows.</p>
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

type ActiveTab = 'details' | 'chat' | 'evidence';

export const EscrowDetailPage: React.FC<EscrowDetailPageProps> = ({ escrows, updateEscrow, currentUser, addNotification }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<{ type: string; title: string; message: string | React.ReactNode; data?: any; confirmButtonClass?: string, confirmButtonText?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'buyer' | 'seller'>('all');

  // State for transaction broadcasting
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastTxId, setBroadcastTxId] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  // State for the signed transaction hex (to be provided by user or wallet integration later)
  const [signedTxHex, setSignedTxHex] = useState<string>(''); // Placeholder for now
  const [overrideTxId, setOverrideTxId] = useState<string | null>(null); // For displaying simulated TXID from override

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
    setEscrow(updatedEscrow); 
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
    setEscrow(updatedEscrow); 
    updateEscrow(updatedEscrow, `Evidence submitted in "${escrow.title}"`);
    addNotification('Evidence submitted (marked in chat).', 'info');
  }, [escrow, currentUser, updateEscrow, addNotification]);

  const handleAction = (actionType: string, data?: any) => {
    if (!escrow) return;

    // For funding actions, we will now trigger the broadcast flow.
    // The actual state update (hasFunded = true) will happen after successful broadcast.
    if (actionType === 'fund_buyer') {
        // In a real scenario, the signed TX hex would be obtained after user confirms funding details
        // and signs the transaction with their wallet.
        // For now, we'll use a placeholder and expect it to be in `signedTxHex` state.
        // We'll also open a modal or section for the user to paste it.
        // For this step, let's assume `signedTxHex` is ready for broadcast.

        // TODO: Replace this with actual signed TX hex when available
        const placeholderTxHex = "PASTE_SIGNED_TRANSACTION_HEX_HERE";
        if (!signedTxHex && actionType === 'fund_buyer') {
             addNotification("Please provide the signed transaction hex to broadcast.", "warning");
             // We might want to show a modal here to input the hex
             // For now, just preventing action if hex is missing.
             // Let's set a dummy one for now to proceed with broadcast logic for testing.
             if (!signedTxHex) {
                console.warn("Using dummy transaction hex for broadcasting.");
                // setSignedTxHex("dummy_tx_hex_for_testing_needs_to_be_long_enough_for_monero_tx_hex_usually_very_long_string_of_hex_characters_abcdef1234567890...");
             }
             // return; // Uncomment this if strict about requiring user input first
        }

        handleBroadcastTransaction(actionType === 'fund_buyer' ? 'buyer' : 'seller');
        setActionToConfirm(null); // Close confirmation modal if it was open
        return; // We don't want to proceed with the old logic for this action
    }

    let updatedEscrow = { ...escrow };
    let notificationMessage = '';

    // Handle emergency overrides first
    if (actionType === 'override_to_buyer') {
      handleEmergencyOverride('buyer');
      return;
    }
    if (actionType === 'override_to_seller') {
      handleEmergencyOverride('seller');
      return;
    }

    switch (actionType) {
      // fund_buyer is now handled by handleBroadcastTransaction
      // fund_seller might also involve broadcasting in a real system. For now, manual update.
      case 'fund_seller':
        updatedEscrow.seller.hasFunded = true;
        updatedEscrow.seller.hasConfirmed = true; 
        notificationMessage = `Seller funded & confirmed item for escrow: "${escrow.title}"`;
        if (updatedEscrow.buyer.hasFunded) updatedEscrow.status = EscrowStatus.ACTIVE;
        else updatedEscrow.status = EscrowStatus.SELLER_CONFIRMED_ITEM;
        break;
      case 'confirm_buyer': 
        updatedEscrow.buyer.hasConfirmed = true;
        notificationMessage = `Buyer confirmed satisfaction for: "${escrow.title}"`;
        if (updatedEscrow.seller.hasConfirmed) {
            updatedEscrow.status = EscrowStatus.COMPLETED_RELEASED;
            updatedEscrow.resolutionDetails = "Mutual agreement: Buyer confirmed satisfaction, Seller confirmed shipment/service.";
        } else {
            updatedEscrow.status = EscrowStatus.AWAITING_PARTICIPANT_ACTION;
        }
        break;
      case 'confirm_seller': 
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
            updatedEscrow.resolutionDetails = "Timelock expired: Default outcome - Full refund to Buyer.";
            updatedEscrow.status = EscrowStatus.COMPLETED_REFUNDED; 
        } else if (escrow.defaultOutcome === DefaultOutcome.SPLIT_50_50) {
            updatedEscrow.resolutionDetails = "Timelock expired: Default outcome - 50/50 Split.";
            updatedEscrow.status = EscrowStatus.COMPLETED_SPLIT; 
        } else { 
            updatedEscrow.resolutionDetails = "Timelock expired: Default outcome - Full release to Seller.";
            updatedEscrow.status = EscrowStatus.COMPLETED_RELEASED; 
        }
        notificationMessage = `Timelock expired, default outcome applied for: "${escrow.title}"`;
        break;
      default:
        console.warn('Unknown action:', actionType);
        return;
    }
    
    setEscrow(updatedEscrow); 
    updateEscrow(updatedEscrow, notificationMessage);
    setActionToConfirm(null); 
  };

  const handleBroadcastTransaction = async (fundingParty: 'buyer' | 'seller') => {
    if (!escrow || !currentUser.settings.moneroNodeUrl) {
      addNotification("Configuration error: Monero node URL is not set.", "error");
      setBroadcastError("Monero node URL is not set in user settings.");
      return;
    }
    if (!signedTxHex) {
        addNotification("Error: Signed transaction hex is missing.", "error");
        setBroadcastError("Signed transaction hex is missing. Cannot broadcast.");
        return;
    }

    setIsBroadcasting(true);
    setBroadcastError(null);
    setBroadcastTxId(null);

    try {
      // Assume moneroNodeUrl is the WALLET RPC URL, derive daemon URL from it.
      // If moneroNodeUrl is already a DAEMON RPC URL, getDaemonRpcUrl might need adjustment
      // or we could have separate settings for wallet and daemon URLs.
      const daemonRpcUrl = getDaemonRpcUrl(currentUser.settings.moneroNodeUrl);
      addNotification(`Attempting to broadcast to daemon at ${daemonRpcUrl}...`, "info");

      const response: BroadcastTxResponse = await broadcastMoneroTransaction(daemonRpcUrl, signedTxHex);

      if (response.status === "OK" && response.tx_hash) {
        setBroadcastTxId(response.tx_hash);
        addNotification(`Transaction broadcasted successfully! TXID: ${response.tx_hash}`, "success");

        // Now update the escrow state
        setEscrow(prevEscrow => {
          if (!prevEscrow) return null;
          const updatedEscrow = { ...prevEscrow };
          let notificationMessage = '';

          if (fundingParty === 'buyer') {
            updatedEscrow.buyer.hasFunded = true;
            notificationMessage = `Buyer successfully funded escrow: "${prevEscrow.title}" (TXID: ${response.tx_hash})`;
            if (updatedEscrow.seller.hasFunded) updatedEscrow.status = EscrowStatus.ACTIVE;
            else updatedEscrow.status = EscrowStatus.BUYER_FUNDED;
          } else { // fundingParty === 'seller'
            // Note: Seller funding also confirming item in current logic. If broadcast is separate, this might change.
            updatedEscrow.seller.hasFunded = true;
            updatedEscrow.seller.hasConfirmed = true;
            notificationMessage = `Seller successfully funded & confirmed for escrow: "${prevEscrow.title}" (TXID: ${response.tx_hash})`;
            if (updatedEscrow.buyer.hasFunded) updatedEscrow.status = EscrowStatus.ACTIVE;
            else updatedEscrow.status = EscrowStatus.SELLER_CONFIRMED_ITEM;
          }
          updateEscrow(updatedEscrow, notificationMessage);
          return updatedEscrow;
        });

      } else {
        const reason = response.reason || response.error?.message || "Unknown error during broadcast.";
        setBroadcastError(`Broadcast failed: ${reason}`);
        addNotification(`Transaction broadcast failed: ${reason}`, "error");
      }
    } catch (error: any) {
      console.error("Broadcast transaction error:", error);
      const errorMessage = error.message || "An unexpected error occurred during broadcast.";
      setBroadcastError(errorMessage);
      addNotification(`Broadcast error: ${errorMessage}`, "error");
    } finally {
      setIsBroadcasting(false);
      // setSignedTxHex(''); // Clear the hex after attempting broadcast
    }
  };

  const requestActionConfirmation = (type: string, title: string, message: string | React.ReactNode, data?:any, confirmButtonClass?: string, confirmButtonText?: string) => {
    // If the action is to fund, and we don't have the signedTxHex yet,
    // we might want to show a different modal or an input field first.
    // For now, the confirmation modal will trigger handleAction, which then calls handleBroadcast.
    if (type === 'fund_buyer' && !signedTxHex) {
        // TODO: Implement a modal to input signedTxHex if it's empty.
        // For now, we're proceeding and it will use a dummy or show an error.
        // This is now handled by the button's onClick directly.
    }
    setActionToConfirm({ type, title, message, data, confirmButtonClass, confirmButtonText });
  };

  const handleEmergencyOverride = (recipientRole: 'buyer' | 'seller') => {
    if (!escrow) return;

    const reason = prompt(`EMERGENCY OVERRIDE: Please provide a reason for overriding in favor of ${recipientRole}. This is a critical action and will be logged.`);
    if (!reason) {
      addNotification("Emergency override cancelled: No reason provided.", "warning");
      return;
    }

    const overrideResult = initiateEmergencyOverride(escrow.id, recipientRole, escrow.amountXMR, reason);
    setOverrideTxId(overrideResult.simulatedTxId);
    addNotification(overrideResult.message, "warning");

    setEscrow(prevEscrow => {
      if (!prevEscrow) return null;
      const updatedEscrow = { ...prevEscrow };

      updatedEscrow.status = recipientRole === 'buyer' ? EscrowStatus.COMPLETED_REFUNDED : EscrowStatus.COMPLETED_RELEASED;
      updatedEscrow.arbiterRuling = null; // Or a special 'override' ruling
      updatedEscrow.resolutionDetails = `EMERGENCY OVERRIDE: Manually resolved in favor of ${recipientRole}. Reason: ${reason}. Simulated TXID: ${overrideResult.simulatedTxId}`;
      updatedEscrow.lastUpdateDate = new Date().toISOString();

      // Mark funding and confirmation as complete for both to close out the escrow cleanly
      updatedEscrow.buyer.hasFunded = true;
      updatedEscrow.buyer.hasConfirmed = true;
      updatedEscrow.seller.hasFunded = true;
      updatedEscrow.seller.hasConfirmed = true;

      updateEscrow(updatedEscrow, `Emergency Override: Escrow "${prevEscrow.title}" resolved for ${recipientRole}.`);
      return updatedEscrow;
    });
    setActionToConfirm(null); // Close any open confirmation modal
  };

  const filteredEvidence = useMemo(() => {
    if (!escrow) return [];
    return escrow.chatLog.filter(msg => {
      if (!msg.isEvidence) return false;
      if (evidenceFilter === 'all') return true;
      if (evidenceFilter === 'buyer' && msg.senderId === escrow.buyer.id) return true;
      if (evidenceFilter === 'seller' && msg.senderId === escrow.seller.id) return true;
      return false;
    });
  }, [escrow, evidenceFilter]);


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
    [
        EscrowStatus.ACTIVE, 
        EscrowStatus.AWAITING_PARTICIPANT_ACTION,
        EscrowStatus.BUYER_FUNDED,
        EscrowStatus.SELLER_CONFIRMED_ITEM
    ].includes(escrow.status) && !escrow.arbiterInvolved;

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
      <button onClick={() => navigate(-1)} className="flex items-center text-teal-400 hover:text-teal-300 mb-6 transition-colors">
        <ChevronLeft size={20} className="mr-1" /> Back
      </button>

      <div className="bg-gray-800 shadow-xl rounded-lg">
        <div className="p-6 md:p-8 border-b border-gray-700">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-2">
            <h1 className="text-3xl font-bold text-teal-400 truncate" title={escrow.title}>{escrow.title}</h1>
            <span className={`text-lg font-semibold px-3 py-1 rounded-full ${statusColorMapping[escrow.status] || 'text-gray-300'}`}>
                {escrow.status}
            </span>
            </div>
            <p className="text-gray-400 mb-4 text-sm">{escrow.description}</p>
            <EscrowTimer escrow={escrow} size="normal" /> {/* Timer added here */}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-2 sm:px-4 md:px-6">
          <TabButton label="Details" isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<Info size={16}/>} />
          <TabButton label="Chat Log" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={16}/>}/>
          <TabButton label="Evidence" isActive={activeTab === 'evidence'} onClick={() => setActiveTab('evidence')} icon={<FileText size={16}/>}/>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="p-6 md:p-8 bg-gray-750 rounded-b-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded-md">
                    <p className="text-sm text-gray-400 flex items-center"><DollarSign size={16} className="mr-1 text-teal-400"/> Amount</p>
                    <p className="text-xl font-bold text-white">{escrow.amountXMR} XMR</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-md">
                    <p className="text-sm text-gray-400 flex items-center"><Clock size={16} className="mr-1 text-teal-400"/> Total Timer Duration</p>
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
            
            <p className="text-xs text-gray-500 mb-1">Multi-Sig Address: <span className="font-mono text-gray-400">{escrow.multiSigAddress}</span></p>
            <p className="text-xs text-gray-500 mb-6">Created: {formatDate(escrow.creationDate)} | Last Update: {formatDate(escrow.lastUpdateDate)}</p>

            {/* Transaction Broadcasting Section - visible when user can fund */}
            {userRole === 'buyer' && canFund('buyer') && !escrow.buyer.hasFunded && (
              <div className="my-6 p-4 bg-gray-700 rounded-lg">
                <h4 className="text-lg font-semibold text-teal-300 mb-2">Fund Escrow - Step 1: Prepare Transaction</h4>
                <p className="text-sm text-gray-300 mb-3">
                  To fund this escrow, you need to create and sign a Monero transaction using your wallet software for {escrow.amountXMR} XMR to the multisig address: <strong className="font-mono text-teal-400 break-all">{escrow.multiSigAddress}</strong>.
                </p>
                <label htmlFor="signedTxHex" className="block text-sm font-medium text-gray-300 mb-1">
                  Step 2: Paste Signed Transaction Hex
                </label>
                <textarea
                  id="signedTxHex"
                  rows={4}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-gray-200 focus:ring-teal-500 focus:border-teal-500 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
                  placeholder="Paste the full hexadecimal string of your signed transaction here."
                  value={signedTxHex}
                  onChange={(e) => setSignedTxHex(e.target.value)}
                  disabled={isBroadcasting || escrow.buyer.hasFunded}
                />

                {isBroadcasting && (
                  <div className="mt-3 flex items-center text-yellow-400">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Broadcasting transaction... Please wait.
                  </div>
                )}
                {broadcastError && (
                  <div className="mt-3 p-3 bg-red-800/50 border border-red-700 text-red-300 rounded-md text-sm">
                    <p className="font-semibold">Broadcast Error:</p>
                    <p>{broadcastError}</p>
                  </div>
                )}
                {broadcastTxId && (
                  <div className="mt-3 p-3 bg-green-800/50 border border-green-700 text-green-300 rounded-md text-sm">
                    <p className="font-semibold">Broadcast Successful!</p>
                    <p>Transaction ID (TXID): <strong className="font-mono break-all">{broadcastTxId}</strong></p>
                    {/* TODO: Add a link to a Monero block explorer */}
                     <a href={`https://xmrchain.net/tx/${broadcastTxId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-teal-400 hover:text-teal-300 mt-1">
                      View on XMRChain.net <ExternalLink size={14} className="ml-1"/>
                    </a>
                  </div>
                )}
              </div>
            )}

            {!isTerminalState && (
                <>
                    <h3 className="text-xl font-semibold text-gray-200 mb-3 flex items-center"><AlertTriangle size={22} className="mr-2 text-yellow-400"/>Your Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {userRole === 'buyer' && canFund('buyer') && (
                            <button
                              onClick={() => {
                                if (!signedTxHex) {
                                  addNotification("Please paste your signed transaction hex first.", "warning");
                                  const txHexInput = document.getElementById('signedTxHex');
                                  if (txHexInput) txHexInput.focus();
                                  return;
                                }
                                requestActionConfirmation(
                                  'fund_buyer',
                                  'Confirm & Broadcast Funding',
                                  <>
                                    <p>You are about to broadcast the provided transaction to fund the escrow.</p>
                                    <p className="mt-2 text-sm text-gray-400">Ensure the transaction hex is correct and targets the escrow's multisig address: <strong className="font-mono text-teal-400 break-all">{escrow.multiSigAddress}</strong> for {escrow.amountXMR} XMR.</p>
                                    <p className="mt-2 font-semibold">This action is irreversible once the transaction is on the network.</p>
                                  </>,
                                  undefined,
                                  'bg-green-600 hover:bg-green-500',
                                  'Confirm & Broadcast'
                                )}
                              }
                              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
                              disabled={isBroadcasting || !signedTxHex || escrow.buyer.hasFunded}
                            >
                              {isBroadcasting ? <Loader2 size={20} className="animate-spin mr-2 inline"/> : null}
                              {escrow.buyer.hasFunded ? 'Funding Broadcasted' : 'Broadcast Funding Tx'}
                            </button>
                        )}
                        {userRole === 'seller' && canFund('seller') && (
                            <button onClick={() => requestActionConfirmation('fund_seller', 'Confirm Funding & Item', 'Are you sure you want to mark this escrow as funded and item confirmed from your side? (This is a placeholder, seller funding broadcast not yet implemented)', undefined, 'bg-green-600 hover:bg-green-500', 'Confirm Seller Funding')} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">Fund Escrow (as Seller)</button>
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
                                if (reason !== null) { 
                                requestActionConfirmation('initiate_dispute', 'Initiate Dispute', <>Are you sure you want to initiate a dispute? Reason: <strong className="block mt-1">"{reason || 'No reason provided'}"</strong> This will involve the arbiter.</>, { reason }, 'bg-red-600 hover:bg-red-500', 'Initiate Dispute')
                                }
                            }} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">Initiate Dispute</button>
                        )}
                    </div>
                </>
            )}

            {escrow.arbiterInvolved && 
             (escrow.status === EscrowStatus.DISPUTE_INITIATED || escrow.status === EscrowStatus.ARBITER_REVIEW || escrow.status === EscrowStatus.EVIDENCE_SUBMISSION) && 
             !isTerminalState && (
                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-300 mb-3 flex items-center"><ShieldAlert size={20} className="mr-2"/>Arbiter Actions</h3>
                    <p className="text-xs text-gray-400 mb-3">These buttons simulate an arbiter's decision. Use with caution.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <button onClick={() => requestActionConfirmation('rule_for_buyer', 'Arbiter: Rule for Buyer', 'Simulate arbiter ruling in favor of the Buyer (funds refunded).', undefined, 'bg-blue-600 hover:bg-blue-500', 'Rule for Buyer')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center justify-center"><Award size={16} className="mr-1"/> For Buyer</button>
                        <button onClick={() => requestActionConfirmation('rule_for_seller', 'Arbiter: Rule for Seller', 'Simulate arbiter ruling in favor of the Seller (funds released).', undefined, 'bg-purple-600 hover:bg-purple-500', 'Rule for Seller')} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center justify-center"><Award size={16} className="mr-1"/> For Seller</button>
                        <button onClick={() => requestActionConfirmation('rule_for_split', 'Arbiter: Rule for 50/50 Split', 'Simulate arbiter ruling for a 50/50 split of funds.', undefined, 'bg-indigo-600 hover:bg-indigo-500', 'Rule for Split')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center justify-center"><DivideSquare size={16} className="mr-1"/> 50/50 Split</button>
                        <button onClick={() => requestActionConfirmation('timelock_expiry', 'Simulate Timelock Expiry', 'Simulate the escrow timer expiring, triggering the default outcome.', undefined, 'bg-orange-600 hover:bg-orange-500', 'Simulate Timelock')} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center justify-center"><TimerOff size={16} className="mr-1"/>Timelock</button>
                    </div>
                </div>
            )}
            
            {isTerminalState && escrow.resolutionDetails && (
                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-teal-300 mb-2 flex items-center">
                        {escrow.status === EscrowStatus.COMPLETED_RELEASED || escrow.status === EscrowStatus.COMPLETED_REFUNDED || escrow.status === EscrowStatus.COMPLETED_SPLIT ? <CheckCircle size={20} className="mr-2"/> : <XCircle size={20} className="mr-2"/>}
                        Escrow Resolution
                    </h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{escrow.resolutionDetails}</p>
                    {escrow.arbiterRuling && <p className="text-sm text-gray-400 mt-1">Arbiter final ruling: <span className="font-semibold">{escrow.arbiterRuling}</span></p>}
                    {overrideTxId && escrow.resolutionDetails?.includes(overrideTxId) && (
                         <p className="text-sm text-orange-300 mt-1">Simulated Override TXID: <span className="font-mono">{overrideTxId}</span></p>
                    )}
                </div>
            )}

            {/* EMERGENCY OVERRIDE SECTION - ADMIN ONLY */}
            {currentUser.username === 'admin' && !isTerminalState && (
              <div className="mt-8 p-4 bg-red-900/70 border border-red-700 rounded-lg">
                <h3 className="text-xl font-bold text-red-300 mb-3 flex items-center">
                  <Zap size={22} className="mr-2" /> Emergency Override Controls (Admin)
                </h3>
                <p className="text-sm text-red-200 mb-4">
                  Use these actions only in critical situations to manually resolve the escrow. This action bypasses normal fund broadcasting and simulates completion.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => requestActionConfirmation(
                      'override_to_buyer',
                      'Confirm Override to Buyer',
                      'You are about to override this escrow and simulate a full refund to the BUYER. This is irreversible. Are you absolutely sure?',
                      undefined,
                      'bg-red-600 hover:bg-red-500',
                      'Confirm Override (Buyer)'
                    )}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                  >
                    Override to Buyer
                  </button>
                  <button
                    onClick={() => requestActionConfirmation(
                      'override_to_seller',
                      'Confirm Override to Seller',
                      'You are about to override this escrow and simulate a full payment to the SELLER. This is irreversible. Are you absolutely sure?',
                      undefined,
                      'bg-red-600 hover:bg-red-500',
                      'Confirm Override (Seller)'
                    )}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                  >
                    Override to Seller
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatWindow escrow={escrow} currentUser={currentUser} onSendMessage={handleSendMessage} onUploadEvidence={handleUploadEvidence} />
        )}
        
        {activeTab === 'evidence' && (
            <div className="p-6 md:p-8 bg-gray-750 rounded-b-lg">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-200 flex items-center"><FileText size={20} className="mr-2 text-teal-400" />Submitted Evidence</h3>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                        <FilterIcon size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-400">Filter by:</span>
                        {(['all', 'buyer', 'seller'] as const).map(filterOpt => (
                            <button
                                key={filterOpt}
                                onClick={() => setEvidenceFilter(filterOpt)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${evidenceFilter === filterOpt ? 'bg-teal-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                            >
                                {filterOpt.charAt(0).toUpperCase() + filterOpt.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-96 overflow-y-auto p-2 bg-gray-800 rounded scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {filteredEvidence.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-10">
                            {escrow.chatLog.some(m => m.isEvidence) ? "No evidence matching current filter." : "No evidence has been submitted yet."}
                        </p>
                    ) : (
                        filteredEvidence.map(msg => (
                            <div key={msg.id} className="mb-3 p-3 rounded-md bg-gray-700 border border-orange-500/30">
                                <p className="text-xs font-semibold text-orange-300">Evidence from: {msg.senderUsername}</p>
                                <p className="text-sm text-white py-2">{msg.text}</p>
                                <p className="text-xs text-gray-400 mt-1 text-right">{formatDate(msg.timestamp)}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

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