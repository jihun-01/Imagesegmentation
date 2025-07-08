/**
 * 장바구니 페이지 컴포넌트
 * - 장바구니 상품 목록 표시
 * - 수량 조절 기능
 * - 상품 삭제 기능
 * - 총 금액 계산
 * - 주문하기 기능
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCartItems, updateCartItem, removeFromCart } from '../../utils/api';
import { formatPrice } from '../../utils/formatUtils';
import LightAlert from '../Common/LightAlert/LightAlert';
import ConfirmModal from '../Common/ConfirmModal';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';
import CartItem from '../Common/CartItem';
import BackButton from '../Common/Buttons/BackButton';

const Cart = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});
  const [confirmModal, setConfirmModal] = useState({ show: false, itemId: null });
  const { showFadeAlert, alertMessage, alertType, showAlert } = useFadeAlert();

  // 컴포넌트 마운트 시 장바구니 데이터 로드
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    
    loadCartItems();
  }, [isLoggedIn]); // navigate 제거하여 무한 루프 방지

  /**
   * 장바구니 아이템 로드
   */
  const loadCartItems = async () => {
    try {
      setLoading(true);
      const items = await getCartItems();
      setCartItems(items);
    } catch (error) {
      setError('장바구니를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 수량 변경 처리
   * @param {number} itemId - 장바구니 아이템 ID
   * @param {number} newQuantity - 새로운 수량
   */
  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      setUpdating(prev => ({ ...prev, [itemId]: true }));
      
      await updateCartItem(itemId, newQuantity);
      
      // 로컬 상태 업데이트
      setCartItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } catch (error) {
      setError('수량 변경에 실패했습니다.');
    } finally {
      setUpdating(prev => ({ ...prev, [itemId]: false }));
    }
  };

  /**
   * 상품 삭제 처리
   * @param {number} itemId - 삭제할 아이템 ID
   */
  const handleRemoveFromCart = (itemId) => {
    setConfirmModal({ show: true, itemId });
  };

  const handleConfirmRemove = async () => {
    const { itemId } = confirmModal;
    setConfirmModal({ show: false, itemId: null });
    try {
      setUpdating(prev => ({ ...prev, [itemId]: 'removing' }));
      await removeFromCart(itemId);
      setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
      showFadeAlert('장바구니에서 삭제되었습니다.', 'success');
    } catch (error) {
      showFadeAlert('상품 삭제에 실패했습니다.', 'error');
    } finally {
      setUpdating(prev => ({ ...prev, [itemId]: false }));
    }
  };

  /**
   * 주문하기 처리
   */
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      showFadeAlert('장바구니가 비어있습니다.', 'error');
      return;
    }
    
    // TODO: 주문 페이지로 이동
    showFadeAlert('준비중입니다.', 'error');
  };

  // 총 금액 계산
  const totalAmount = cartItems.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
        <div className="w-full max-w-md min-h-[calc(100vh-56px)] bg-white rounded-2xl shadow-lg p-6 flex flex-col mb-4">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">장바구니를 불러오는 중...</p>
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
          <h1 className="text-xl font-bold text-gray-800">장바구니</h1>
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

          {/* 장바구니 아이템 목록 */}
          <div className="space-y-4 mb-6">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h12.4" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">장바구니가 비어있습니다</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  쇼핑 계속하기
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveFromCart}
                  isUpdating={updating[item.id]}
                />
              ))
            )}
          </div>
        </div>
        

        {/* 하단 고정 버튼 */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full flex justify-center z-20">
            <div className="max-w-md w-full bg-white border-t border-gray-100 p-4 rounded-b-2xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-medium text-gray-900">총 금액:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(totalAmount)}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full py-4 bg-gray-900 text-white text-lg font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                주문하기
              </button>
            </div>
          </div>
        )}
        <FadeAlert
          show={showAlert}
          message={alertMessage}
          type={alertType}
          position="bottom"
        />
        <ConfirmModal
          show={confirmModal.show}
          message="이 상품을 장바구니에서 제거하시겠습니까?"
          onConfirm={handleConfirmRemove}
          onCancel={() => setConfirmModal({ show: false, itemId: null })}
        />
      </div>
    </div>
  );
};

export default Cart; 