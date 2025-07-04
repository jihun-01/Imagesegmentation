/**
 * 가상화된 그리드 컴포넌트
 * - 대량의 데이터를 효율적으로 렌더링
 * - 뷰포트에 보이는 아이템들만 DOM에 렌더링
 * - 스크롤 성능 최적화 및 메모리 사용량 감소
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ProductCard from '../Productcard/ProductCard';

/**
 * 가상화된 그리드 컴포넌트
 * @param {Array} items - 렌더링할 아이템 배열
 * @param {number} itemHeight - 각 아이템의 높이 (px)
 * @param {number} containerHeight - 컨테이너 높이 (px)
 * @param {number} columns - 그리드 열 수
 * @param {number} gap - 아이템 간 간격 (px)
 * @param {Array} wishlistIds - 위시리스트 ID 배열
 * @param {Function} onWishlistChange - 위시리스트 변경 함수
 * @param {Function} onCartChange - 장바구니 변경 함수
 */
const VirtualGrid = ({ 
  items = [], 
  itemHeight = 288,                // ProductCard 높이 (h-72 = 18rem = 288px)
  containerHeight = 600,
  columns = 2,
  gap = 16,
  wishlistIds = [],
  onWishlistChange,
  onCartChange
}) => {
  // 상태 관리
  const [scrollTop, setScrollTop] = useState(0);                           // 현재 스크롤 위치
  const [containerSize, setContainerSize] = useState({ 
    width: 0, 
    height: containerHeight 
  });
  
  // 참조 관리
  const containerRef = useRef(null);                                       // 컨테이너 DOM 요소
  const scrollElementRef = useRef(null);                                   // 스크롤 가능한 요소

  /**
   * 컨테이너 크기 변화 감지 및 반영
   * ResizeObserver를 사용하여 반응형 레이아웃 지원
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  /**
   * 스크롤 이벤트 처리
   * 성능 최적화를 위해 passive 리스너 사용
   */
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      setScrollTop(scrollElement.scrollTop);
    };

    // passive: true로 성능 최적화
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /**
   * 가상화 계산 로직
   * - 현재 뷰포트에 보이는 아이템만 계산
   * - 버퍼를 추가하여 부드러운 스크롤 경험 제공
   * - useMemo를 사용하여 불필요한 재계산 방지
   */
  const virtualItems = useMemo(() => {
    if (!items.length) return { visibleItems: [], totalHeight: 0 };

    const rowHeight = itemHeight + gap;                      // 행 높이 (아이템 + 간격)
    const totalRows = Math.ceil(items.length / columns);     // 전체 행 수
    const totalHeight = totalRows * rowHeight;               // 전체 스크롤 높이

    // 현재 화면에 보이는 영역 계산
    const visibleStartRow = Math.floor(scrollTop / rowHeight);
    const visibleEndRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerSize.height) / rowHeight)
    );

    // 부드러운 스크롤을 위한 버퍼 영역 추가
    const bufferRows = 2;                                    // 위아래 2행씩 추가 렌더링
    const startRow = Math.max(0, visibleStartRow - bufferRows);
    const endRow = Math.min(totalRows - 1, visibleEndRow + bufferRows);

    const visibleItems = [];
    
    // 보이는 영역의 아이템들만 계산
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index >= items.length) break;

        const item = items[index];
        const top = row * rowHeight;                         // 세로 위치
        const left = col * (containerSize.width / columns);  // 가로 위치

        visibleItems.push({
          ...item,
          index,
          top,
          left,
          width: containerSize.width / columns - gap / 2,    // 열 너비 (간격 고려)
          isVisible: row >= visibleStartRow && row <= visibleEndRow
        });
      }
    }

    return { visibleItems, totalHeight };
  }, [items, scrollTop, containerSize, itemHeight, gap, columns]);

  /**
   * 가상화된 그리드 렌더링
   * - 외부 컨테이너: 고정 높이와 숨김 오버플로우
   * - 내부 스크롤 컨테이너: 실제 스크롤이 발생하는 영역
   * - 가상 높이 컨테이너: 전체 데이터의 높이를 시뮬레이션
   * - 절대 위치 아이템들: 계산된 위치에 정확히 배치
   */
  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ height: containerHeight }}
    >
      {/* 스크롤 가능한 내부 컨테이너 */}
      <div
        ref={scrollElementRef}
        className="w-full h-full overflow-auto"
        style={{ height: containerHeight }}
      >
        {/* 전체 높이를 유지하는 가상 컨테이너 (스크롤바 길이 결정) */}
        <div style={{ height: virtualItems.totalHeight, position: 'relative' }}>
          {/* 현재 뷰포트에 보이는 아이템들만 실제 렌더링 */}
          {virtualItems.visibleItems.map((item) => (
            <div
              key={`${item.id}-${item.index}`}
              style={{
                position: 'absolute',           // 절대 위치로 정확한 배치
                top: item.top,                  // 계산된 세로 위치
                left: item.left,                // 계산된 가로 위치
                width: item.width,              // 계산된 너비
                height: itemHeight,             // 고정 높이
                padding: gap / 4                // 아이템 간 패딩
              }}
            >
              <ProductCard
                image={item.image_url}
                name={item.name}
                price={item.price}
                id={item.id}
                isVisible={item.isVisible}
                wishlistIds={wishlistIds}
                onWishlistChange={onWishlistChange}
                onCartChange={onCartChange}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VirtualGrid; 