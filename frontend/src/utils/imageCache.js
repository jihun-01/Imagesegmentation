/**
 * 이미지 캐싱 및 리사이징 관리 시스템
 * - 3단계 캐시 구조: 메모리 → 로컬스토리지 → IndexedDB
 * - 백엔드 API를 통한 자동 이미지 리사이징
 * - 중복 요청 방지 및 성능 최적화
 * - 캐시 용량 관리 및 자동 정리
 */

import { API_BASE_URL, CACHE_CONFIG, isDevelopment } from './config';

/**
 * 다층 이미지 캐싱 시스템 클래스
 * 성능 최적화를 위해 여러 단계의 캐시를 사용
 */
class ImageCacheManager {
  constructor() {
    // 1단계: 메모리 캐시 (가장 빠른 접근)
    this.memoryCache = new Map();
    
    // 중복 처리 방지를 위한 처리 중인 이미지 추적
    this.processingImages = new Set();
    
    // 2단계: IndexedDB 초기화 (대용량 저장)
    this.dbPromise = this.initIndexedDB();
    
    // 캐시 설정 불러오기
    this.config = CACHE_CONFIG;
    
    // 주기적 캐시 정리 시작
    this.startPeriodicCleanup();
  }

  /**
   * IndexedDB 초기화 및 스키마 설정
   * 브라우저의 영구 저장소를 사용하여 대용량 이미지 캐시 구현
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ImageCacheDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 이미지 캐시 전용 스토어 생성
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * 이미지 URL을 기반으로 고유한 캐시 키 생성
   * Base64 인코딩 후 영숫자만 추출하여 안전한 키 생성
   */
  generateCacheKey(imageUrl) {
    return btoa(imageUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  // 메모리 캐시에서 조회
  getFromMemory(key) {
    return this.memoryCache.get(key);
  }

  // 메모리 캐시에 저장
  setToMemory(key, data) {
    // 메모리 캐시 크기 제한
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, {
      ...data,
      timestamp: Date.now()
    });
  }

  // 로컬스토리지에서 조회
  getFromLocalStorage(key) {
    try {
      const cached = localStorage.getItem(`${this.config.storageKey}_${key}`);
      if (cached) {
        const data = JSON.parse(cached);
        
        // 만료 확인
        if (Date.now() - data.timestamp < this.config.cacheDuration) {
          return data;
        } else {
          // 만료된 캐시 삭제
          localStorage.removeItem(`${this.config.storageKey}_${key}`);
        }
      }
    } catch (error) {
      // 로컬스토리지 조회 실패 시 null 반환
      return null;
    }
    return null;
  }

  // 로컬스토리지에 저장
  setToLocalStorage(key, data) {
    try {
      const cacheData = {
        ...data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`${this.config.storageKey}_${key}`, JSON.stringify(cacheData));
      
      // 로컬스토리지 크기 관리
      this.cleanupLocalStorage();
    } catch (error) {
      // 로컬스토리지 저장 실패 시 무시
    }
  }

  // IndexedDB에서 조회
  async getFromIndexedDB(key) {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          if (result && Date.now() - result.timestamp < this.config.cacheDuration) {
            resolve(result);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      // IndexedDB 조회 실패 시 null 반환
      return null;
    }
  }

  // IndexedDB에 저장
  async setToIndexedDB(key, data) {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      
      const cacheData = {
        key,
        ...data,
        timestamp: Date.now()
      };
      
      store.put(cacheData);
      
      // IndexedDB 크기 관리
      this.cleanupIndexedDB();
    } catch (error) {
      // IndexedDB 저장 실패 시 무시
    }
  }

