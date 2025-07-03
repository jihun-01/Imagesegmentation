import { useState } from 'react';

/**
 * 페이드 알림을 관리하는 커스텀 훅
 * @returns {Object} 알림 상태와 제어 함수들
 */
const useFadeAlert = () => {
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [showAlert, setShowAlert] = useState(false);

  /**
   * 페이드 알림 표시 함수
   * @param {string} message - 표시할 메시지
   * @param {string} type - 알림 타입 ('success' 또는 'error')
   * @param {number} duration - 알림 표시 시간 (밀리초, 기본값: 3000)
   */
  const showFadeAlert = (message, type = 'success', duration = 3000) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    
    // 지정된 시간 후 페이드 아웃
    setTimeout(() => {
      setShowAlert(false);
    }, duration);
  };

  /**
   * 알림 수동 닫기
   */
  const hideAlert = () => {
    setShowAlert(false);
  };

  return {
    alertMessage,
    alertType,
    showAlert,
    showFadeAlert,
    hideAlert
  };
};

export default useFadeAlert; 