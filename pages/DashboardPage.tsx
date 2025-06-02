
import React, { useState, useMemo } from 'react';
import { Escrow, UserProfile, AddEscrowHandler, AddNotificationHandler } from '../types';
import { EscrowCard } from '../components/EscrowCard';
import { CreateEscrowModal } from '../components/modals/CreateEscrowModal';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import { PlusCircle, Search, Filter, ArrowDownUp } from 'lucide-react';

interface DashboardPageProps {
  escrows: Escrow[];
  addEscrow: AddEscrowHandler;
  updateEscrow: (updatedEscrow: Escrow, notificationMessage?: string) => void;
  deleteEscrow: (escrowId: string) => void;
  currentUser: UserProfile;
  addNotification: AddNotificationHandler;
}

type SortKey = 'creationDate' | 'amountXMR' | 'status';
type SortOrder = 'asc' | 'desc';

export const DashboardPage: React.FC<DashboardPageProps> = ({ escrows, addEscrow, deleteEscrow, currentUser, addNotification }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('creationDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [escrowToDelete, setEscrowToDelete] = useState<string | null>(null);


  const filteredAndSortedEscrows = useMemo(() => {
    return escrows
      .filter(escrow => {
        const matchesSearch = 
          escrow.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          escrow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          escrow.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          escrow.buyer.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          escrow.seller.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || escrow.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortKey === 'amountXMR') {
          comparison = a.amountXMR - b.amountXMR;
        } else if (sortKey === 'creationDate') {
          comparison = new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
        } else if (sortKey === 'status') {
          comparison = a.status.localeCompare(b.status);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [escrows, searchTerm, filterStatus, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };
  
  const handleDeleteRequest = (escrowId: string) => {
    setEscrowToDelete(escrowId);
  };

  const confirmDelete = () => {
    if (escrowToDelete) {
      deleteEscrow(escrowToDelete); // Notification for delete is handled in App.tsx's deleteEscrow
      setEscrowToDelete(null);
    }
  };

  const uniqueStatuses = useMemo(() => ['all', ...new Set(escrows.map(e => e.status))], [escrows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-gray-800 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-teal-400">My Escrows</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center transition-colors duration-150 ease-in-out"
        >
          <PlusCircle size={20} className="mr-2" /> Create New Escrow
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="p-4 bg-gray-800 rounded-lg shadow space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search escrows (title, ID, party)..."
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 pl-10 focus:ring-teal-500 focus:border-teal-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
          >
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowDownUp size={20} className="text-gray-400" />
          <select
             value={sortKey}
             onChange={(e) => handleSort(e.target.value as SortKey)}
            className="bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="creationDate">Sort by Date</option>
            <option value="amountXMR">Sort by Amount</option>
            <option value="status">Sort by Status</option>
          </select>
           <button onClick={() => handleSort(sortKey)} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600">
             {sortOrder === 'asc' ? 'Asc' : 'Desc'}
           </button>
        </div>
      </div>

      {filteredAndSortedEscrows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedEscrows.map(escrow => (
            <EscrowCard key={escrow.id} escrow={escrow} currentUser={currentUser} onDelete={handleDeleteRequest} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-gray-500">No escrows found.</p>
          {escrows.length > 0 && <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>}
        </div>
      )}

      <CreateEscrowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        addEscrow={addEscrow}
        currentUser={currentUser}
      />
       <ConfirmActionModal
        isOpen={!!escrowToDelete}
        onClose={() => setEscrowToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this escrow? This action can only be performed on unfunded escrows you initiated and cannot be undone."
        confirmButtonText="Delete Escrow"
      />
    </div>
  );
};
