import React from 'react';

const CardContainer = ({ children, className = '' }) => (
  <div className={`w-full max-w-md h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden ${className}`}>
    {children}
  </div>
);

export default CardContainer; 