
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

// Monero Transaction and RPC Related Types

export interface MoneroSubaddressIndex {
  major: number; // Account index
  minor: number; // Address index within the account
}

export interface MoneroTransactionDestination {
  address: string;
  amount: number; // Atomic units
}

export type MoneroTransferType = "in" | "out" | "pending" | "failed" | "pool";

export interface MoneroTransaction {
  txid: string;           // Transaction ID (hash)
  type: MoneroTransferType; // Type of transfer
  amount: number;         // Primary amount for this part of the transaction (atomic units)
  fee: number;            // Transaction fee (atomic units)
  height: number;         // Block height of confirmation (0 if not mined or pending)
  timestamp: number;      // POSIX timestamp of confirmation or submission
  unlock_time: number;    // Number of blocks until safely spendable

  address?: string;        // The other party's address for outgoing, or own subaddress for incoming.
  payment_id: string;     // Payment ID (often "0000000000000000" if not set)
  note: string;           // User-provided note

  confirmations?: number;  // Number of confirmations (can be 0 for pending/pool)
  locked?: boolean;        // Whether the transaction/outputs are locked

  subaddr_index?: MoneroSubaddressIndex;       // Own subaddress index involved
  subaddr_indices?: MoneroSubaddressIndex[]; // Multiple own subaddresses involved (less common for a single tx entry)

  amounts?: number[];      // If a single entry represents multiple distinct amounts (e.g. to multiple subaddresses in one tx)

  // Primarily for outgoing transfers
  destinations?: MoneroTransactionDestination[];

  // Optional fields that might be present
  double_spend_seen?: boolean;
  suggested_confirmations_threshold?: number;

  // Fields that might be more relevant for incoming transfers if enriched later,
  // but `get_transfers` provides them per transfer entry
  key_image?: string;
  label?: string;          // Label of the subaddress
  spent?: boolean;         // If this specific output (for incoming) has been spent
}

export interface GetTransfersParams {
  in?: boolean;
  out?: boolean;
  pending?: boolean;
  failed?: boolean;
  pool?: boolean;
  filter_by_height?: boolean;
  min_height?: number;
  max_height?: number;
  account_index?: number;
  subaddr_indices?: number[]; // Array of minor indices if account_index is specified
  all_accounts?: boolean;
}

export interface GetTransfersResponse {
  in?: MoneroTransaction[];
  out?: MoneroTransaction[];
  pending?: MoneroTransaction[];
  failed?: MoneroTransaction[];
  pool?: MoneroTransaction[];
}

export interface BroadcastTxResponse {
  success: boolean;
  txHash?: string; // Not directly from /send_raw_transaction, but kept for potential client-side derivation placeholder
  status?: string; // e.g., "OK", "Failed", "BUSY"
  reason?: string; // More detailed error message from the daemon
  double_spend?: boolean;
  fee_too_low?: boolean;
  invalid_input?: boolean;
  invalid_output?: boolean;
  low_mixin?: boolean;
  not_rct?: boolean;
  not_relayed?: boolean;
  overspend?: boolean;
  too_big?: boolean;
  // Additional fields that might be present in the daemon's response for /send_raw_transaction
  tx_hash?: string; // This is actually the TX hash if successful and relayed, despite previous notes.
  tx_key?: string; // If relayed
  sanitized?: boolean;
  credits?: number; // If RPC payment is enabled
  top_hash?: string; // If RPC payment is enabled
}
