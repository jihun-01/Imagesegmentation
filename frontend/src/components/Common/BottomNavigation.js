/**
 * 하단 고정 네비게이션 바 컴포넌트
 * - 홈, 카테고리, 찜하기, 사용자 메뉴 제공
 * - 로그인 상태에 따른 동적 UI
 * - 찜목록 개수 표시
 */

import React from 'react';
import { Link } from 'react-router-dom';
import homeicon from '../Assets/icons/homeicon.png';
import menuicon from '../Assets/icons/listicon.png';
import likeicon from '../Assets/icons/likeicon.png';
import usericon from '../Assets/icons/usericon.png';

const BottomNavigation = ({ 
  isLoggedIn, 
  user, 
  wishlistCount = 0, 
  onLogout, 
  onCategoryClick,
  className = ''
}) => {
  return (
    <div className={`fixed bottom-0 w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-lg flex justify-around items-center py-3 ${className}`}>
      {/* 홈 버튼 */}
      <Link to="/">
        <button className="flex flex-col items-center">
          <img src={homeicon} alt="homeicon" className="w-6 h-6" />
          <span className="text-xs">홈</span>
        </button>
      </Link>
      
      {/* 카테고리 버튼 */}
      <button
        className="flex flex-col items-center"
        onClick={onCategoryClick}
      >
        <img src={menuicon} alt="menuicon" className="w-6 h-6" />
        <span className="text-xs">카테고리</span>
      </button>
      
      {/* 찜하기 버튼 */}
      <Link to="/wishlist">
        <button className="flex flex-col items-center">
          <img src={likeicon} alt="likeicon" className="w-6 h-6" />
          <span className="text-xs">
            찜하기{wishlistCount > 0 ? ` (${wishlistCount})` : ''}
          </span>
        </button>
      </Link>
      
      {/* 사용자 버튼 - 로그인 상태에 따라 다르게 표시 */}
      {isLoggedIn ? (
        <Link to="/settings">
          <button className="flex flex-col items-center">
            <img src={usericon} alt="usericon" className="w-6 h-6" />
            <span className="text-xs">{user?.name || '설정'}</span>
          </button>
        </Link>
      ) : (
        <Link to="/login">
          <button className="flex flex-col items-center">
            <img src={usericon} alt="usericon" className="w-6 h-6" />
            <span className="text-xs">로그인</span>
          </button>
        </Link>
      )}
    </div>
  );
};

export default BottomNavigation; 