  /**
   * 3단계 캐시에서 순차적으로 데이터 조회
   * 빠른 것부터 느린 순서로 확인하여 성능 최적화
   * 
   * @param {string} imageUrl - 조회할 이미지 URL
   * @returns {Object|null} 캐시된 데이터 또는 null
   */
  async getFromCache(imageUrl) {
    const key = this.generateCacheKey(imageUrl);
    
    // 1단계: 메모리 캐시 확인 (가장 빠름)
    let cached = this.getFromMemory(key);
    if (cached) {
      return cached;
    }
    
    // 2단계: 로컬스토리지 확인 (중간 속도)
    cached = this.getFromLocalStorage(key);
    if (cached) {
      // 상위 캐시(메모리)에 복사하여 다음 접근 시 더 빠르게
      this.setToMemory(key, cached);
      return cached;
    }
    
    // 3단계: IndexedDB 확인 (느리지만 대용량)
    cached = await this.getFromIndexedDB(key);
    if (cached) {
      // 모든 상위 캐시에 복사
      this.setToMemory(key, cached);
      this.setToLocalStorage(key, cached);
      return cached;
    }
    
    return null;
  }

  /**
   * 모든 캐시 레벨에 데이터 저장
   * 계층적 캐시 구조를 통한 성능 최적화
   * 
   * @param {string} imageUrl - 저장할 이미지 URL
   * @param {Object} data - 캐시할 데이터
   */
  async setToCache(imageUrl, data) {
    const key = this.generateCacheKey(imageUrl);
    
    // 모든 캐시 레벨에 동시 저장
    this.setToMemory(key, data);
    this.setToLocalStorage(key, data);
    await this.setToIndexedDB(key, data);
  }

