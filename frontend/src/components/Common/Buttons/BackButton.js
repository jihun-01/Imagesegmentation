/**
 * 뒤로가기 버튼 컴포넌트
 * - 이전 페이지로 이동
 * - 커스터마이징 가능한 스타일
 * - 클릭 핸들러 커스터마이징 지원
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import backicon from '../../Assets/icons/backicon.png';

const BackButton = ({ 
  onClick, 
  className = '', 
  iconClassName = '',
  showIcon = true,
  children,
  ...props 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`bg-gray-100 rounded-xl p-2 shadow hover:bg-gray-200 transition ${className}`}
      {...props}
    >
      {showIcon && (
        <img 
          src={backicon} 
          alt="뒤로가기" 
          className={`w-6 h-6 ${iconClassName}`} 
        />
      )}
      {children}
    </button>
  );
};

export default BackButton; 