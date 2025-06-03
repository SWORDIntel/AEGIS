
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Cpu, Database, Wifi, BarChartHorizontal } from 'lucide-react';

interface SystemMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const generateChartData = (length: number, max: number) => {
  return Array.from({ length }, () => Math.floor(Math.random() * max));
};

const MAX_HISTORY = 30; // Number of data points for graphs

const Chart: React.FC<{ data: number[]; color: string; label: string; unit: string; icon: React.ReactNode }> = ({ data, color, label, unit, icon }) => {
  const maxValue = Math.max(...data, 1); // Avoid division by zero, ensure at least 1 for proper scaling
  const currentValue = data[data.length - 1] || 0;

  return (
    <div className="mb-6 p-4 bg-gray-700 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-md font-semibold text-gray-200 flex items-center">
          {icon} {label}
        </h4>
        <span className={`text-lg font-bold ${color}`}>{currentValue}{unit}</span>
      </div>
      <div className="flex items-end h-24 bg-gray-750 p-2 rounded w-full overflow-hidden" role="img" aria-label={`${label} usage graph`}>
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 mx-px transition-all duration-150 ease-linear"
            style={{ 
              height: `${(value / maxValue) * 100}%`, 
              backgroundColor: color,
              minWidth: '4px'
            }}
            title={`${label} data point: ${value}${unit}`}
          ></div>
        ))}
      </div>
    </div>
  );
};


export const SystemMonitorModal: React.FC<SystemMonitorModalProps> = ({ isOpen, onClose }) => {
  const [cpuData, setCpuData] = useState(() => generateChartData(MAX_HISTORY, 100));
  const [ramData, setRamData] = useState(() => generateChartData(MAX_HISTORY, 100)); // Assuming RAM as % for simplicity
  const [networkData, setNetworkData] = useState(() => generateChartData(MAX_HISTORY, 50)); // Network in Mbps

  useEffect(() => {
    if (!isOpen) return;

    const intervalId = setInterval(() => {
      setCpuData(prev => [...prev.slice(1), Math.floor(Math.random() * 100)]);
      setRamData(prev => [...prev.slice(1), Math.floor(Math.random() * 100)]);
      setNetworkData(prev => [...prev.slice(1), Math.floor(Math.random() * 50)]);
    }, 2000); // Update every 2 seconds

    return () => clearInterval(intervalId);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[70]"> {/* Increased z-index */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-teal-400 flex items-center">
            <BarChartHorizontal size={28} className="mr-2" /> System Performance
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <Chart 
            data={cpuData} 
            color="#2DD4BF"  // teal-400
            label="CPU Usage" 
            unit="%"
            icon={<Cpu size={20} className="mr-2 text-teal-400" />}
          />
          <Chart 
            data={ramData} 
            color="#60A5FA" // blue-400
            label="RAM Usage" 
            unit="%"
            icon={<Database size={20} className="mr-2 text-blue-400" />}
          />
          <Chart 
            data={networkData} 
            color="#FBBF24" // amber-400
            label="Network I/O" 
            unit=" Mbps"
            icon={<Wifi size={20} className="mr-2 text-amber-400" />}
          />
          <p className="text-xs text-gray-500 text-center">
            Data is dynamically generated for illustrative purposes.
          </p>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};