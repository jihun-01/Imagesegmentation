/**
 * 보안 관련 유틸리티 함수들
 * XSS 방지, 입력 검증, 토큰 관리 등
 */

import { SECURITY_CONFIG } from './config';

/**
 * 메모리 기반 토큰 저장소
 * XSS 공격을 방지하기 위해 localStorage 대신 메모리에 저장
 */
class MemoryTokenStorage {
  constructor() {
    this.tokens = new Map();
    this.timers = new Map();
  }

  /**
   * 토큰 저장
   * @param {string} key - 토큰 키
   * @param {string} value - 토큰 값
   * @param {number} expiresIn - 만료 시간 (밀리초)
   */
  setItem(key, value, expiresIn = SECURITY_CONFIG.sessionTimeout) {
    // 기존 타이머 제거
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // 토큰 저장
    this.tokens.set(key, {
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiresIn
    });

    // 자동 만료 타이머 설정
    const timer = setTimeout(() => {
      this.removeItem(key);
    }, expiresIn);

    this.timers.set(key, timer);
  }

  /**
   * 토큰 조회
   * @param {string} key - 토큰 키
   * @returns {string|null} 토큰 값 또는 null
   */
  getItem(key) {
    const tokenData = this.tokens.get(key);
    
    if (!tokenData) {
      return null;
    }

    // 만료 확인
    if (Date.now() > tokenData.expiresAt) {
      this.removeItem(key);
      return null;
    }

    return tokenData.value;
  }

  /**
   * 토큰 제거
   * @param {string} key - 토큰 키
   */
  removeItem(key) {
    this.tokens.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * 모든 토큰 제거
   */
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.tokens.clear();
    this.timers.clear();
  }
}

// 메모리 토큰 저장소 인스턴스
const memoryStorage = new MemoryTokenStorage();

/**
 * 보안 토큰 스토리지 관리자
 * 설정에 따라 메모리 또는 localStorage 사용
 */
export class SecureTokenStorage {
  constructor() {
    this.storageType = SECURITY_CONFIG.tokenStorageType;
  }

  /**
   * 토큰 저장
   * @param {string} key - 토큰 키
   * @param {string} value - 토큰 값
   */
  setToken(key, value) {
    switch (this.storageType) {
      case 'memory':
        memoryStorage.setItem(key, value);
        break;
      case 'sessionStorage':
        sessionStorage.setItem(key, value);
        break;
      case 'localStorage':
      default:
        // localStorage 사용 시 XSS 공격 위험 있음
        localStorage.setItem(key, value);
        break;
    }
  }

  /**
   * 토큰 조회
   * @param {string} key - 토큰 키
   * @returns {string|null} 토큰 값
   */
  getToken(key) {
    let value;
    
    switch (this.storageType) {
      case 'memory':
        value = memoryStorage.getItem(key);
        break;
      case 'sessionStorage':
        value = sessionStorage.getItem(key);
        break;
      case 'localStorage':
      default:
        value = localStorage.getItem(key);
        break;
    }
    
    return value;
  }

  /**
   * 토큰 제거
   * @param {string} key - 토큰 키
   */
  removeToken(key) {
    switch (this.storageType) {
      case 'memory':
        memoryStorage.removeItem(key);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(key);
        break;
      case 'localStorage':
      default:
        localStorage.removeItem(key);
        break;
    }
  }

  /**
   * 모든 토큰 제거
   */
  clearAllTokens() {
    switch (this.storageType) {
      case 'memory':
        memoryStorage.clear();
        break;
      case 'sessionStorage':
        sessionStorage.clear();
        break;
      case 'localStorage':
      default:
        // localStorage의 경우 우리 앱의 키만 제거
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('access_token') || key.includes('user_info')) {
            localStorage.removeItem(key);
          }
        });
        break;
    }
  }
}

/**
 * XSS 방지를 위한 HTML 문자열 escape
 * @param {string} str - escape할 문자열
 * @returns {string} escape된 문자열
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * 이메일 형식 검증
 * @param {string} email - 검증할 이메일
 * @returns {boolean} 유효성 여부
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 비밀번호 강도 검증
 * @param {string} password - 검증할 비밀번호
 * @returns {object} 검증 결과
 */
export const validatePassword = (password) => {
  const { passwordPolicy } = SECURITY_CONFIG;
  const result = {
    isValid: true,
    errors: [],
    strength: 0
  };

  // 최소 길이 확인
  if (password.length < passwordPolicy.minLength) {
    result.errors.push(`비밀번호는 최소 ${passwordPolicy.minLength}자 이상이어야 합니다.`);
    result.isValid = false;
  } else {
    result.strength += 1;
  }

  // 숫자 포함 확인
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    result.errors.push('비밀번호에 숫자를 포함해야 합니다.');
    result.isValid = false;
  } else if (/\d/.test(password)) {
    result.strength += 1;
  }

  // 대문자 포함 확인
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    result.errors.push('비밀번호에 대문자를 포함해야 합니다.');
    result.isValid = false;
  } else if (/[A-Z]/.test(password)) {
    result.strength += 1;
  }

  // 소문자 포함 확인
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    result.errors.push('비밀번호에 소문자를 포함해야 합니다.');
    result.isValid = false;
  } else if (/[a-z]/.test(password)) {
    result.strength += 1;
  }

  // 특수문자 포함 확인
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    result.errors.push('비밀번호에 특수문자를 포함해야 합니다.');
    result.isValid = false;
  } else if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    result.strength += 1;
  }

  return result;
};

/**
 * 안전한 JSON 파싱
 * @param {string} jsonString - 파싱할 JSON 문자열
 * @param {any} defaultValue - 파싱 실패 시 기본값
 * @returns {any} 파싱된 값 또는 기본값
 */
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    // JSON 파싱 실패 시 기본값 반환
    return defaultValue;
  }
};

// 전역 토큰 저장소 인스턴스
export const tokenStorage = new SecureTokenStorage(); 