/**
 * API 및 캐시 설정 파일
 * 환경변수를 통한 동적 설정 관리 및 보안 강화
 */

/**
 * 동적 API 기본 URL 생성 함수
 * 환경변수 우선, 없으면 기존 로직 사용
 * @returns {string} API 기본 URL
 */
const getApiBaseUrl = () => {
  // 환경변수에서 API URL 확인
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // 기존 동적 로직 유지 (환경변수가 없는 경우)
  const hostname = window.location.hostname;
  const port = process.env.REACT_APP_API_PORT || 8000;
  
  // localhost인 경우 (PC에서 개발 시)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }
  
  // 실제 IP인 경우 (모바일에서 접속 시)
  return `http://${hostname}:${port}`;
};

// 동적으로 생성된 API 기본 URL
export const API_BASE_URL = getApiBaseUrl();

// 개발 모드 여부 확인
export const isDevelopment = process.env.NODE_ENV === 'development';

// 토큰 저장 방식 결정
const tokenStorageType = process.env.REACT_APP_TOKEN_STORAGE_TYPE || 'localStorage';

// 보안 설정
export const SECURITY_CONFIG = {
  // 토큰 저장 방식 (memory, localStorage, sessionStorage)
  tokenStorageType,
  
  // 세션 타임아웃 (밀리초)
  sessionTimeout: parseInt(process.env.REACT_APP_SESSION_TIMEOUT) || 3600000, // 1시간
  
  // 디버그 모드
  debugMode: process.env.REACT_APP_DEBUG_MODE === 'true' && isDevelopment,
  
  // XSS 방지를 위한 Content Security Policy 설정
  enableCSP: true,
  
  // 비밀번호 정책
  passwordPolicy: {
    minLength: 8,
    requireNumbers: true,
    requireSpecialChars: true,
    requireUppercase: true,
    requireLowercase: true
  }
};

/**
 * 이미지 캐시 시스템 설정
 * 메모리, 로컬스토리지, IndexedDB 캐시 옵션
 */
export const CACHE_CONFIG = {
  maxMemoryItems: 50,                     // 메모리 캐시 최대 항목 수
  cacheDuration: 24 * 60 * 60 * 1000,     // 캐시 유지 시간 (24시간)
  storageKey: 'watchstore_img_cache',     // 로컬스토리지 키 접두사
  maxLocalStorageItems: 100,              // 로컬스토리지 최대 항목 수
  maxIndexedDBItems: 500                  // IndexedDB 최대 항목 수
}; 