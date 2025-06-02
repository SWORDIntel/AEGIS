
import { Escrow, UserProfile, MoneroTransaction, GetTransfersParams, GetTransfersResponse } from '../types'; // Added MoneroTransaction, GetTransfersParams, GetTransfersResponse

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
