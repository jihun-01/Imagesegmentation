/**
 * 찜목록(위시리스트) 페이지 컴포넌트
 * - 찜한 상품 목록 표시
 * - 찜 해제 기능
 * - 장바구니에 담기 기능
 * - 상품 상세 페이지 이동
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getWishlistItems, removeFromWishlist, addToCart } from '../../utils/api';
import { useImageResize } from '../Hooks/useImageResize';
import { formatPrice } from '../../utils/formatUtils';

/**
 * 찜목록 개별 아이템 컴포넌트 (이미지 리사이징 적용)
 */
const WishlistItem = ({ item, onRemove, onAddToCart, onProductClick, isProcessing }) => {
  const { resizedImageUrl, isLoading: imageLoading } = useImageResize(item.product.image_url);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-start space-x-3">
        {/* 상품 이미지 */}
        <div 
          className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => onProductClick(item.product.id)}
        >
          {imageLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-400"></div>
            </div>
          ) : resizedImageUrl ? (
            <img
              src={resizedImageUrl}
              alt={item.product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center hover:bg-gray-300 transition-colors">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div 
              className="overflow-hidden cursor-pointer flex-1"
              onClick={() => onProductClick(item.product.id)}
            >
              <h3 className="line-clamp-2 text-base font-medium text-gray-900 hover:text-red-600 transition-colors">
                {item.product.name}
              </h3>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatPrice(item.product.price)}
              </p>
            </div>
            
            {/* 찜 해제 버튼 */}
            <button
              onClick={() => onRemove(item.product.id, item.id)}
              disabled={isProcessing === 'removing'}
              className="text-red-400 hover:text-red-600 transition-colors p-1 disabled:opacity-50"
            >
              {isProcessing === 'removing' ? (
                <div className="w-5 h-5 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
          </div>


        </div>
      </div>
    </div>
  );
};

const Wishlist = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState({});

  // 컴포넌트 마운트 시 찜목록 데이터 로드
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    
    loadWishlistItems();
  }, [isLoggedIn]); // navigate 제거하여 무한 루프 방지

  /**
   * 찜목록 아이템 로드
   */
  const loadWishlistItems = async () => {
    try {
      setLoading(true);
      const items = await getWishlistItems();
      setWishlistItems(items);
    } catch (error) {
      setError('찜목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 찜 해제 처리
   * @param {number} productId - 상품 ID
   * @param {number} itemId - 찜목록 아이템 ID (UI 상태 관리용)
   */
  const handleRemoveFromWishlist = async (productId, itemId) => {
    if (!window.confirm('이 상품을 찜목록에서 제거하시겠습니까?')) {
      return;
    }
    
    try {
      setProcessing(prev => ({ ...prev, [itemId]: 'removing' }));
      
      await removeFromWishlist(productId);
      setWishlistItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } catch (error) {
      setError('찜 해제에 실패했습니다.');
    } finally {
      setProcessing(prev => ({ ...prev, [itemId]: false }));
    }
  };

  /**
   * 장바구니에 담기 처리
   * @param {object} product - 상품 정보
   * @param {number} itemId - 찜목록 아이템 ID
   */
  const handleAddToCart = async (product, itemId) => {
    try {
      setProcessing(prev => ({ ...prev, [itemId]: 'adding' }));
      
      await addToCart(product.id, 1);
      alert('장바구니에 추가되었습니다!');
    } catch (error) {
      if (error.message.includes('이미 장바구니에 있는 상품입니다')) {
        alert('이미 장바구니에 있는 상품입니다.');
      } else {
        setError('장바구니 추가에 실패했습니다.');
      }
    } finally {
      setProcessing(prev => ({ ...prev, [itemId]: false }));
    }
  };

  /**
   * 상품 상세 페이지로 이동
   * @param {number} productId - 상품 ID
   */
  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  // 총 찜한 상품 가치 계산
  const totalValue = wishlistItems.reduce((total, item) => {
    return total + item.product.price;
  }, 0);

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
        <div className="w-full max-w-md min-h-[calc(100vh-56px)] bg-white rounded-2xl shadow-lg p-6 flex flex-col mb-4">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-600">찜목록을 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
      <div className="w-full max-w-md min-h-[calc(100vh-56px)] bg-white rounded-2xl shadow-lg flex flex-col mb-4 relative">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b border-gray-100 rounded-t-2xl">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-100 rounded-xl p-2 shadow hover:bg-gray-200 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800">내 찜목록</h1>
          <div className="w-10"></div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 pb-32" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* 찜목록 요약 */}
          {wishlistItems.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">총 {wishlistItems.length}개 상품</p>
                  <p className="text-lg font-semibold text-gray-900">
                    총 금액: {formatPrice(totalValue)}
                  </p>
                </div>
                <div className="text-2xl">❤️</div>
              </div>
            </div>
          )}

          {/* 찜목록 아이템 목록 */}
          <div className="space-y-4">
            {wishlistItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">찜한 상품이 없습니다</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  상품 둘러보기
                </button>
              </div>
            ) : (
              wishlistItems.map((item) => (
                <WishlistItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveFromWishlist}
                  onAddToCart={handleAddToCart}
                  onProductClick={handleProductClick}
                  isProcessing={processing[item.id]}
                />
              ))
            )}
          </div>
        </div>

        {/* 하단 고정 버튼 */}
        {wishlistItems.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full flex justify-center z-20">
            <div className="max-w-md w-full bg-white border-t border-gray-100 p-4 rounded-b-2xl space-y-3">
              <button
                onClick={() => navigate('/cart')}
                className="w-full py-3 bg-gray-900 text-white text-lg font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                장바구니 보기
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 border border-gray-300 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                쇼핑 계속하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist; 