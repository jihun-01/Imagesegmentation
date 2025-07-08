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
import { formatPrice } from '../../utils/formatUtils';
import LightAlert from '../Common/LightAlert/LightAlert';
import ConfirmModal from '../Common/ConfirmModal';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';
import WishlistItem from '../Common/WishlistItem';
import BackButton from '../Common/Buttons/BackButton';

const Wishlist = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState({});
  const [confirmModal, setConfirmModal] = useState({ show: false, productId: null, itemId: null });
  const { showFadeAlert, alertMessage, alertType, showAlert } = useFadeAlert();

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
  const handleRemoveFromWishlist = (productId, itemId) => {
    setConfirmModal({ show: true, productId, itemId });
  };

  const handleConfirmRemove = async () => {
    const { productId, itemId } = confirmModal;
    setConfirmModal({ show: false, productId: null, itemId: null });
    try {
      setProcessing(prev => ({ ...prev, [itemId]: 'removing' }));
      await removeFromWishlist(productId);
      setWishlistItems(prevItems => prevItems.filter(item => item.id !== itemId));
      showFadeAlert('찜목록에서 제거되었습니다.', 'success');
    } catch (error) {
      showFadeAlert('찜 해제에 실패했습니다.', 'error');
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
      showFadeAlert('장바구니에 추가되었습니다!', 'success');
    } catch (error) {
      if (error.message.includes('이미 장바구니에 있는 상품입니다')) {
        showFadeAlert('이미 장바구니에 있는 상품입니다.', 'info');
      } else {
        showFadeAlert('장바구니 추가에 실패했습니다.', 'error');
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
          <BackButton />
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
      <FadeAlert
        show={showAlert}
        message={alertMessage}
        type={alertType}
        position="bottom"
      />
      <ConfirmModal
        show={confirmModal.show}
        message="이 상품을 찜목록에서 제거하시겠습니까?"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmModal({ show: false, productId: null, itemId: null })}
      />
    </div>
  );
};

export default Wishlist; 