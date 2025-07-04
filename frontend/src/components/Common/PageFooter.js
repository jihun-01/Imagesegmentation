import React from 'react';

const PageFooter = ({ children, className = '' }) => (
  <div className={`w-full bg-white border-t border-gray-100 p-4 flex gap-3 rounded-b-2xl mt-auto ${className}`}>
    {children}
  </div>
);

export default PageFooter; 