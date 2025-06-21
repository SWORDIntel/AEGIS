
import { Escrow, UserProfile, MoneroTransaction, GetTransfersParams, GetTransfersResponse, BroadcastTxResponse } from '../types'; // Added MoneroTransaction, GetTransfersParams, GetTransfersResponse, BroadcastTxResponse

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
    if (otherId === 'mock_other_party_id') return 'OtherParty123'; // Placeholder
    const otherUser = allUsersMock.find(u => u.id === otherId);
    return otherUser ? otherUser.username : "Unknown Participant";
};

// Crypto Utilities
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes for AES-GCM

/**
 * Derives a key from a password using PBKDF2.
 * @param password The password to derive the key from.
 * @param salt The salt to use for key derivation.
 * @returns A Promise that resolves to a CryptoKey.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a mnemonic phrase using a password.
 * @param mnemonic The mnemonic phrase to encrypt.
 * @param password The password to use for encryption.
 * @returns A Promise that resolves to a string containing the salt, IV, and ciphertext, base64 encoded.
 */
export async function encryptMnemonic(mnemonic: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const mnemonicBuffer = new TextEncoder().encode(mnemonic);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    mnemonicBuffer
  );

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  let base64Encoded: string;
  if (typeof Buffer !== 'undefined') {
    base64Encoded = Buffer.from(combined).toString('base64');
  } else {
    const binaryString = Array.from(combined).map(byte => String.fromCharCode(byte)).join('');
    base64Encoded = btoa(binaryString);
  }
  return base64Encoded;
}

/**
 * Decrypts an encrypted mnemonic phrase using a password.
 * @param encryptedData The base64 encoded string containing the salt, IV, and ciphertext.
 * @param password The password to use for decryption.
 * @returns A Promise that resolves to the original mnemonic phrase.
 */
export async function decryptMnemonic(encryptedData: string, password: string): Promise<string> {
  let combined: Uint8Array;
  if (typeof Buffer !== 'undefined') {
    combined = new Uint8Array(Buffer.from(encryptedData, 'base64'));
  } else {
    const binaryString = atob(encryptedData);
    combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
  }

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed. Invalid password or corrupted data.');
  }
}

// Monero Wallet RPC Utilities

/**
 * Calls the get_transfers method on a Monero wallet RPC.
 * @param rpcUrl The URL of the monero-wallet-rpc endpoint (e.g., http://127.0.0.1:18082/json_rpc).
 * @param params Parameters for the get_transfers method.
 * @returns A Promise that resolves to the GetTransfersResponse.
 */
export async function getWalletTransfers(
  rpcUrl: string,
  params: GetTransfersParams
): Promise<GetTransfersResponse> {
  const requestBody = {
    jsonrpc: "2.0",
    id: "0",
    method: "get_transfers",
    params: params,
  };

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    if (responseData.error) {
      throw new Error(`RPC Error: ${responseData.error.message} (Code: ${responseData.error.code})`);
    }

    // The result field itself is expected to be the GetTransfersResponse
    // The structure is like: { "in": [...], "pool": [...] }
    // So, we directly return responseData.result
    if (!responseData.result) {
        // This case might happen if the RPC call is successful but returns an empty result (e.g. no transfers)
        // or if the structure is unexpectedly different.
        // Depending on strictness, one might throw an error or return a default/empty response.
        // For now, assume an empty result is valid and means no transfers matched.
        return { }; // Or return responseData.result if it exists but is empty e.g. {}
    }

    return responseData.result as GetTransfersResponse;

  } catch (error) {
    console.error('Error fetching wallet transfers:', error);
    if (error instanceof Error) {
      throw error; // Re-throw the error to be handled by the caller
    }
    throw new Error('An unknown error occurred while fetching wallet transfers.');
  }
}

/**
 * Broadcasts a raw Monero transaction to a daemon.
 * @param daemonRpcUrl The URL of the Monero daemon's RPC endpoint (e.g., http://127.0.0.1:18081).
 * @param tx_as_hex The raw transaction hex string.
 * @returns A Promise that resolves to the BroadcastTxResponse.
 */
