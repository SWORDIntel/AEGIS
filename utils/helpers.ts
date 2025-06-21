
import { Escrow, UserProfile, GetTransfersParams, MoneroGetTransfersResponse, MoneroTransaction, BroadcastTxResponse } from '../types';

// Basic ID generator (replace with a robust library like UUID in a real app)
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const getParticipant = (escrow: Escrow, userId: string): 'buyer' | 'seller' | 'observer' => {
  if (escrow.buyer.id === userId) return 'buyer';
  if (escrow.seller.id === userId) return 'seller';
  return 'observer';
};

// Helper to get the other participant
export const getOtherParticipantId = (escrow: Escrow, currentUserId: string): string | undefined => {
  if (escrow.buyer.id === currentUserId) return escrow.seller.id;
  if (escrow.seller.id === currentUserId) return escrow.buyer.id;
  return undefined;
};

export const getOtherParticipantUsername = (escrow: Escrow, currentUser: UserProfile, allUsersMock: UserProfile[]): string => {
    const otherId = escrow.buyer.id === currentUser.id ? escrow.seller.id : escrow.buyer.id;
    // In a real app, you'd fetch this. For now, if it's not the current user, assume a generic name or fetch from a mock list.
    if (otherId === 'other_party_id_default') return 'OtherParty123'; // Default name
    const otherUser = allUsersMock.find(u => u.id === otherId);
    return otherUser ? otherUser.username : "Unknown Participant";
};

// Crypto Helpers for Mnemonic Encryption/Decryption

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const getPasswordKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000, 
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptMnemonic = async (mnemonic: string, password: string): Promise<string> => {
  if (!crypto.subtle) {
    throw new DOMException("Web Crypto API not supported in this browser.", "NotSupportedError");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard IV size
  const key = await getPasswordKey(password, salt);
  const enc = new TextEncoder();
  const encodedMnemonic = enc.encode(mnemonic);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedMnemonic
  );

  // Store as salt:iv:ciphertext for easy parsing
  return `${bufferToBase64(salt.buffer)}:${bufferToBase64(iv.buffer)}:${bufferToBase64(ciphertext)}`;
};

export const decryptMnemonic = async (encryptedData: string, password: string): Promise<string> => {
   if (!crypto.subtle) {
    throw new DOMException("Web Crypto API not supported in this browser.", "NotSupportedError");
  }
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error("Invalid encrypted data format. Expected salt:iv:ciphertext.");

    const salt = new Uint8Array(base64ToBuffer(parts[0])); // Converted to Uint8Array
    const iv = new Uint8Array(base64ToBuffer(parts[1])); // Converted to Uint8Array for consistency, though ArrayBuffer is also BufferSource
    const ciphertext = base64ToBuffer(parts[2]);

    const key = await getPasswordKey(password, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption process failed:", error);
    // Provide a user-friendly error. Avoid exposing too much detail about the crypto error.
    throw new Error("Decryption failed. This could be due to an incorrect password or corrupted data.");
  }
};


