/**
 * API 호출 유틸리티 함수들
 * 백엔드 API와의 통신을 담당
 * 보안 강화된 토큰 관리 적용
 */

import { API_BASE_URL } from './config';
import { tokenStorage, safeJsonParse } from './security';

// API 기본 설정
const API_URL = `${API_BASE_URL}`;

/**
 * 공통 API 요청 함수
 * @param {string} endpoint - API 엔드포인트
 * @param {object} options - fetch 옵션
 * @returns {Promise} API 응답
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  // 기본 헤더 설정
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // 인증 토큰이 있으면 Authorization 헤더 추가 (보안 강화된 저장소 사용)
  const token = tokenStorage.getToken('access_token');
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config = {
    headers: defaultHeaders,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    // 응답이 성공적이지 않은 경우 에러 처리
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 상세한 에러 메시지 생성 (HTTP 상태 코드 포함)
      let errorMessage = `HTTP ${response.status}`;
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = `${response.status}: ${errorData.detail}`;
        } else if (Array.isArray(errorData.detail)) {
          // FastAPI validation 에러의 경우
          errorMessage = `${response.status}: ${errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

// ===== 인증 관련 API =====

/**
 * 회원가입
 * @param {object} userData - 사용자 가입 정보
 */
export const registerUser = async (userData) => {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

/**
 * 로그인
 * @param {string} email - 이메일
 * @param {string} password - 비밀번호
 */
export const loginUser = async (email, password) => {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ 
      email, 
      password
    }),
  });
  
  // 로그인 성공 시 토큰 저장 (보안 강화된 저장소 사용)
  if (response.access_token) {
    tokenStorage.setToken('access_token', response.access_token);
    tokenStorage.setToken('user_info', JSON.stringify(response.user));
  }
  
  return response;
};

/**
 * 로그아웃
 */
export const logoutUser = () => {
  tokenStorage.removeToken('access_token');
  tokenStorage.removeToken('user_info');
};

/**
 * 현재 사용자 정보 조회
 */
export const getCurrentUser = async () => {
  return apiRequest('/auth/me');
};

/**
 * 사용자 정보 수정
 * @param {object} updateData - 수정할 사용자 정보
 */
export const updateUser = async (updateData) => {
  return apiRequest('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
};

// ===== 상품 관련 API =====

/**
 * 상품 목록 조회
 * @param {object} params - 쿼리 파라미터 (category, search, page 등)
 */
export const getProducts = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString ? `/products?${queryString}` : '/products';
  return apiRequest(endpoint);
};

/**
 * 상품 상세 정보 조회
 * @param {number} productId - 상품 ID
 */
export const getProduct = async (productId) => {
  return apiRequest(`/products/${productId}`);
};

// ===== 장바구니 관련 API =====

/**
 * 장바구니 목록 조회
 */
export const getCartItems = async () => {
  return apiRequest('/cart');
};

/**
 * 장바구니에 상품 추가
 * @param {number} productId - 상품 ID
 * @param {number} quantity - 수량
 */
export const addToCart = async (productId, quantity = 1) => {
  return apiRequest('/cart/', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  });
};

/**
 * 장바구니 상품 수량 수정
 * @param {number} itemId - 장바구니 아이템 ID
 * @param {number} quantity - 새로운 수량
 */
export const updateCartItem = async (itemId, quantity) => {
  return apiRequest(`/cart/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
};

/**
 * 장바구니에서 상품 제거
 * @param {number} itemId - 장바구니 아이템 ID
 */
export const removeFromCart = async (itemId) => {
  return apiRequest(`/cart/${itemId}`, {
    method: 'DELETE',
  });
};

// ===== 위시리스트 관련 API =====

/**
 * 위시리스트 목록 조회
 */
export const getWishlistItems = async () => {
  return apiRequest('/wishlist');
};

/**
 * 위시리스트에 상품 추가
 * @param {number} productId - 상품 ID
 */
export const addToWishlist = async (productId) => {
  return apiRequest('/wishlist/', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
};

/**
 * 위시리스트에서 상품 제거
 * @param {number} productId - 상품 ID
 */
export const removeFromWishlist = async (productId) => {
  return apiRequest(`/wishlist/${productId}`, {
    method: 'DELETE',
  });
};

/**
 * 위시리스트 토글 (찜하기/찜 해제)
 * @param {number} productId - 상품 ID
 */
export const toggleWishlist = async (productId) => {
  return apiRequest(`/wishlist/toggle/${productId}`, {
    method: 'POST',
  });
};

// ===== 이미지 처리 API =====

/**
 * 이미지 리사이징
 * @param {File} imageFile - 이미지 파일
 * @returns {Promise<Object>} 리사이징 결과 객체 { status, url, file_id, message }
 */
export const resizeImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await fetch(`${API_URL}/resize-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '이미지 리사이징 실패');
  }

  return response.json();
};

/**
 * 이미지 세그멘테이션
 * @param {File} imageFile - 이미지 파일
 */
export const segmentImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await fetch(`${API_URL}/segment-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('이미지 세그멘테이션 실패');
  }

  return response.blob();
};

// ===== 인증 상태 확인 유틸리티 =====

/**
 * 로그인 상태 확인
 * @returns {boolean} 로그인 여부
 */
export const isAuthenticated = () => {
  const token = tokenStorage.getToken('access_token');
  return !!token;
};

/**
 * 저장된 사용자 정보 조회
 * @returns {object|null} 사용자 정보
 */
export const getStoredUserInfo = () => {
  const userInfo = tokenStorage.getToken('user_info');
  return userInfo ? safeJsonParse(userInfo) : null;
}; 