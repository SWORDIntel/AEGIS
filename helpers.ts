
import { Escrow, UserProfile } from './types'; // Corrected import path

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
