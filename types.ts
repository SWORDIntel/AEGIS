
export enum EscrowStatus {
  PENDING_FUNDING = 'Pending Funding',
  BUYER_FUNDED = 'Buyer Funded', 
  SELLER_CONFIRMED_ITEM = 'Seller Confirmed Item', 
  AWAITING_PARTICIPANT_ACTION = 'Awaiting Participant Action',
  ACTIVE = 'Active / Funded', 
  DISPUTE_INITIATED = 'Dispute Initiated',
  EVIDENCE_SUBMISSION = 'Evidence Submission Phase', // Kept for potential future granularity
  ARBITER_REVIEW = 'Arbiter Review',
  RESOLUTION_REACHED = 'Resolution Reached', 
  COMPLETED_RELEASED = 'Completed - Funds Released',
  COMPLETED_REFUNDED = 'Completed - Funds Refunded',
  COMPLETED_SPLIT = 'Completed - Funds Split',
  CANCELLED_UNFUNDED = 'Cancelled (Unfunded)',
  TIMELOCK_DEFAULT_TRIGGERED = 'Timelock Default Triggered',
}

export enum DefaultOutcome {
  BUYER_REFUND = 'Full Refund to Buyer',
  SPLIT_50_50 = '50/50 Split (Buyer/Seller)',
  SELLER_FAVOR = 'Full Release to Seller (Rare Default)',
}

export interface ChatMessage {
  id: string;
  escrowId: string;
  senderId: string; 
  senderUsername: string;
  text: string;
  timestamp: string; // ISO string
  isEvidence?: boolean; 
}

export interface EscrowParticipant {
  id: string; 
  role: 'buyer' | 'seller';
  hasFunded: boolean; 
  hasConfirmed: boolean; 
}

export type ArbiterRuling = 'buyer' | 'seller' | 'split' | null;

export interface Escrow {
  id:string;
  title: string; 
  description: string;
  amountXMR: number;
  initiatorId: string; 
  buyer: EscrowParticipant;
  seller: EscrowParticipant;
  arbiterId: string; 
  status: EscrowStatus;
  defaultOutcome: DefaultOutcome;
  timerDurationHours: number; 
  creationDate: string; // ISO string
  lastUpdateDate: string; // ISO string
  multiSigAddress: string; 
  chatLog: ChatMessage[];
  evidenceLinks?: { participantId: string; link: string; description: string }[];
  disputeReason?: string;
  resolutionDetails?: string; 
  arbiterInvolved: boolean;
  arbiterRuling: ArbiterRuling;
}

export interface UserSettings {
  useTor: boolean;
  moneroNodeUrl: string;
}
export interface UserProfile {
  id: string;
  username: string;
  moneroPrivateKey: string; 
  moneroPublicKey: string; 
  reputationScore: number; 
  settings: UserSettings;
}

// Defines the shape of the object used to create a new escrow.
// Omits fields that are auto-generated or derived during creation.
export type AddEscrowInput = Omit<Escrow, 'id' | 'creationDate' | 'lastUpdateDate' | 'status' | 'chatLog' | 'arbiterInvolved' | 'arbiterId' | 'multiSigAddress' | 'buyer' | 'seller' | 'arbiterRuling'> & {
  buyerId: string;
  sellerId: string;
  title: string; 
  description: string;
  amountXMR: number;
  defaultOutcome: DefaultOutcome;
  timerDurationHours: number;
  initiatorId: string;
};

// Defines the function signature for adding an escrow.
export type AddEscrowHandler = (newEscrowFields: AddEscrowInput) => void;

// Notification System Types
export type NotificationType = 'info' | 'success' | 'error' | 'warning';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number; 
}

export type AddNotificationHandler = (message: string, type: NotificationType) => void;
