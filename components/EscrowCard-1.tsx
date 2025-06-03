
import React from 'react';
import { Link } from 'react-router-dom';
import { Escrow, EscrowStatus, UserProfile } from '../types';
import { formatDate, getParticipant } from '../utils/helpers';
import { Eye, Trash2, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Shield, Users, DollarSign } from 'lucide-react'; // Added Users, DollarSign
import { EscrowTimer } from './EscrowTimer'; // Added import

interface EscrowCardProps {
  escrow: Escrow;
  currentUser: UserProfile;
  onDelete: (escrowId: string) => void;
}

const StatusIndicator: React.FC<{ status: EscrowStatus }> = ({ status }) => {
  let bgColor = 'bg-gray-500';
  let textColor = 'text-gray-100';
  let IconComponent = Clock; 

  switch (status) {
    case EscrowStatus.PENDING_FUNDING:
      bgColor = 'bg-yellow-600'; IconComponent = Clock;
      break;
    case EscrowStatus.ACTIVE:
    case EscrowStatus.BUYER_FUNDED:
    case EscrowStatus.AWAITING_PARTICIPANT_ACTION:
    case EscrowStatus.SELLER_CONFIRMED_ITEM:
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

const FundingProgressIndicator: React.FC<{ escrow: Escrow }> = ({ escrow }) => {
  const { buyer, seller, status } = escrow;
  let progressText = "";
  let progressColor = "text-gray-400";

  if (status === EscrowStatus.PENDING_FUNDING) {
    progressText = "0/2 Funded";
    progressColor = "text-yellow-400";
  } else if (status === EscrowStatus.BUYER_FUNDED) {
    progressText = "Buyer Funded (1/2)";
    progressColor = "text-blue-400";
  } else if (status === EscrowStatus.SELLER_CONFIRMED_ITEM) {
    progressText = seller.hasFunded ? "Seller Confirmed & Funded (1/2)" : "Seller Confirmed Item (Awaiting Funds)";
    progressColor = "text-blue-400";
  } else if (status === EscrowStatus.ACTIVE || status === EscrowStatus.AWAITING_PARTICIPANT_ACTION) {
     if (buyer.hasFunded && seller.hasFunded) {
        progressText = "Fully Funded (2/2)";
        progressColor = "text-green-400";
     } else if (buyer.hasFunded) {
        progressText = "Buyer Funded (1/2)";
        progressColor = "text-blue-400";
     } else if (seller.hasFunded) {
        progressText = "Seller Funded (1/2)";
        progressColor = "text-blue-400";
     }
  } else if (status === EscrowStatus.COMPLETED_RELEASED || status === EscrowStatus.COMPLETED_REFUNDED || status === EscrowStatus.COMPLETED_SPLIT) {
    progressText = "Funding Completed";
    progressColor = "text-green-400";
  } else if (status === EscrowStatus.CANCELLED_UNFUNDED || status === EscrowStatus.TIMELOCK_DEFAULT_TRIGGERED) {
    progressText = "Funding Not Applicable";
    progressColor = "text-gray-500";
  }

  if (!progressText) return null;

  return (
    <p className={`text-xs mt-1 ${progressColor} flex items-center`}>
        {progressText}
    </p>
  );
}

export const EscrowCard: React.FC<EscrowCardProps> = ({ escrow, currentUser, onDelete }) => {
  const userRole = getParticipant(escrow, currentUser.id);
  const otherPartyId = userRole === 'buyer' ? escrow.seller.id : escrow.buyer.id;
  const otherPartyUsername = otherPartyId === 'mock_other_party_id' ? 'OtherParty123' : 
    (userRole === 'buyer' ? escrow.seller.id : escrow.buyer.id).substring(0,8) + '...';

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden transform hover:scale-[1.02] transition-transform duration-200 ease-in-out flex flex-col justify-between">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-teal-400 truncate" title={escrow.title}>
            {escrow.title || `Escrow ID: ${escrow.id.substring(0,8)}`}
          </h3>
          <StatusIndicator status={escrow.status} />
        </div>
        <p className="text-sm text-gray-400 mb-1 flex items-center">
          <Users size={14} className="mr-1.5 text-gray-500" /> With: <span className="font-medium text-gray-300 ml-1">{otherPartyUsername}</span> 
          <span className="ml-1">({userRole === 'buyer' ? 'You are Buyer' : 'You are Seller'})</span>
        </p>
        <p className="text-2xl font-bold text-white mb-1 flex items-center">
            <DollarSign size={22} className="mr-1.5 text-gray-500" />{escrow.amountXMR} <span className="text-sm font-normal text-gray-400 ml-1">XMR</span>
        </p>
        <FundingProgressIndicator escrow={escrow} />
        <p className="text-xs text-gray-500 mt-2 mb-3 truncate" title={escrow.description}>
          {escrow.description}
        </p>
        <div className="mb-3">
          <EscrowTimer escrow={escrow} size="small" />
        </div>
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
