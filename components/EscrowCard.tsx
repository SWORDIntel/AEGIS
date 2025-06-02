
import React from 'react';
import { Link } from 'react-router-dom';
import { Escrow, EscrowStatus, UserProfile } from '../types';
import { formatDate, getParticipant } from '../utils/helpers';
import { Eye, Edit3, Trash2, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Shield } from 'lucide-react'; // Added Shield

interface EscrowCardProps {
  escrow: Escrow;
  currentUser: UserProfile;
  onDelete: (escrowId: string) => void; // For unfunded escrows
}

const StatusIndicator: React.FC<{ status: EscrowStatus }> = ({ status }) => {
  let bgColor = 'bg-gray-500';
  let textColor = 'text-gray-100';
  let IconComponent = Clock; // Renamed to avoid conflict with Shield import

  switch (status) {
    case EscrowStatus.PENDING_FUNDING:
      bgColor = 'bg-yellow-600'; IconComponent = Clock;
      break;
    case EscrowStatus.ACTIVE:
    case EscrowStatus.BUYER_FUNDED:
    case EscrowStatus.AWAITING_PARTICIPANT_ACTION:
      bgColor = 'bg-blue-600'; IconComponent = Shield;
      break;
    case EscrowStatus.DISPUTE_INITIATED:
    case EscrowStatus.ARBITER_REVIEW:
    case EscrowStatus.EVIDENCE_SUBMISSION:
      bgColor = 'bg-red-600'; IconComponent = ShieldAlert;
      break;
    case EscrowStatus.COMPLETED_RELEASED:
    case EscrowStatus.COMPLETED_REFUNDED:
    case EscrowStatus.COMPLETED_SPLIT:
      bgColor = 'bg-green-600'; IconComponent = CheckCircle2;
      break;
    case EscrowStatus.CANCELLED_UNFUNDED:
      bgColor = 'bg-gray-700'; textColor = 'text-gray-400'; IconComponent = AlertTriangle;
      break;
    case EscrowStatus.TIMELOCK_DEFAULT_TRIGGERED:
      bgColor = 'bg-purple-600'; IconComponent = Clock;
      break;
    default:
      IconComponent = AlertTriangle;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      <IconComponent size={14} className="mr-1.5" />
      {status}
    </span>
  );
};


export const EscrowCard: React.FC<EscrowCardProps> = ({ escrow, currentUser, onDelete }) => {
  const userRole = getParticipant(escrow, currentUser.id);
  const otherPartyId = userRole === 'buyer' ? escrow.seller.id : escrow.buyer.id;
  // In a real app, you'd fetch the other party's username. Here, we'll use a placeholder.
  const otherPartyUsername = otherPartyId === 'mock_other_party_id' ? 'OtherParty123' : 
    (userRole === 'buyer' ? escrow.seller.id : escrow.buyer.id).substring(0,8) + '...';


  return (
    <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden transform hover:scale-[1.02] transition-transform duration-200 ease-in-out">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-teal-400 truncate" title={escrow.title}>
            {escrow.title || `Escrow ID: ${escrow.id.substring(0,8)}`}
          </h3>
          <StatusIndicator status={escrow.status} />
        </div>
        <p className="text-sm text-gray-400 mb-1">
          With: <span className="font-medium text-gray-300">{otherPartyUsername}</span> ({userRole === 'buyer' ? 'You are Buyer' : 'You are Seller'})
        </p>
        <p className="text-2xl font-bold text-white mb-3">{escrow.amountXMR} <span className="text-sm font-normal text-gray-400">XMR</span></p>
        <p className="text-xs text-gray-500 mb-3 truncate" title={escrow.description}>
          {escrow.description}
        </p>
        <div className="text-xs text-gray-500">
          <p>Created: {formatDate(escrow.creationDate)}</p>
          <p>Last Update: {formatDate(escrow.lastUpdateDate)}</p>
        </div>
      </div>
      <div className="bg-gray-750 px-5 py-3 flex justify-end items-center space-x-2">
        {escrow.status === EscrowStatus.PENDING_FUNDING && escrow.initiatorId === currentUser.id && (
          <button
            onClick={() => onDelete(escrow.id)}
            className="text-red-400 hover:text-red-300 p-2 rounded-md transition-colors text-xs flex items-center"
            title="Delete Escrow (Only if unfunded and initiator)"
          >
            <Trash2 size={16} className="mr-1" /> Delete
          </button>
        )}
         <Link
          to={`/escrow/${escrow.id}`}
          className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
        >
          <Eye size={16} className="mr-1" /> View Details
        </Link>
      </div>
    </div>
  );
};
