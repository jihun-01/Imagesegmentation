import React from 'react';

/**
 * 재사용 가능한 페이드 알림 컴포넌트
 * @param {boolean} show - 알림 표시 여부
 * @param {string} message - 표시할 메시지
 * @param {string} type - 알림 타입 ('success' 또는 'error')
 * @param {string} position - 알림 위치 ('top', 'bottom', 기본값: 'bottom')
 * @param {function} onClose - 알림 닫기 콜백
 */
const FadeAlert = ({ 
  show, 
  message, 
  type = 'success', 
  position = 'bottom',
  onClose 
}) => {
  if (!show) return null;

  // 위치별 CSS 클래스
  const positionClasses = {
    top: 'fixed top-4 left-1/2 transform -translate-x-1/2',
    bottom: 'fixed bottom-16 left-1/2 transform -translate-x-1/2'
  };

  // 타입별 스타일
  const typeStyles = {
    success: {
      bgColor: 'bg-green-50',
      iconColor: 'text-black',
      titleColor: 'text-black font-bold',
      messageColor: 'text-gray-600',
      title: '성공'
    },
    error: {
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
      titleColor: 'text-red-500',
      messageColor: 'text-red-500',
      title: '실패'
    }
  };

  const currentStyle = typeStyles[type] || typeStyles.success;

  return (
    <div className={`${positionClasses[position]} z-50 max-w-sm w-full mx-auto p-4`}>
      <div className={`transition-opacity duration-500 ease-in ${show ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`flex items-center p-4 rounded-lg ${currentStyle.bgColor}`}>
          <div className="flex-shrink-0">
            {type === 'success' ? (
              <svg className={`w-5 h-5 ${currentStyle.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            ) : (
              <svg className={`w-5 h-5 ${currentStyle.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            )}
          </div>
          <div className="ml-3 flex-1">
            <span className={`font-medium ${currentStyle.titleColor}`}>
              {currentStyle.title}
            </span>
            <p className={`mt-1 text-sm ${currentStyle.messageColor}`}>
              {message}
            </p>
          </div>
          {/* 닫기 버튼 (선택사항) */}
          {onClose && (
            <button 
              onClick={onClose}
              className={`ml-2 ${currentStyle.iconColor} hover:opacity-70 transition-opacity`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FadeAlert; 