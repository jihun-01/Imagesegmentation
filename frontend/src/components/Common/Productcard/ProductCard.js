/**
 * 지연 로딩을 지원하는 상품 카드 컴포넌트
 * - Intersection Observer를 사용한 뷰포트 기반 지연 로딩
 * - 백엔드 API를 통한 이미지 리사이징
 * - 다층 캐시 시스템 (메모리 캐시)
 * - 네트워크 에러 처리 및 폴백
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import shoppingcarticon from '../../Assets/icons/shppingcarticon.png';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../../utils/config';
import { useAuth } from '../../../contexts/AuthContext';
import { addToCart, toggleWishlist } from '../../../utils/api';
import { tokenStorage } from '../../../utils/security';
import { formatPrice } from '../../../utils/formatUtils';
import useFadeAlert from '../../Hooks/useFadeAlert';
import FadeAlert from '../FadeAlert/FadeAlert';

// 전역 이미지 캐시 저장소 (모든 ProductCard 인스턴스가 공유)
const imageCache = new Map();
// 현재 처리 중인 이미지 추적 세트 (중복 요청 방지)
const processingImages = new Set();

/**
 * 지연 로딩을 지원하는 상품 카드 컴포넌트
 * @param {string} image - 원본 이미지 URL
 * @param {string} name - 상품명
 * @param {string} price - 상품 가격
 * @param {string|number} id - 상품 고유 ID
 * @param {boolean} isVisible - 가시성 여부 (가상화에서 사용)
 * @param {string[]} wishlistIds - 찜 목록에 포함된 상품 ID 목록
 * @param {function} onWishlistChange - 찜 목록 변경 시 호출될 콜백 함수
 * @param {function} onCartChange - 장바구니 변경 시 호출될 콜백 함수
 */
