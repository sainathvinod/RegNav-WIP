import React from 'react';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-6 py-4">
        {title && (
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        )}
        <div className="mt-4 flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">Status:</span>
            <span className="badge badge-success">All Systems Operational</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">API:</span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

