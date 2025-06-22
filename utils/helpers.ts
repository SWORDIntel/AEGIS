import { Escrow, UserProfile, GetTransfersParams, MoneroGetTransfersResponse, MoneroTransaction, BroadcastTxResponse, MoneroFeeEstimateResponse } from '../types';

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

    const salt = new Uint8Array(base64ToBuffer(parts[0]));
    const iv = new Uint8Array(base64ToBuffer(parts[1]));
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
    throw new Error("Decryption failed. This could be due to an incorrect password or corrupted data.");
  }
};


// Simulated Monero RPC get_transfers
export const getWalletTransfers = async (
  rpcUrl: string,
  params: GetTransfersParams
): Promise<MoneroGetTransfersResponse> => {
  console.log("Initiating get_transfers call to:", rpcUrl, "with params:", params);
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

  const nowSeconds = Math.floor(Date.now() / 1000);
  const generatedTransactions: MoneroTransaction[] = [
    {
      txid: "tx_in_" + generateId().slice(0,8),
      type: "in",
      amount: 2500000000000,
      fee: 0,
      timestamp: nowSeconds - (86400 * 3),
      height: 2800000,
      confirmations: 3 * 720,
      note: "Payment for design work",
      payment_id: "abcdef1234567890",
      destinations: [{ address: "your_address_main_in", amount: 2500000000000 }],
    },
    {
      txid: "tx_out_" + generateId().slice(0,8),
      type: "out",
      amount: 1200000000000,
      fee: 6000000000,
      timestamp: nowSeconds - (86400 * 1),
      height: 2800000 + (2 * 720),
      confirmations: 1 * 720,
      note: "Software license",
      destinations: [{ address: "vendor_address_xyz", amount: 1200000000000 }],
    },
    {
      txid: "tx_pending_out_" + generateId().slice(0,8),
      type: "pending",
      amount: 500000000000,
      fee: 3000000000,
      timestamp: nowSeconds - 3600,
      height: 0,
      confirmations: 0,
      note: "Pending service payment",
      destinations: [{ address: "service_provider_abc", amount: 500000000000 }],
    },
    {
      txid: "tx_pending_in_" + generateId().slice(0,8),
      type: "pending",
      amount: 750000000000,
      fee: 0, 
      timestamp: nowSeconds - 1800,
      height: 0,
      confirmations: 0,
      note: "Incoming payment, unconfirmed",
      destinations: [{ address: "your_address_pending_in_dest", amount: 750000000000 }],
    },
    {
      txid: "tx_pool_" + generateId().slice(0,8),
      type: "pool",
      amount: 100000000000,
      fee: 1000000000,
      timestamp: nowSeconds - 600,
      height: 0,
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

export const getDaemonRpcUrl = (walletRpcUrl: string): string => {
  try {
    const url = new URL(walletRpcUrl);
    
    let daemonPort = '18081'; // Default mainnet daemon
    if (url.port === '18082' || url.port === '18083') {
      daemonPort = '18081';
    } else if (url.port === '28082' || url.port === '28083') {
      daemonPort = '28081';
    } else if (url.port === '38082' || url.port === '38083') {
      daemonPort = '38081';
    } else if (url.port === '18081') {
      daemonPort = '18081';
    }

    return `${url.protocol}//${url.hostname}:${daemonPort}/json_rpc`;
  } catch (error) {
    console.error("Error parsing wallet RPC URL:", error);
    return 'http://127.0.0.1:18081/json_rpc';
  }
};

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
        do_not_relay: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Broadcast failed - Network error:', response.status, errorBody);
      throw new Error(`Failed to broadcast transaction: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }

    const data = await response.json();
    console.log('Broadcast response data:', data);

    if (data.status === 'Failed' || (data.error && data.error.message)) {
        const reason = data.reason || (data.error ? data.error.message : 'Unknown reason');
        console.error('Broadcast failed - Daemon error:', reason);
        throw new Error(`Transaction broadcast rejected by daemon: ${reason}`);
    }

    if (data.status && data.status !== "OK") {
        console.warn("Broadcast status not OK:", data.status, data);
    }

    return data;
  } catch (error) {
    console.error('Error broadcasting Monero transaction:', error);
    throw error;
  }
};

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

  return {
    status: "OVERRIDE_SUCCESSFUL",
    simulatedTxId: simulatedTxId,
    message: message,
    recipientRole: recipientRole,
    amountXMR: amountXMR,
    reason: overrideReason,
  };
};

export const getMoneroFeeEstimate = async (
  daemonRpcUrl: string,
  grace_blocks?: number
): Promise<MoneroFeeEstimateResponse> => {
  const endpoint = daemonRpcUrl.endsWith('/json_rpc')
    ? daemonRpcUrl
    : daemonRpcUrl.replace(/\/$/, '') + '/json_rpc';

  console.log(`Fetching fee estimate from: ${endpoint}`);

  try {
    const requestBody: { jsonrpc: string; id: string; method: string; params?: any } = {
      jsonrpc: '2.0',
      id: '0',
      method: 'get_fee_estimate',
    };

    if (typeof grace_blocks === 'number') {
      requestBody.params = { grace_blocks };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Fee estimate failed - Network error:', response.status, errorBody);
      throw new Error(`Failed to fetch fee estimate: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }

    const data = await response.json();
    console.log('Fee estimate response data:', data);

    if (data.error) {
      console.error('Fee estimate failed - Daemon error:', data.error.message);
      throw new Error(`Failed to fetch fee estimate: ${data.error.message} (Code: ${data.error.code})`);
    }
    
    if (!data.result || data.result.status !== "OK") {
        const reason = data.result ? data.result.status : "Unknown reason; result missing or status not OK.";
        console.error('Fee estimate unsuccessful:', reason, data.result);
        throw new Error(`Fee estimation was not successful: ${reason}`);
    }

    return data.result as MoneroFeeEstimateResponse;
  } catch (error) {
    console.error('Error fetching Monero fee estimate:', error);
    throw error;
  }
};