const ProductCard = ({ image, name, price, id, isVisible = false, wishlistIds = [], onWishlistChange, onCartChange }) => {
  const { isLoggedIn } = useAuth();
  const { alertMessage, alertType, showAlert, showFadeAlert } = useFadeAlert();
  
  // 상태 관리
  const [resizedImageUrl, setResizedImageUrl] = useState(null);    // 리사이징된 이미지 URL
  const [isLoading, setIsLoading] = useState(false);              // 로딩 상태

  const [shouldLoad, setShouldLoad] = useState(false);            // 로딩 시작 여부
  const isWishlisted = wishlistIds?.includes(id);
  const [isAddingToCart, setIsAddingToCart] = useState(false);    // 장바구니 추가 중
  const [isTogglingWish, setIsTogglingWish] = useState(false);    // 찜 토글 중
  
  // 참조 관리
  const isMountedRef = useRef(true);                              // 컴포넌트 마운트 상태 추적
  const cardRef = useRef(null);                                   // 카드 DOM 요소 참조

  /**
   * Intersection Observer를 사용한 뷰포트 기반 지연 로딩
   * - 카드가 화면에 보이기 50px 전에 로딩 시작
   * - 성능 최적화를 위해 한번만 로딩하도록 제어
   */
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // 뷰포트에 진입하고 아직 로딩하지 않은 경우에만 로딩 시작
          if (entry.isIntersecting && !shouldLoad) {
            setShouldLoad(true);
          }
        });
      },
      {
        root: null,                    // 뷰포트를 루트로 사용
        rootMargin: '50px',           // 50px 전에 미리 로딩 시작
        threshold: 0.1                // 10% 보일 때 트리거
      }
    );

    observer.observe(cardRef.current);

    // 컴포넌트 언마운트 시 Observer 정리
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [shouldLoad, name]);

  /**
   * 이미지 URL을 기반으로 고유한 캐시 키 생성
   * @param {string} imageUrl - 원본 이미지 URL
   * @returns {string} 32자리 알파벳+숫자 캐시 키
   */
  const getCacheKey = (imageUrl) => {
    return btoa(imageUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  };

  /**
   * 백엔드 서버 연결 상태 확인
   * @returns {boolean} 서버 연결 가능 여부
   */
  const testServerConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  /**
   * 백엔드 API를 통한 이미지 리사이징 및 캐싱 처리
   * - 캐시 우선 확인으로 중복 요청 방지
   * - 동시 요청 처리 방지
   * - 네트워크 타임아웃 및 에러 처리
   * @param {string} originalImageUrl - 원본 이미지 URL
   */
  const resizeImage = async (originalImageUrl) => {
    const cacheKey = getCacheKey(originalImageUrl);
    
    // 1단계: 캐시에서 먼저 확인
    if (imageCache.has(cacheKey)) {
      const cachedUrl = imageCache.get(cacheKey);
      setResizedImageUrl(cachedUrl);
      setIsLoading(false);
      return;
    }

    // 2단계: 이미 처리 중인 이미지인지 확인 (중복 요청 방지)
    if (processingImages.has(cacheKey)) {
      await waitForProcessing(cacheKey);
      if (imageCache.has(cacheKey)) {
        setResizedImageUrl(imageCache.get(cacheKey));
        setIsLoading(false);
        return;
      }
    }

    // 3단계: 새로운 요청 시작
    processingImages.add(cacheKey);      // 처리 중 상태로 마킹
    setIsLoading(true);                  // 로딩 상태 시작

    try {
      // 4단계: 서버 연결 상태 확인
      const serverConnected = await testServerConnection();
      if (!serverConnected) {
        throw new Error('서버에 연결할 수 없습니다');
      }

      // 5단계: 원본 이미지를 Blob으로 변환
      const imageResponse = await fetch(originalImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`이미지 로드 실패: ${imageResponse.status}`);
      }
      const imageBlob = await imageResponse.blob();
      
      // 6단계: FormData 생성하여 백엔드로 전송 준비
      const formData = new FormData();
      formData.append('file', imageBlob, `${cacheKey}.jpg`);

      // 7단계: 백엔드 리사이징 API 호출
      // 모바일 환경을 고려한 30초 타임아웃 설정
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${API_BASE_URL}/resize-image`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`이미지 리사이징 요청 실패: ${response.status}`);
      }

      // 8단계: 응답 처리 및 URL 생성
      const result = await response.json();
      const resizedUrl = `${API_BASE_URL}${result.url}`;
      
      // 컴포넌트가 언마운트된 경우 처리 중단
      if (!isMountedRef.current) {
        return;
      }
      
      // 9단계: 백그라운드 처리 대기 (필요한 경우)
      if (result.status !== "완료") {
        await waitForImage(resizedUrl);
      }
      
      // 10단계: 성공 시 상태 업데이트 및 캐싱
      if (isMountedRef.current) {
        setResizedImageUrl(resizedUrl);
        imageCache.set(cacheKey, resizedUrl);    // 캐시에 저장

      }
    } catch (err) {
      // 에러 발생 시 폴백 처리
      if (isMountedRef.current) {
        setResizedImageUrl(originalImageUrl);    // 원본 이미지로 폴백
      }
    } finally {
      // 처리 완료 후 정리 작업
      processingImages.delete(cacheKey);         // 처리 중 상태 제거
      if (isMountedRef.current) {
        setIsLoading(false);                     // 로딩 상태 종료
      }
    }
  };

  /**
   * 다른 컴포넌트에서 동일한 이미지를 처리 중일 때 대기
   * @param {string} cacheKey - 캐시 키
   * @param {number} maxWait - 최대 대기 시간 (밀리초)
   */
  const waitForProcessing = async (cacheKey, maxWait = 10000) => {
    const startTime = Date.now();
    while (processingImages.has(cacheKey) && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  /**
   * 백그라운드에서 이미지가 준비될 때까지 폴링 대기
   * @param {string} imageUrl - 확인할 이미지 URL
   * @param {number} maxRetries - 최대 재시도 횟수
   * @param {number} delay - 재시도 간격 (밀리초)
   */
  const waitForImage = async (imageUrl, maxRetries = 15, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      // 컴포넌트가 언마운트된 경우 중단
      if (!isMountedRef.current) {
        return;
      }

      try {
        const response = await fetch(imageUrl, { 
          method: 'HEAD',              // HEAD 요청으로 파일 존재 여부만 확인
          cache: 'no-cache' 
        });
        
        if (response.ok) {
          return;                      // 이미지 준비 완료
        }
      } catch (error) {
        // 에러 시 기본값 유지
      }
      
      // 지연 후 다시 시도
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('이미지 처리 시간 초과');
  };

  /**
   * 지연 로딩 트리거: shouldLoad가 true가 되면 이미지 리사이징 시작
   */
  useEffect(() => {
    isMountedRef.current = true;
    
    if (shouldLoad && image) {
      resizeImage(image);
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      isMountedRef.current = false;
    };
  }, [shouldLoad, image]);

  /**
   * 장바구니에 상품 추가
   */
  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      showFadeAlert('로그인이 필요합니다.', 'error');
      return;
    }
    
    try {
      setIsAddingToCart(true);
      await addToCart(id, 1);
      showFadeAlert('장바구니에 추가되었습니다!', 'success');
      if (onCartChange) onCartChange();
    } catch (error) {
      if (error.message.includes('이미 장바구니에 있는 상품입니다')) {
        showFadeAlert('이미 장바구니에 있는 상품입니다.', 'error');
      } else {
        showFadeAlert('장바구니 추가에 실패했습니다.', 'error');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  /**
   * 찜하기 토글 (추가/제거)
   */
  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      showFadeAlert('로그인이 필요합니다.', 'error');
      return;
    }
    
    try {
      setIsTogglingWish(true);
      const result = await toggleWishlist(id);
      
      if (result.action === 'added') {
        showFadeAlert('찜목록에 추가되었습니다!', 'success');
        if (onWishlistChange) onWishlistChange();
      } else if (result.action === 'removed') {
        showFadeAlert('찜목록에서 제거되었습니다!', 'success');
        if (onWishlistChange) onWishlistChange();
      }
    } catch (error) {
      showFadeAlert('찜하기에 실패했습니다.', 'error');
    } finally {
      setIsTogglingWish(false);
    }
  };

  /**
   * 상품 카드 렌더링
   * - 지연 로딩 상태에 따른 조건부 렌더링
   * - 이미지 로드 에러 시 원본 이미지로 폴백
   */
  return (
    <div ref={cardRef} className="h-72 bg-white rounded-2xl shadow-md p-4 flex flex-col relative">
      {/* 페이드 알림 */}
      <FadeAlert 
        show={showAlert}
        message={alertMessage}
        type={alertType}
        position="bottom"
      />

      {/* 상품 상세 페이지 링크 */}
      <Link to={`/product/${id}`}>
        <div className="w-40 h-40 rounded-xl mb-4 overflow-hidden bg-gray-100 flex items-center justify-center">
          {!shouldLoad ? (
            // 뷰포트 진입 전: 플레이스홀더 표시
            <div className="text-center">
              <div className="w-8 h-8 bg-gray-300 rounded mx-auto mb-2"></div>
              <p className="text-xs text-gray-400">로딩 대기 중...</p>
            </div>
          ) : isLoading ? (
            // 로딩 중: 스피너 애니메이션 표시
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2">처리 중...</p>
            </div>
          ) : (
            // 로딩 완료: 실제 이미지 표시
            <img 
              src={resizedImageUrl || image} 
              alt={name} 
              className="w-full h-full object-cover"
              onError={() => {
                // 이미지 로드 실패 시 원본으로 폴백
                if (resizedImageUrl !== image) {
                  setResizedImageUrl(image);
                }
              }}
            />
          )}
        </div>
      </Link>
      
      {/* 상품 정보 */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="line-clamp-2 text-gray-700 text-sm leading-tight mb-1">{name}</div>
        <div className="text-xs font-bold mb-3">{formatPrice(price)}</div>
      </div>
      
      {/* 액션 버튼들 */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        {/* 찜하기 버튼 */}
        <button 
          onClick={handleToggleWishlist}
          disabled={isTogglingWish}
          className={`rounded-xl p-2 transition-colors ${
            isWishlisted 
              ? 'bg-red-100 text-red-500' 
              : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
          } ${isTogglingWish ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isTogglingWish ? (
            <div className="w-5 h-5 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
          ) : (
            <svg className="w-5 h-5" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
        
        {/* 장바구니 버튼 */}
        <button 
          onClick={handleAddToCart}
          disabled={isAddingToCart}
          className={`bg-blue-100 text-blue-600 rounded-xl p-2 hover:bg-blue-200 transition-colors ${
            isAddingToCart ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isAddingToCart ? (
            <div className="w-5 h-5 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
          ) : (
            <img src={shoppingcarticon} alt="장바구니" className='w-5 h-5' />
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