  // 원본 이미지 접근 가능 여부 확인
  async checkImageAccess(imageUrl) {
    try {
      const response = await fetch(imageUrl, { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      // 이미지 접근 확인 실패
      return false;
    }
  }

  // 이미지 리사이징 및 캐싱
  async resizeAndCacheImage(originalImageUrl, productName = '') {
    const key = this.generateCacheKey(originalImageUrl);
    
    // 캐시에서 확인
    const cached = await this.getFromCache(originalImageUrl);
    if (cached) {
      return {
        url: cached.resizedUrl || cached.originalUrl || originalImageUrl,
        fromCache: true,
        cacheLevel: cached.cacheLevel || 'unknown'
      };
    }

    // 이미 처리 중인지 확인
    if (this.processingImages.has(key)) {
      await this.waitForProcessing(key);
      const processedCache = await this.getFromCache(originalImageUrl);
      if (processedCache) {
        return {
          url: processedCache.resizedUrl || processedCache.originalUrl || originalImageUrl,
          fromCache: true,
          cacheLevel: 'processing'
        };
      }
    }

    // 처리 시작
    this.processingImages.add(key);

    try {
      // 먼저 원본 이미지에 직접 접근 가능한지 확인
      const canAccessOriginal = await this.checkImageAccess(originalImageUrl);
      
      if (canAccessOriginal) {
        // 원본 이미지에 직접 접근 가능한 경우
        const cacheData = {
          originalUrl: originalImageUrl,
          resizedUrl: originalImageUrl, // 원본을 그대로 사용
          productName,
          type: 'original'
        };
        
        await this.setToCache(originalImageUrl, cacheData);
        
        return {
          url: originalImageUrl,
          fromCache: false,
          type: 'original'
        };
      }
      
      // 원본에 접근할 수 없는 경우 백엔드를 통해 리사이징
      // 원본 이미지 가져오기
      const imageResponse = await fetch(originalImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`이미지 로드 실패: ${imageResponse.status}`);
      }
      
      const imageBlob = await imageResponse.blob();
      
      // 백엔드 리사이징 API 호출
      const formData = new FormData();
      formData.append('file', imageBlob, `${key}.jpg`);

      const response = await fetch(`${API_BASE_URL}/resize-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`이미지 리사이징 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      const resizedUrl = `${API_BASE_URL}${result.url}`;
      
      // 이미지가 준비될 때까지 대기
      if (result.status !== "완료") {
        await this.waitForImage(resizedUrl);
      }
      
      // 캐시에 저장
      const cacheData = {
        resizedUrl,
        originalUrl: originalImageUrl,
        productName,
        fileId: result.file_id,
        type: 'resized'
      };
      
      await this.setToCache(originalImageUrl, cacheData);
      
      return {
        url: resizedUrl,
        fromCache: false,
        fileId: result.file_id,
        type: 'resized'
      };
      
    } catch (error) {
      console.error('이미지 처리 오류:', productName, error);
      
      // 오류 발생 시 원본 이미지 반환 시도
      try {
        const fallbackData = {
          originalUrl: originalImageUrl,
          resizedUrl: originalImageUrl,
          productName,
          type: 'fallback',
          error: error.message
        };
        
        await this.setToCache(originalImageUrl, fallbackData);
        
        return {
          url: originalImageUrl,
          fromCache: false,
          type: 'fallback',
          error: error.message
        };
      } catch (fallbackError) {
        console.error('폴백 처리 실패:', fallbackError);
        throw error;
      }
    } finally {
      this.processingImages.delete(key);
    }
  }

  // 처리 완료 대기
  async waitForProcessing(key, maxWait = 10000) {
    const startTime = Date.now();
    while (this.processingImages.has(key) && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 이미지 준비 대기
  async waitForImage(imageUrl, maxRetries = 15, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(imageUrl, { 
          method: 'HEAD',
          cache: 'no-cache' 
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        // 404 오류는 예상되므로 무시
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('이미지 처리 시간 초과');
  }

  // 로컬스토리지 정리
  cleanupLocalStorage() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.storageKey)) {
          keys.push(key);
        }
      }
      
      if (keys.length > this.config.maxStorageItems) {
        // 오래된 항목부터 삭제
        const items = keys.map(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            return { key, timestamp: data.timestamp };
          } catch {
            return { key, timestamp: 0 };
          }
        }).sort((a, b) => a.timestamp - b.timestamp);
        
        const toDelete = items.slice(0, keys.length - this.config.maxStorageItems);
        toDelete.forEach(item => localStorage.removeItem(item.key));
      }
    } catch (error) {
      // 로컬스토리지 정리 실패 시 무시
    }
  }

  // IndexedDB 정리
  async cleanupIndexedDB() {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const index = store.index('timestamp');
      
      // 모든 항목 수 확인
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result > this.config.maxStorageItems) {
          // 오래된 항목들 삭제
          const range = IDBKeyRange.upperBound(Date.now() - this.config.cacheDuration);
          index.openCursor(range).onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
        }
      };
    } catch (error) {
      // IndexedDB 정리 실패 시 무시
    }
  }

  // 주기적 정리 시작
  startPeriodicCleanup() {
    // 30분마다 정리 실행
    setInterval(() => {
      this.cleanupLocalStorage();
      this.cleanupIndexedDB();
    }, 30 * 60 * 1000);
  }

  // 캐시 통계 조회
  async getCacheStats() {
    const memorySize = this.memoryCache.size;
    
    let localStorageSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.config.storageKey)) {
        localStorageSize++;
      }
    }
    
    let indexedDBSize = 0;
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const countRequest = store.count();
      indexedDBSize = await new Promise(resolve => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => resolve(0);
      });
    } catch (error) {
      // IndexedDB 통계 조회 실패
      return { count: 0, size: 0 };
    }
    
    return {
      memory: memorySize,
      localStorage: localStorageSize,
      indexedDB: indexedDBSize,
      processing: this.processingImages.size
    };
  }

  // 캐시 초기화
  async clearCache() {
    // 메모리 캐시 초기화
    this.memoryCache.clear();
    
    // 로컬스토리지 초기화
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.config.storageKey)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    
    // IndexedDB 초기화
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      store.clear();
    } catch (error) {
      // IndexedDB 초기화 실패 시 무시
    }
  }
}

/**
 * 싱글톤 패턴으로 이미지 캐시 매니저 인스턴스 생성
 * 앱 전체에서 하나의 캐시 매니저를 공유하여 일관성 유지
 */
const imageCacheManager = new ImageCacheManager();

// 이미지 캐시 매니저 인스턴스 내보내기
export default imageCacheManager; 