export async function broadcastMoneroTransaction(
  daemonRpcUrl: string,
  tx_as_hex: string
): Promise<BroadcastTxResponse> {
  const endpoint = daemonRpcUrl.endsWith('/') ? daemonRpcUrl + 'send_raw_transaction' : daemonRpcUrl + '/send_raw_transaction';
  const payload = {
    tx_as_hex: tx_as_hex,
    do_not_relay: false, // Explicitly set to false, though it's the default
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Try to get more details from response body if possible for non-2xx errors
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (textError) {
        // Ignore if can't read body
      }
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }

    const data = await response.json();

    // Interpret the response from /send_raw_transaction
    // See: https://monerodocs.org/json-rpc/send_raw_transaction/
    const success = data.status === "OK" && !data.double_spend && !data.fee_too_low &&
                    !data.invalid_input && !data.invalid_output && !data.low_mixin &&
                    !data.not_rct && !data.overspend && !data.too_big;

    return {
      success: success,
      txHash: data.tx_hash, // Corrected to use tx_hash as per updated interface
      status: data.status,
      reason: data.reason,
      double_spend: data.double_spend,
      fee_too_low: data.fee_too_low,
      invalid_input: data.invalid_input,
      invalid_output: data.invalid_output,
      low_mixin: data.low_mixin,
      not_rct: data.not_rct,
      not_relayed: data.not_relayed, // This indicates if it was NOT relayed despite status OK
      overspend: data.overspend,
      too_big: data.too_big,
      // Include other fields from BroadcastTxResponse that are in data
      tx_key: data.tx_key,
      sanitized: data.sanitized,
      credits: data.credits,
      top_hash: data.top_hash,
    };

  } catch (error) {
    console.error('Error broadcasting Monero transaction:', error);
    if (error instanceof Error) {
      // Prepend a more specific message if it's a generic fetch error (e.g. network down)
      if (error.message.startsWith('Network response was not ok') || error.message.startsWith('HTTP error!')) {
         throw error;
      }
      if (error.name === 'TypeError' && error.message.includes('fetch')) { // For Node.js like fetch errors for network issues
        throw new Error(`Network error or daemon unreachable: ${error.message}`);
      }
       throw new Error(`Failed to broadcast transaction: ${error.message}`);
    }
    throw new Error('An unknown error occurred while broadcasting the transaction.');
  }
}

/**
 * Attempts to derive a Monero daemon RPC URL from a wallet RPC URL.
 * Replaces common wallet ports with common daemon ports.
 * @param walletRpcUrl - The URL of the Monero wallet RPC.
 * @returns A guessed daemon RPC URL.
 */
export function getDaemonRpcUrl(walletRpcUrl: string): string {
  if (!walletRpcUrl) return ''; // Or throw an error, or return a default

  // Common wallet RPC ports and their typical daemon RPC counterparts
  const portMappings: Record<string, string> = {
    // Standard mainnet wallet ports
    '18082': '18081', // Default JSON RPC
    '18083': '18081', // Often used for restricted RPC
    // Standard testnet wallet ports
    '28082': '28081', // Testnet JSON RPC
    '28083': '28081', // Testnet restricted RPC
    // Standard stagenet wallet ports
    '38082': '38081', // Stagenet JSON RPC
    '38083': '38081', // Stagenet restricted RPC
    // Less common, but possible for stagenet/testnet if daemon uses 18089/18092 etc.
    // For simplicity, we primarily target the default daemon port 18081 (or testnet/stagenet equivalents)
    // If daemon is on a custom port not paired conventionally with wallet, this basic guess might not work.
    // Community examples:
    '48082': '48081', // Another possible testnet/stagenet wallet RPC port
  };

  try {
    const url = new URL(walletRpcUrl);
    const currentPort = url.port;

    if (portMappings[currentPort]) {
      url.port = portMappings[currentPort];
      return url.toString();
    }

    // If port is not in mappings, try a common pattern: subtract 1 from wallet port
    // This is a heuristic and might not always be correct.
    const numericPort = parseInt(currentPort, 10);
    if (!isNaN(numericPort) && numericPort > 1000) { // Basic sanity check for numeric port
        // Example: 18082 -> 18081, 28082 -> 28081
        if (numericPort % 10 === 2) {
            url.port = (numericPort - 1).toString();
            return url.toString();
        }
    }

    // Fallback: if no specific wallet port is matched or derived,
    // assume the provided URL might be a base path and the daemon is on a standard port relative to that host.
    // Or, it might be the daemon URL itself. For send_raw_transaction, we don't append /json_rpc.
    // This function's primary goal is port transformation. If it can't do that, return original.
    // The caller (`broadcastMoneroTransaction`) will append `/send_raw_transaction`.
    // If walletRpcUrl was already a daemon URL (e.g. http://127.0.0.1:18081), it should pass through.
    return walletRpcUrl;

  } catch (e) {
    console.error("Error parsing wallet RPC URL for daemon URL conversion:", e);
    // If URL parsing fails, return the original URL; it might be a simple hostname
    // or already a daemon URL that's not a full http/https URL.
    return walletRpcUrl;
  }
}
