
import { Escrow, UserProfile, GetTransfersParams, MoneroGetTransfersResponse, MoneroTransaction } from '../types';

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