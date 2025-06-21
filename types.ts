
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
  totpEnabled?: boolean;
  totpSecretMock?: string;
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

// Monero RPC Interaction Types
export interface MoneroTransactionDestination {
  amount: number;
  address: string;
}

export interface MoneroTransaction {
  txid: string;
  type: 'in' | 'out' | 'pool' | 'pending' | 'failed'; // Standard Monero RPC transfer types
  amount: number; // Amount in piconeros
  fee: number; // Fee in piconeros
  timestamp: number; // Unix timestamp (seconds)
  height: number; // Block height, 0 or negative for unconfirmed/pool
  confirmations: number;
  payment_id?: string;
  note?: string; // User-provided note
  destinations?: MoneroTransactionDestination[]; // For 'out' or 'pending' 'out'
  // Other fields from get_transfers response can be added as needed
  // e.g., address, subaddr_index, double_spend_seen, unlock_time etc.
}

export interface GetTransfersParams {
  in?: boolean;
  out?: boolean;
  pool?: boolean;
  pending?: boolean;
  failed?: boolean;
  account_index?: number; // Defaults to 0 (primary account)
  filter_by_height?: boolean;
  min_height?: number;
  // subaddr_indices?: number[]; // For specific subaddresses
}

export interface MoneroGetTransfersResponse {
  in?: MoneroTransaction[];
  out?: MoneroTransaction[];
  pool?: MoneroTransaction[];
  pending?: MoneroTransaction[];
  failed?: MoneroTransaction[];
  // Other fields like "denied" or "unconfirmed_out" can be added if needed
}

/**
 * Represents the typical response from the Monero daemon's /send_raw_transaction endpoint.
 * The fields can vary slightly based on success or failure.
 */
export interface BroadcastTxResponse {
  status: string; // "OK", "Failed", or other statuses.
  tx_hash?: string; // Hash of the transaction if successfully broadcasted.
  reason?: string; // Reason for failure, if any.
  double_spend?: boolean;
  fee_too_low?: boolean;
  invalid_input?: boolean;
  invalid_output?: boolean;
  low_mixin?: boolean;
  not_relayed?: boolean;
  overspend?: boolean;
  too_big?: boolean;
  tx_extra_too_big?: boolean;
  // The daemon might also return an error object for more critical failures
  error?: {
    code: number;
    message: string;
  };
  // The following are less common directly in send_raw_transaction but good to be aware of
  credits?: number; // Cost of the RPC call (if applicable)
  top_hash?: string; // Hash of the highest block known to the daemon
  untrusted?: boolean; // If the daemon is not fully synced or in a bad state
}

/**
 * Represents the response from the Monero daemon's `get_fee_estimate` RPC method.
 * This is typically nested under a `result` field in the full JSON-RPC response.
 */
export interface MoneroFeeEstimateResponse {
  status: string; // "OK" or error status.
  fee: number; // Estimated fee per byte in piconeros.
  fees?: number[]; // Estimated fees per byte for different priority levels (slow, normal, fast, fastest). Array indices correspond to priorities.
  quantization_mask: number; // Fee quantization mask. Fees should be a multiple of this value.
  fee_mask?: number; // Alias for quantization_mask (older daemons).
  priority_mask?: number; // Mask for priorities available.
  slow_fee?: number; // Fee for "slow" priority (older daemons, may not be present)
  fast_fee?: number; // Fee for "fast" priority (older daemons, may not be present)
  normal_fee?: number; // Fee for "normal" priority (older daemons, may not be present)
  error?: { // Only present if the overall JSON-RPC call had an error, not for "status: Failed" type issues within the result.
    code: number;
    message: string;
  };
  // Additional fields that might be present
  credits?: number;
  top_hash?: string;
  untrusted?: boolean;
}