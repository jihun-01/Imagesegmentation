/**
 * 이미지 리사이징을 위한 공통 Hook
 * ProductCard, Cart, Wishlist 등에서 재사용 가능
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../../utils/config';

// 전역 이미지 캐시 저장소 (모든 컴포넌트가 공유)
const imageCache = new Map();
// 현재 처리 중인 이미지 추적 세트 (중복 요청 방지)
const processingImages = new Set();

/**
 * 이미지 리사이징 Hook
 * @param {string} originalImageUrl - 원본 이미지 URL
 * @param {boolean} shouldResize - 리사이징 실행 여부 (기본값: true)
 * @returns {object} { resizedImageUrl, isLoading, error }
 */
export const useImageResize = (originalImageUrl, shouldResize = true) => {
  const [resizedImageUrl, setResizedImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const isMountedRef = useRef(true);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * 이미지 URL을 기반으로 고유한 캐시 키 생성
   * @param {string} imageUrl - 원본 이미지 URL
   * @returns {string} 32자리 알파벳+숫자 캐시 키
   */
  const getCacheKey = useCallback((imageUrl) => {
    return btoa(imageUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }, []);

  /**
   * 백엔드 서버 연결 상태 확인
   * @returns {boolean} 서버 연결 가능 여부
   */
  const testServerConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  /**
   * 처리 완료 대기 함수
   */
  const waitForProcessing = useCallback(async (cacheKey, maxWait = 10000) => {
    const startTime = Date.now();
    while (processingImages.has(cacheKey) && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, []);

  /**
   * 이미지 로드 대기 함수
   */
  const waitForImage = useCallback(async (imageUrl, maxRetries = 15, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // 계속 재시도
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return false;
  }, []);

  /**
   * 백엔드 API를 통한 이미지 리사이징
   */
  const resizeImage = useCallback(async (originalImageUrl) => {
    if (!originalImageUrl) return;
    
    const cacheKey = getCacheKey(originalImageUrl);
    
    // 1단계: 캐시에서 먼저 확인
    if (imageCache.has(cacheKey)) {
      const cachedUrl = imageCache.get(cacheKey);
      setResizedImageUrl(cachedUrl);
      setIsLoading(false);
      return;
    }

    // 2단계: 이미 처리 중인 이미지인지 확인
    if (processingImages.has(cacheKey)) {
      await waitForProcessing(cacheKey);
      if (imageCache.has(cacheKey)) {
        setResizedImageUrl(imageCache.get(cacheKey));
        setIsLoading(false);
        return;
      }
    }

    // 3단계: 새로운 요청 시작
    processingImages.add(cacheKey);
    setIsLoading(true);

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
      
      // 6단계: FormData 생성하여 백엔드로 전송
      const formData = new FormData();
      formData.append('file', imageBlob, `${cacheKey}.jpg`);

      // 7단계: 백엔드 리사이징 API 호출
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

      // 8단계: 응답 처리
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
        imageCache.set(cacheKey, resizedUrl);
        setError(false);
      }
    } catch (error) {
      setError('이미지 리사이징에 실패했습니다.');
      setResizedImageUrl(originalImageUrl); // 원본 이미지로 폴백
    } finally {
      processingImages.delete(cacheKey);
      setIsLoading(false);
    }
  }, [getCacheKey, testServerConnection, waitForProcessing, waitForImage]);

  // 이미지 리사이징 실행
  useEffect(() => {
    if (shouldResize && originalImageUrl) {
      resizeImage(originalImageUrl);
    } else if (!shouldResize) {
      setResizedImageUrl(originalImageUrl);
    }
  }, [originalImageUrl, shouldResize, resizeImage]);

  return {
    resizedImageUrl: resizedImageUrl || originalImageUrl,
    isLoading,
    error
  };
};

export default useImageResize; 