/**
 * 비밀번호 변경 완료 안내 모달 컴포넌트
 */

import React from 'react';

function PasswordChangeSuccessModal({ isOpen, onConfirm }) {
  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* 헤더 */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center">비밀번호 변경 완료</h2>
          </div>

          {/* 내용 */}
          <div className="p-6">
            <p className="text-gray-600 text-center mb-6">
              비밀번호가 성공적으로 변경되었습니다.<br />
              보안을 위해 다시 로그인해주세요.
            </p>
            
            {/* 버튼 */}
            <button
              onClick={onConfirm}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              로그인 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default PasswordChangeSuccessModal; 