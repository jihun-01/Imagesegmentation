/**
 * 사용자 인증 상태 관리 Context
 * 로그인/로그아웃 상태, 사용자 정보 등을 전역으로 관리
 * 보안 강화된 토큰 관리 적용
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  loginUser, 
  logoutUser, 
  getCurrentUser, 
  isAuthenticated, 
  getStoredUserInfo 
} from '../utils/api';
import { tokenStorage } from '../utils/security';

// Context 생성
const AuthContext = createContext();

// Context Provider 컴포넌트
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

    // 컴포넌트 마운트 시 저장된 인증 정보 확인
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // localStorage에서 인증 상태 확인
        if (isAuthenticated()) {
          const storedUser = getStoredUserInfo();
          
          if (storedUser) {
            setUser(storedUser);
            setIsLoggedIn(true);
            
            // 백그라운드에서 서버 토큰 유효성 검증 (실패해도 로그아웃하지 않음)
            try {
              const currentUser = await getCurrentUser();
              setUser(currentUser);
              tokenStorage.setToken('user_info', JSON.stringify(currentUser));
            } catch (error) {
              // 토큰이 유효하지 않으면 로그아웃 처리
              handleLogout();
            }
          } else {
            handleLogout();
          }
        }
      } catch (error) {
        // 인증 상태 확인 실패 시 로그아웃 처리
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // 로그인 처리
  const handleLogin = async (email, password) => {
    try {
      const response = await loginUser(email, password);
      setUser(response.user);
      setIsLoggedIn(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setIsLoggedIn(false);
  };

  // 사용자 정보 업데이트
  const updateUserInfo = (updatedUser) => {
    setUser(updatedUser);
    tokenStorage.setToken('user_info', JSON.stringify(updatedUser));
  };

  // Context 값
  const value = {
    user,
    isLoggedIn,
    loading,
    login: handleLogin,
    logout: handleLogout,
    updateUser: updateUserInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook for using Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 