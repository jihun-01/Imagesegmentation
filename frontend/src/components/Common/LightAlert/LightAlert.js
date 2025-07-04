import React from 'react';

const typeConfig = {
  success: {
    color: 'bg-green-500',
    title: '성공',
    icon: (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    color: 'bg-red-500',
    title: '오류',
    icon: (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    color: 'bg-blue-500',
    title: '알림',
    icon: (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
      </svg>
    ),
  },
};

function LightAlert({ show, message, type = 'info', onClose }) {
  if (!show) return null;
  const config = typeConfig[type] || typeConfig.info;

  return (
    <div className="fixed top-8 left-1/2 z-50 transform -translate-x-1/2 max-w-sm w-full mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 ${config.color} rounded-full animate-pulse`}></div>
              <h3 className="text-lg font-medium text-gray-900">{config.title}</h3>
            </div>
            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-4 bg-gray-50">
          <div className="flex items-center space-x-2 mb-2">
            {config.icon}
            <span className="text-gray-700 text-sm">{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LightAlert; 