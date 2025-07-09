/**
 * 비밀번호 변경 모달 컴포넌트
 */

import React, { useState } from 'react';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from './FadeAlert/FadeAlert';

function PasswordChangeModal({ isOpen, onClose, onPasswordChange }) {
  const { alertMessage, alertType, showAlert, showFadeAlert } = useFadeAlert();
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 비밀번호 데이터 변경 처리
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 비밀번호 변경 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showFadeAlert('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showFadeAlert('새 비밀번호는 최소 8자 이상이어야 합니다.', 'error');
      return;
    }

    // 비밀번호 패턴 검증
    if (!/[A-Z]/.test(passwordData.newPassword)) {
      showFadeAlert('새 비밀번호에 대문자를 포함해야 합니다.', 'error');
      return;
    }

    if (!/[a-z]/.test(passwordData.newPassword)) {
      showFadeAlert('새 비밀번호에 소문자를 포함해야 합니다.', 'error');
      return;
    }

    if (!/\d/.test(passwordData.newPassword)) {
      showFadeAlert('새 비밀번호에 숫자를 포함해야 합니다.', 'error');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(passwordData.newPassword)) {
      showFadeAlert('새 비밀번호에 특수문자를 포함해야 합니다.', 'error');
      return;
    }

    try {
      await onPasswordChange(passwordData);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      onClose();
    } catch (error) {
      // 에러 메시지가 이미 처리되어 전달됨
      showFadeAlert(error.message || '비밀번호 변경에 실패했습니다.', 'error');
    }
  };

  // 모달 닫기
  const handleClose = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />
      
      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">비밀번호 변경</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                현재 비밀번호
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                새 비밀번호
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-1 text-xs text-gray-500">
                • 최소 8자 이상 • 대문자 포함 • 소문자 포함 • 숫자 포함 • 특수문자 포함
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 버튼 */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                변경하기
              </button>
            </div>
          </form>
        </div>
      </div>

      <FadeAlert message={alertMessage} type={alertType} show={showAlert} />
    </>
  );
}

export default PasswordChangeModal; 