import React, { useState, useEffect, useCallback } from 'react';
import { Escrow, EscrowStatus } from '../types';
import { Clock } from 'lucide-react';

interface EscrowTimerProps {
  escrow: Escrow;
  size?: 'small' | 'normal';
}

const calculateTimeLeft = (creationDate: string, timerDurationHours: number) => {
  const expiryTime = new Date(creationDate).getTime() + timerDurationHours * 60 * 60 * 1000;
  const now = Date.now();
  const difference = expiryTime - now;

  let timeLeft = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMilliseconds: difference,
  };

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      totalMilliseconds: difference,
    };
  }
  return timeLeft;
};

const relevantTimerStatuses: EscrowStatus[] = [
  EscrowStatus.PENDING_FUNDING,
  EscrowStatus.BUYER_FUNDED,
  EscrowStatus.SELLER_CONFIRMED_ITEM,
  EscrowStatus.AWAITING_PARTICIPANT_ACTION,
  EscrowStatus.ACTIVE,
  EscrowStatus.DISPUTE_INITIATED,
  EscrowStatus.EVIDENCE_SUBMISSION,
  EscrowStatus.ARBITER_REVIEW,
];

export const EscrowTimer: React.FC<EscrowTimerProps> = ({ escrow, size = 'normal' }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(escrow.creationDate, escrow.timerDurationHours));

  const updateTimer = useCallback(() => {
    setTimeLeft(calculateTimeLeft(escrow.creationDate, escrow.timerDurationHours));
  }, [escrow.creationDate, escrow.timerDurationHours]);

  useEffect(() => {
    if (!relevantTimerStatuses.includes(escrow.status)) {
      return; // No timer for irrelevant statuses
    }

    updateTimer(); // Initial calculation
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [escrow.status, updateTimer]);

  if (!relevantTimerStatuses.includes(escrow.status)) {
    return null; // Don't show timer for completed, cancelled, or default-triggered escrows
  }

  if (timeLeft.totalMilliseconds <= 0) {
    return (
      <div className={`flex items-center ${size === 'small' ? 'text-xs' : 'text-sm'} text-red-400 font-medium`}>
        <Clock size={size === 'small' ? 14 : 16} className="mr-1.5" />
        Timer Expired
      </div>
    );
  }

  let timerColor = 'text-green-400';
  if (timeLeft.totalMilliseconds < (escrow.timerDurationHours * 60 * 60 * 1000) / 4) { // Less than 25% time left
    timerColor = 'text-red-400';
  } else if (timeLeft.totalMilliseconds < (escrow.timerDurationHours * 60 * 60 * 1000) / 2) { // Less than 50% time left
    timerColor = 'text-yellow-400';
  }

  const textSizeClass = size === 'small' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'small' ? 14 : 16;

  return (
    <div className={`flex items-center ${textSizeClass} ${timerColor} font-medium`}>
      <Clock size={iconSize} className="mr-1.5" />
      Time Left: {timeLeft.days > 0 && `${timeLeft.days}d `}
      {`${String(timeLeft.hours).padStart(2, '0')}h `}
      {`${String(timeLeft.minutes).padStart(2, '0')}m `}
      {`${String(timeLeft.seconds).padStart(2, '0')}s`}
    </div>
  );
};
