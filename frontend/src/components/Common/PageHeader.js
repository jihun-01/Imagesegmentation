import React from 'react';

const PageHeader = ({ title, onBack, right = null }) => (
  <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b border-gray-100 rounded-t-2xl">
    <button
      onClick={onBack}
      className="bg-gray-100 rounded-xl p-2 shadow hover:bg-gray-200 transition"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <h1 className="text-xl font-bold text-gray-800">{title}</h1>
    <div className="w-10">{right}</div>
  </div>
);

export default PageHeader; 