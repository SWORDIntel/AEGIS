
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-gray-400 text-center p-4 shadow-inner mt-auto">
      <p>&copy; {new Date().getFullYear()} Aegis Protocol. For demonstration purposes only.</p>
      <p className="text-xs mt-1">
        This is a conceptual UI. No real transactions or cryptographic operations are performed.
      </p>
    </footer>
  );
};
    