// Simulated Monero RPC get_transfers
export const getWalletTransfers = async (
  rpcUrl: string,
  params: GetTransfersParams
): Promise<MoneroGetTransfersResponse> => {
  console.log("Initiating get_transfers call to:", rpcUrl, "with params:", params);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

  // Generate some transactions
  const nowSeconds = Math.floor(Date.now() / 1000);
  const generatedTransactions: MoneroTransaction[] = [
    {
      txid: "tx_in_" + generateId().slice(0,8),
      type: "in",
      amount: 2500000000000, // 2.5 XMR (piconeros)
      fee: 0,
      timestamp: nowSeconds - (86400 * 3), // 3 days ago
      height: 2800000,
      confirmations: 3 * 720, // approx 3 days of blocks
      note: "Payment for design work",
      payment_id: "abcdef1234567890",
      destinations: [{ address: "your_address_main_in", amount: 2500000000000 }],
    },
    {
      txid: "tx_out_" + generateId().slice(0,8),
      type: "out",
      amount: 1200000000000, // 1.2 XMR
      fee: 6000000000, // 0.006 XMR
      timestamp: nowSeconds - (86400 * 1), // 1 day ago
      height: 2800000 + (2 * 720), // approx 2 days of blocks later
      confirmations: 1 * 720,
      note: "Software license",
      destinations: [{ address: "vendor_address_xyz", amount: 1200000000000 }],
    },
    {
      txid: "tx_pending_out_" + generateId().slice(0,8),
      type: "pending",
      amount: 500000000000, // 0.5 XMR
      fee: 3000000000,
      timestamp: nowSeconds - 3600, // 1 hour ago
      height: 0, // Not confirmed
      confirmations: 0,
      note: "Pending service payment",
      destinations: [{ address: "service_provider_abc", amount: 500000000000 }],
    },
    {
      txid: "tx_pending_in_" + generateId().slice(0,8),
      type: "pending",
      amount: 750000000000, // 0.75 XMR
      fee: 0, 
      timestamp: nowSeconds - 1800, // 30 minutes ago
      height: 0,
      confirmations: 0,
      note: "Incoming payment, unconfirmed",
      destinations: [{ address: "your_address_pending_in_dest", amount: 750000000000 }],
    },
    {
      txid: "tx_pool_" + generateId().slice(0,8),
      type: "pool",
      amount: 100000000000, // 0.1 XMR
      fee: 1000000000,
      timestamp: nowSeconds - 600, // 10 minutes ago
      height: 0, // In pool
      confirmations: 0,
      note: "Incoming from tx pool",
    },
  ];
  
  const response: MoneroGetTransfersResponse = {};

  if (params.in) {
    response.in = generatedTransactions.filter(tx => tx.type === 'in' && (!params.min_height || tx.height >= params.min_height));
  }
  if (params.out) {
    response.out = generatedTransactions.filter(tx => tx.type === 'out' && (!params.min_height || tx.height >= params.min_height));
  }
  if (params.pending) {
    response.pending = generatedTransactions.filter(tx => tx.type === 'pending');
  }
  if (params.pool) {
    response.pool = generatedTransactions.filter(tx => tx.type === 'pool');
  }
   if (params.failed) {
    response.failed = [];
  }

  return response;
};

// Monero Daemon RPC Helpers

/**
 * Derives a Monero daemon RPC URL from a wallet RPC URL.
 * Assumes standard Monero ports (18081 for mainnet wallet, 18089 for testnet wallet, etc.)
 * and that daemon is running on the same host.
 * This is a common convention but might need adjustment for specific setups.
 * @param walletRpcUrl - The URL of the Monero wallet RPC server.
 * @returns The derived URL for the Monero daemon RPC server.
 */
export const getDaemonRpcUrl = (walletRpcUrl: string): string => {
  try {
    const url = new URL(walletRpcUrl);
    // Common default ports:
    // Mainnet: Wallet 18081/18082, Daemon 18081 (but often separate or via 18089 for restricted)
    // Testnet: Wallet 28081/28082, Daemon 28081 (or 28089)
    // Stagenet: Wallet 38081/38082, Daemon 38081 (or 38089)

    // A common scenario is wallet RPC on 18082 and daemon on 18081 or 18089 (restricted)
    // This function makes a basic assumption. For more robust derivation,
    // it might require configuration or knowledge of the specific network (mainnet/testnet).
    // For now, let's assume daemon is on a port commonly associated with public daemon access,
    // or the main daemon port if wallet is on a higher number.

    let daemonPort = '18081'; // Default mainnet daemon
    if (url.port === '18082' || url.port === '18083') { // Mainnet wallet (e.g. monero-wallet-rpc)
      daemonPort = '18081'; // Or 18089 for restricted public access
    } else if (url.port === '28082' || url.port === '28083') { // Testnet wallet
      daemonPort = '28081';
    } else if (url.port === '38082' || url.port === '38083') { // Stagenet wallet
      daemonPort = '38081';
    } else if (url.port === '18081') { // If wallet is already on daemon port, assume same for daemon.
      daemonPort = '18081';
    }
    // If walletRpcUrl doesn't include a common wallet port, this might not be correct.
    // A more advanced version could check hostname patterns or allow explicit daemon URL.

    return `${url.protocol}//${url.hostname}:${daemonPort}/json_rpc`;
  } catch (error) {
    console.error("Error parsing wallet RPC URL:", error);
    // Fallback or throw error, depending on desired strictness
    // For now, returning a common default if parsing fails, though this is risky.
    return 'http://127.0.0.1:18081/json_rpc';
  }
};

