
import React, { useState } from 'react';
import { DefaultOutcome, UserProfile, AddEscrowHandler, AddNotificationHandler } from '../../types'; // Added AddNotificationHandler
import { X, PlusCircle, Info } from 'lucide-react'; // Added Info

interface CreateEscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  addEscrow: AddEscrowHandler;
  currentUser: UserProfile;
  addNotification: AddNotificationHandler; // Added prop
}

export const CreateEscrowModal: React.FC<CreateEscrowModalProps> = ({ isOpen, onClose, addEscrow, currentUser, addNotification }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountXMR, setAmountXMR] = useState<number | string>('');
  const [otherPartyId, setOtherPartyId] = useState('other_party_id_default'); 
  const [userIsBuyer, setUserIsBuyer] = useState(true);
  const [defaultOutcome, setDefaultOutcome] = useState<DefaultOutcome>(DefaultOutcome.BUYER_REFUND);
  const [timerDurationHours, setTimerDurationHours] = useState<number | string>(72); 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !amountXMR || Number(amountXMR) <= 0 || !otherPartyId.trim() || !timerDurationHours || Number(timerDurationHours) <=0) {
      addNotification("Please fill in all fields with valid values.", "error");
      return;
    }

    if (otherPartyId.trim() === currentUser.id) {
      addNotification("The 'Other Party ID' cannot be your own user ID. An escrow must be between two different parties.", "error");
      return;
    }

    const numericAmount = Number(amountXMR);
    const numericTimer = Number(timerDurationHours);

    const newEscrowFields = {
      title,
      description,
      amountXMR: numericAmount,
      initiatorId: currentUser.id,
      buyerId: userIsBuyer ? currentUser.id : otherPartyId,
      sellerId: !userIsBuyer ? currentUser.id : otherPartyId,
      defaultOutcome,
      timerDurationHours: numericTimer,
    };
    addEscrow(newEscrowFields); // Notification for success is handled in App.tsx's addEscrow
    onClose();
    // Reset form
    setTitle('');
    setDescription('');
    setAmountXMR('');
    setOtherPartyId('other_party_id_default');
    setUserIsBuyer(true);
    setDefaultOutcome(DefaultOutcome.BUYER_REFUND);
    setTimerDurationHours(72);
  };
  
  const getDefaultOutcomeExplanation = () => {
    const amount = Number(amountXMR) > 0 ? Number(amountXMR) : 0;
    switch (defaultOutcome) {
      case DefaultOutcome.BUYER_REFUND:
        return `If the timer expires, the full escrow amount (${amount > 0 ? amount : 'N/A'} XMR) will be refunded to the Buyer.`;
      case DefaultOutcome.SPLIT_50_50:
        return `If the timer expires, the escrow amount (${amount > 0 ? amount : 'N/A'} XMR) will be split 50/50 between the Buyer and the Seller.`;
      case DefaultOutcome.SELLER_FAVOR:
        return `If the timer expires, the full escrow amount (${amount > 0 ? amount : 'N/A'} XMR) will be released to the Seller.`;
      default:
        return 'Select a default outcome to see its implication.';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-teal-400 flex items-center">
            <PlusCircle size={28} className="mr-2" /> Create New Escrow
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="e.g., Design for Website Homepage"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description of Terms</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Detailed terms of the agreement..."
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amountXMR" className="block text-sm font-medium text-gray-300 mb-1">Amount (XMR)</label>
              <input
                type="number"
                id="amountXMR"
                value={amountXMR}
                onChange={(e) => setAmountXMR(parseFloat(e.target.value) > 0 ? parseFloat(e.target.value) : '')}
                min="0.000001"
                step="any"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g., 10.5"
                required
              />
            </div>
             <div>
              <label htmlFor="otherPartyId" className="block text-sm font-medium text-gray-300 mb-1">Other Party ID</label>
              <input
                type="text"
                id="otherPartyId"
                value={otherPartyId}
                onChange={(e) => setOtherPartyId(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter other party's identifier"
                required
              />
               <p className="text-xs text-gray-500 mt-1">Enter the unique ID of the other participant. This must be different from your own ID.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Your Role</label>
            <select
              value={userIsBuyer ? 'buyer' : 'seller'}
              onChange={(e) => setUserIsBuyer(e.target.value === 'buyer')}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="buyer">I am the Buyer</option>
              <option value="seller">I am the Seller</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="defaultOutcome" className="block text-sm font-medium text-gray-300 mb-1">Default Outcome (on Timeout)</label>
              <select
                id="defaultOutcome"
                value={defaultOutcome}
                onChange={(e) => setDefaultOutcome(e.target.value as DefaultOutcome)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value={DefaultOutcome.BUYER_REFUND}>Full Refund to Buyer</option>
                <option value={DefaultOutcome.SPLIT_50_50}>50/50 Split (Buyer/Seller)</option>
                <option value={DefaultOutcome.SELLER_FAVOR}>Full Release to Seller</option>
              </select>
            </div>
            <div>
              <label htmlFor="timerDurationHours" className="block text-sm font-medium text-gray-300 mb-1">Timer Duration (Hours)</label>
              <input
                type="number"
                id="timerDurationHours"
                value={timerDurationHours}
                onChange={(e) => setTimerDurationHours(parseInt(e.target.value, 10) > 0 ? parseInt(e.target.value, 10) : '')}
                min="1"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g., 72 for 3 days"
                required
              />
            </div>
          </div>

          {/* "What If" Simulator */}
          <div className="mt-3 p-3 bg-gray-750 border border-gray-600 rounded-md">
            <div className="flex items-start">
              <Info size={20} className="text-sky-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-sky-300">Outcome if Timer Expires:</p>
                <p className="text-xs text-gray-300">{getDefaultOutcomeExplanation()}</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-md transition-colors flex items-center"
            >
              <PlusCircle size={18} className="mr-2" /> Create Escrow
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            An arbiter will be assigned and a multi-signature address generated upon creation.
            Funding will be required post-creation to activate the escrow.
          </p>
        </form>
      </div>
    </div>
  );
};