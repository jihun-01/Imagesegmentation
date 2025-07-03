/**
 * 시계 쇼핑몰 메인 페이지 컴포넌트
 * - 상품 카테고리별 필터링
 * - 검색 기능
 * - 가상화된 그리드를 통한 성능 최적화
 * - 반응형 디자인 및 모바일 최적화
 */

import React, { useState, useEffect } from 'react';
import VirtualGrid from '../Common/VirtualGrid/VirtualGrid';
import { useAuth } from '../../contexts/AuthContext';
import { getProducts } from '../../utils/api';
import popicon from '../Assets/icons/popicon.png';
import homeicon from '../Assets/icons/homeicon.png';
import menuicon from '../Assets/icons/listicon.png';
import likeicon from '../Assets/icons/likeicon.png';
import usericon from '../Assets/icons/usericon.png';
import searchicon from '../Assets/icons/searchicon.png';
import carticon from '../Assets/icons/shppingcarticon.png';
import { Link } from 'react-router-dom';

function WatchStore() {
  // 인증 상태 관리
  const { user, isLoggedIn, logout } = useAuth();
  
  // 상품 및 UI 상태 관리
  const [products, setProducts] = useState([]);                            // 전체 상품 목록 (DB에서 가져온 데이터)
  const [filteredProducts, setFilteredProducts] = useState([]);            // 필터링된 상품 목록
  const [selectedCategory, setSelectedCategory] = useState('인기');        // 선택된 카테고리
  const [availableCategories, setAvailableCategories] = useState([]);      // 실제 DB에서 가져온 카테고리 목록
  const [searchQuery, setSearchQuery] = useState('');                      // 검색어
  const [showSearchInput, setShowSearchInput] = useState(false);           // 검색창 표시 여부
  const [containerHeight, setContainerHeight] = useState(400);             // 가상 그리드 컨테이너 높이
  const [loading, setLoading] = useState(true);                            // 로딩 상태
  const [error, setError] = useState('');                                  // 에러 메시지

  /**
   * DB에서 상품 데이터 로드
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setFilteredProducts(data);
      
      // 상품 데이터에서 고유한 타입들 추출
      const uniqueTypes = [...new Set(data.map(product => product.type))].filter(Boolean);
      // '인기' 카테고리를 첫 번째로 하고 나머지는 정렬
      const categories = ['인기', ...uniqueTypes.sort()];
      setAvailableCategories(categories);
      

    } catch (error) {
      console.error('상품 로드 실패:', error);
      setError('상품을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 인기도 점수 계산 함수
   * 가격을 기준으로 임시 계산 (DB에 sales, rating 등이 없으므로)
   * @param {Object} item - 상품 객체
   * @returns {number} 인기도 점수
   */
  const calculatePopularity = (item) => {
    // 임시로 ID 역순으로 정렬 (최신순)
    return 1000 - item.id;
  };

  /**
   * 상품 필터링 및 정렬 처리
   * - 검색어 기반 필터링 (상품명, 카테고리)
   * - 카테고리별 필터링
   * - 인기순 정렬
   */
  const filterAndSortProducts = () => {
    let filtered = [...products];

    // 검색어가 있는 경우 상품명과 카테고리에서 검색
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.type && item.type.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 카테고리별 처리
    if (selectedCategory === '인기') {
      // 인기도 기준으로 정렬 (높은 순)
      filtered.sort((a, b) => calculatePopularity(b) - calculatePopularity(a));
    } else if (selectedCategory !== '인기') {
      // 특정 카테고리로 필터링 (type 필드 사용)
      filtered = filtered.filter(item => {
        return item.type && item.type === selectedCategory;
      });
    }

    setFilteredProducts(filtered);
  };

  /**
   * 카테고리 변경 이벤트 핸들러
   * @param {string} category - 선택된 카테고리명
   */
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  /**
   * 검색어 입력 이벤트 핸들러
   * @param {Event} e - 입력 이벤트 객체
   */
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  /**
   * 검색 아이콘 클릭 이벤트 핸들러
   * 검색창 토글 및 검색어 초기화
   */
  const handleSearchIconClick = () => {
    setShowSearchInput(!showSearchInput);
    if (showSearchInput && searchQuery) {
      setSearchQuery('');                    // 검색창 닫을 때 검색어 초기화
    }
  };

  /**
   * 컴포넌트 마운트 시 상품 데이터 로드
   */
  useEffect(() => {
    loadProducts();
  }, []);

  /**
   * 상품 필터링 실행 (카테고리나 검색어 변경 시)
   */
  useEffect(() => {
    if (products.length > 0) {
      filterAndSortProducts();
    }
  }, [selectedCategory, searchQuery, products]);

  /**
   * 가상 그리드 컨테이너 높이 동적 계산
   * 화면 크기에 맞춰 반응형으로 높이 조절
   */
  useEffect(() => {
    const calculateHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = 120;              // 상단 헤더 영역 높이
      const footerHeight = 80;               // 하단 네비게이션 높이
      const availableHeight = windowHeight - headerHeight - footerHeight;
      setContainerHeight(Math.max(300, availableHeight));    // 최소 300px 보장
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  /**
   * 카테고리 버튼의 동적 스타일 반환
   * @param {string} category - 버튼의 카테고리명
   * @returns {string} 적용할 CSS 클래스 문자열
   */
  const getCategoryButtonStyle = (category) => {
    return selectedCategory === category
      ? "bg-black text-white rounded-xl px-3 py-1 font-bold text-sm whitespace-nowrap"      // 선택된 상태
      : "bg-gray-100 text-gray-500 rounded-xl px-3 py-1 text-sm whitespace-nowrap";         // 기본 상태
  };

  /**
   * 준비중 기능 알림 (임시 핸들러)
   */
  const notready = () => {
    alert('준비중입니다.');
  };

  /**
   * 시계 쇼핑몰 메인 UI 렌더링
   */
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
      {/* 메인 컨테이너 - 모바일 최적화된 카드 형태 */}
      <div className="w-full max-w-md min-h-[calc(100vh-56px)] bg-white rounded-2xl shadow-lg p-4 mb-4">
        
        {/* 상단 헤더: 검색/로고/액션 버튼들 */}
        <div className="flex justify-between items-center mb-2">
          <button onClick={handleSearchIconClick}>
            <img src={searchicon} alt="searchicon" className='w-6 h-6'/>
          </button>
          <span className="text-2xl font-bold text-center flex-1">
            JH <span className="block font-extrabold">shop</span>
          </span>
          <div className="flex space-x-2">
            {/* 장바구니 버튼 */}
            <Link to="/cart">
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <img src={carticon} alt="carticon" className='w-6 h-6'/>
              </button>
            </Link>
          </div>
        </div>

        {/* 조건부 렌더링: 검색 입력창 */}
        {showSearchInput && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="시계를 검색해보세요..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
            />
          </div>
        )}

        {/* 카테고리 필터 바 - 가로 스크롤 지원 */}
        <div className="flex flex-nowrap gap-2 mb-4">
          {availableCategories.map((category) => (
            <button 
              key={category}
              className={getCategoryButtonStyle(category)}
              onClick={() => handleCategoryChange(category)}
            >
              {category === '인기' && (
                <img src={popicon} alt="popicon" className="w-4 h-4 inline mr-1" />
              )}
              {category}
            </button>
          ))}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* 로딩 상태 */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">상품을 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 검색 결과 요약 정보 */}
            {searchQuery && (
              <div className="mb-2 text-sm text-gray-600">
                '{searchQuery}' 검색 결과: {filteredProducts.length}개
              </div>
            )}

            {/* 메인 상품 그리드 - 가상화 적용으로 성능 최적화 */}
            {filteredProducts.length > 0 ? (
              <VirtualGrid 
                items={filteredProducts}
                containerHeight={containerHeight}
                columns={2}
                gap={16}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단 고정 네비게이션 바 */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-lg flex justify-around items-center py-3">
        {/* 홈 버튼 */}
        <Link to="/"> 
          <button className='flex flex-col items-center'>
            <img src={homeicon} alt="homeicon" className='w-6 h-6'/>
            <span className="text-xs">홈</span>
          </button>
        </Link>
        
        {/* 카테고리 버튼 (준비중) */}
        <button className='flex flex-col items-center' onClick={notready}>
          <img src={menuicon} alt="menuicon" className='w-6 h-6'/>
          <span className="text-xs">카테고리</span>
        </button>
        
        {/* 찜하기 버튼 */}
        <Link to="/wishlist">
          <button className='flex flex-col items-center'>
            <img src={likeicon} alt="likeicon" className='w-6 h-6'/>
            <span className="text-xs">찜하기</span>
          </button>
        </Link>
        
        {/* 사용자 버튼 - 로그인 상태에 따라 다르게 표시 */}
        {isLoggedIn ? (
          <button 
            className='flex flex-col items-center' 
            onClick={logout}
          >
            <img src={usericon} alt="usericon" className='w-6 h-6'/>
            <span className="text-xs">{user?.name || '로그아웃'}</span>
          </button>
        ) : (
          <Link to="/login">
            <button className='flex flex-col items-center'>
              <img src={usericon} alt="usericon" className='w-6 h-6'/>
              <span className="text-xs">로그인</span>
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default WatchStore;
