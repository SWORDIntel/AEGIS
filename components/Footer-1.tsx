
import React from 'react';
import { Activity } from 'lucide-react'; 

interface FooterProps {
  transactionsHandled: number;
}

export const Footer: React.FC<FooterProps> = ({ transactionsHandled }) => {
  return (
    <footer className="bg-gray-800 text-gray-400 p-4 shadow-inner mt-auto">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center text-sm">
        <div className="flex items-center text-xs sm:text-sm mb-2 sm:mb-0">
          <Activity size={16} className="mr-2 text-teal-400" />
          <span>Transactions Handled: {transactionsHandled.toLocaleString()}</span>
        </div>
        <div className="text-center sm:text-right">
          <p>&copy; {new Date().getFullYear()} Aegis Protocol.</p>
          <p className="text-xs mt-1">
            All operations are processed according to protocol rules.
          </p>
        </div>
      </div>
    </footer>
  );
};