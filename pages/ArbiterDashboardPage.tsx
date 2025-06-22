
import React, { useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Escrow, UserProfile, AddNotificationHandler, EscrowStatus } from '../types';
import { formatDate } from '../utils/helpers';
import { Gavel, Eye, ShieldAlert, CheckCircle2, Clock, Briefcase, DollarSign, Users, Activity } from 'lucide-react'; // Added Activity

interface ArbiterEscrowCardProps {
  escrow: Escrow;
}

// const MOCK_ARBITER_ID = 'arbiter_MVP_001'; // Moved inside component

const ArbiterEscrowCard: React.FC<ArbiterEscrowCardProps> = ({ escrow }) => {
  const getStatusColor = (status: EscrowStatus): string => {
    switch (status) {
      case EscrowStatus.PENDING_FUNDING: return 'text-yellow-400';
      case EscrowStatus.ACTIVE:
      case EscrowStatus.BUYER_FUNDED:
      case EscrowStatus.SELLER_CONFIRMED_ITEM:
      case EscrowStatus.AWAITING_PARTICIPANT_ACTION: return 'text-blue-400';
      case EscrowStatus.DISPUTE_INITIATED:
      case EscrowStatus.ARBITER_REVIEW:
      case EscrowStatus.EVIDENCE_SUBMISSION: return 'text-red-400';
      case EscrowStatus.COMPLETED_RELEASED:
      case EscrowStatus.COMPLETED_REFUNDED:
      case EscrowStatus.COMPLETED_SPLIT: return 'text-green-400';
      case EscrowStatus.CANCELLED_UNFUNDED: return 'text-gray-500';
      case EscrowStatus.TIMELOCK_DEFAULT_TRIGGERED: return 'text-purple-500';
      default: return 'text-gray-300';
    }
  };
  
  const StatusIcon = ({ status }: { status: EscrowStatus }) => {
    switch (status) {
      case EscrowStatus.DISPUTE_INITIATED:
      case EscrowStatus.ARBITER_REVIEW:
      case EscrowStatus.EVIDENCE_SUBMISSION: return <ShieldAlert size={18} className={`mr-2 ${getStatusColor(status)}`} />;
      case EscrowStatus.COMPLETED_RELEASED:
      case EscrowStatus.COMPLETED_REFUNDED:
      case EscrowStatus.COMPLETED_SPLIT: return <CheckCircle2 size={18} className={`mr-2 ${getStatusColor(status)}`} />;
      case EscrowStatus.PENDING_FUNDING: return <Clock size={18} className={`mr-2 ${getStatusColor(status)}`} />;
      default: return <Briefcase size={18} className={`mr-2 ${getStatusColor(status)}`} />;
    }
  };

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden transform hover:scale-[1.02] transition-transform duration-200 ease-in-out">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-teal-400 truncate flex items-center" title={escrow.title}>
             <Briefcase size={20} className="mr-2 text-teal-500" />
            {escrow.title || `Escrow ID: ${escrow.id.substring(0,8)}`}
          </h3>
           <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(escrow.status)} bg-gray-700`}>
            <StatusIcon status={escrow.status} />
            {escrow.status}
          </span>
        </div>

        <div className="space-y-2 text-sm mb-4">
            <p className="text-gray-400 flex items-center"><DollarSign size={16} className="mr-1.5 text-gray-500" />Amount: <span className="font-medium text-white ml-1">{escrow.amountXMR} XMR</span></p>
            <p className="text-gray-400 flex items-center"><Users size={16} className="mr-1.5 text-gray-500" />Buyer: <span className="font-medium text-gray-300 ml-1 truncate" title={escrow.buyer.id}>{escrow.buyer.id}</span></p>
            <p className="text-gray-400 flex items-center"><Users size={16} className="mr-1.5 text-gray-500" />Seller: <span className="font-medium text-gray-300 ml-1 truncate" title={escrow.seller.id}>{escrow.seller.id}</span></p>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>Created: {formatDate(escrow.creationDate)}</p>
          <p>Last Update: {formatDate(escrow.lastUpdateDate)}</p>
        </div>
      </div>
      <div className="bg-gray-750 px-5 py-3 flex justify-end items-center">
         <Link
          to={`/escrow/${escrow.id}?view=arbiter`} 
          className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
        >
          <Eye size={16} className="mr-1" /> View & Manage Dispute
        </Link>
      </div>
    </div>
  );
};

interface SimulatedActivityAnimationProps {
  width?: number;
  height?: number;
}

const SimulatedActivityAnimation: React.FC<SimulatedActivityAnimationProps> = ({ width = 300, height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: Math.random() * 0.5 - 0.25,
      speedY: Math.random() * 0.5 - 0.25,
      color: `rgba(0, 255, 255, ${Math.random() * 0.5 + 0.2})`, // Teal-ish, varying opacity
    }));

    const lines: { from: typeof particles[0]; to: typeof particles[0]; opacity: number }[] = [];

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      // Draw particles
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x > width || p.x < 0) p.speedX *= -1;
        if (p.y > height || p.y < 0) p.speedY *= -1;
      });

      // Occasionally create new lines
      if (Math.random() < 0.05 && lines.length < 20) {
        const p1 = particles[Math.floor(Math.random() * particles.length)];
        const p2 = particles[Math.floor(Math.random() * particles.length)];
        if (p1 !== p2) {
          lines.push({ from: p1, to: p2, opacity: 1 });
        }
      }

      // Draw and update lines
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        ctx.strokeStyle = `rgba(0, 128, 128, ${line.opacity * 0.5})`; // Darker teal for lines
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(line.from.x, line.from.y);
        ctx.lineTo(line.to.x, line.to.y);
        ctx.stroke();
        line.opacity -= 0.01;
        if (line.opacity <= 0) {
          lines.splice(i, 1);
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }, [width, height]);

  return <canvas ref={canvasRef} className="rounded-md opacity-70"></canvas>;
};


interface ArbiterDashboardPageProps {
  escrows: Escrow[];
  currentUser: UserProfile;
  addNotification: AddNotificationHandler;
}

export const ArbiterDashboardPage: React.FC<ArbiterDashboardPageProps> = ({ escrows, currentUser, addNotification }) => {
  const MOCK_ARBITER_ID = 'arbiter_MVP_001'; // Defined inside the component
  
  const assignedEscrows = useMemo(() => {
    if (currentUser.id !== MOCK_ARBITER_ID) {
      return [];
    }
    return escrows.filter(escrow => escrow.arbiterId === currentUser.id && escrow.arbiterInvolved);
  }, [escrows, currentUser, MOCK_ARBITER_ID]); // Added MOCK_ARBITER_ID to deps

  if (currentUser.id !== MOCK_ARBITER_ID) {
    return (
      <div className="p-6 bg-gray-800 shadow-xl rounded-lg text-center">
        <ShieldAlert size={48} className="mx-auto text-yellow-400 mb-4" />
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">Access Denied</h1>
        
        <div className="my-8 p-4 border border-gray-700 rounded-lg bg-gray-850 relative overflow-hidden">
            <h2 className="text-xl font-semibold text-teal-300 mb-3 flex items-center justify-center">
                <Activity size={22} className="mr-2" /> Arbiter Network Activity
            </h2>
            <div className="flex justify-center items-center h-[200px] bg-gray-900 rounded-md">
                 <SimulatedActivityAnimation width={300} height={180} />
            </div>
            <p className="text-xs text-gray-500 mt-3">
                This animation represents data flow and processing within the arbiter system.
            </p>
        </div>

        <p className="text-gray-300 mb-6">This dashboard is for designated arbiters only.</p>
        <Link 
            to="/dashboard" 
            className="bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2 px-4 rounded-lg shadow-md inline-flex items-center transition-colors duration-150 ease-in-out"
        >
            Return to Main Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-gray-800 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-teal-400 flex items-center">
          <Gavel size={32} className="mr-3" /> Arbiter Dashboard
        </h1>
        <span className="text-gray-400">Managing {assignedEscrows.length} active dispute(s)</span>
      </div>

      {assignedEscrows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignedEscrows.map(escrow => (
            <ArbiterEscrowCard key={escrow.id} escrow={escrow} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-800 rounded-lg shadow">
          <Briefcase size={64} className="mx-auto text-gray-500 mb-4" />
          <p className="text-2xl text-gray-400">No active disputes assigned to you.</p>
          <p className="text-gray-500 mt-2">When a user initiates a dispute in an escrow you are assigned to, it will appear here.</p>
        </div>
      )}
    </div>
  );
};