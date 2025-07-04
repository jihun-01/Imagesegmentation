import React from 'react';

function ConfirmModal({ show, message, onConfirm, onCancel }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-100">
        <div className="mb-4 flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-lg font-semibold text-gray-900">확인</span>
        </div>
        <div className="mb-6 text-gray-700 text-base">{message}</div>
        <div className="flex justify-end space-x-3">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            onClick={onConfirm}
          >
            확인
          </button>
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            onClick={onCancel}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal; 