/**
 * Broadcasts a raw Monero transaction hex to a Monero daemon.
 * @param daemonRpcUrl - The URL of the Monero daemon RPC server (e.g., http://127.0.0.1:18081/json_rpc).
 * @param tx_as_hex - The raw transaction hex string.
 * @returns A promise that resolves with the broadcast response.
 */
export const broadcastMoneroTransaction = async (
  daemonRpcUrl: string,
  tx_as_hex: string
): Promise<BroadcastTxResponse> => {
  const endpoint = daemonRpcUrl.endsWith('/json_rpc')
    ? daemonRpcUrl.replace('/json_rpc', '/send_raw_transaction')
    : `${daemonRpcUrl}/send_raw_transaction`;

  console.log(`Broadcasting transaction to: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_as_hex: tx_as_hex,
        do_not_relay: false, // Set to true if you only want to check validity without relaying
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Broadcast failed - Network error:', response.status, errorBody);
      throw new Error(`Failed to broadcast transaction: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }

    const data = await response.json();
    console.log('Broadcast response data:', data);

    // The structure of a successful response can vary. A common one includes:
    // { "status": "OK", "tx_hash": "...", "double_spend": false, ... }
    // Or it might just be the status and other fields.
    // An error response might be:
    // { "status": "Failed", "reason": "...", ... }
    if (data.status === 'Failed' || (data.error && data.error.message)) {
        const reason = data.reason || (data.error ? data.error.message : 'Unknown reason');
        console.error('Broadcast failed - Daemon error:', reason);
        throw new Error(`Transaction broadcast rejected by daemon: ${reason}`);
    }

    // Assuming success if no explicit failure and status is OK or not "Failed"
    // A more robust check might be needed based on actual daemon responses.
    if (data.status && data.status !== "OK") {
        console.warn("Broadcast status not OK:", data.status, data);
        // Potentially throw an error here if non-OK status always means failure
    }

    return data; // This will be of type BroadcastTxResponse
  } catch (error) {
    console.error('Error broadcasting Monero transaction:', error);
    // Re-throw the error so it can be caught by the caller
    // Or return a structured error object
    throw error;
  }
};

/**
 * Simulates an emergency override for an escrow transaction.
 * This function DOES NOT interact with the Monero network.
 * It's intended for administrative purposes to manually resolve an escrow
 * by marking it as complete in favor of a specified recipient.
 *
 * @param escrowId - The ID of the escrow being overridden.
 * @param recipientRole - Who the override is "paying" ('buyer' or 'seller').
 * @param amountXMR - The amount of XMR to be "sent".
 * @param overrideReason - The reason for this emergency action.
 * @returns An object indicating the override was processed, with a simulated TXID.
 */
export const initiateEmergencyOverride = (
  escrowId: string,
  recipientRole: 'buyer' | 'seller',
  amountXMR: number,
  overrideReason: string
): { status: string; simulatedTxId: string; message: string; recipientRole: 'buyer' | 'seller'; amountXMR: number; reason: string } => {
  const simulatedTxId = `OVERRIDE_${generateId().toUpperCase()}_${escrowId.slice(0, 4)}`;
  const message = `Emergency override processed for escrow ${escrowId}.
    Simulated ${amountXMR} XMR transaction to ${recipientRole}.
    Reason: ${overrideReason}. Simulated TXID: ${simulatedTxId}`;

  console.warn(`EMERGENCY OVERRIDE: ${message}`);

  // In a real application, this event should be securely logged for audit.
  // E.g., send to a secure logging service or admin dashboard.

  return {
    status: "OVERRIDE_SUCCESSFUL",
    simulatedTxId: simulatedTxId,
    message: message,
    recipientRole: recipientRole,
    amountXMR: amountXMR,
    reason: overrideReason,
  };
};