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
import { useImageResize } from '../Hooks/useImageResize';
import { formatPrice } from '../../utils/formatUtils';

/**
 * 장바구니 개별 아이템 컴포넌트 (이미지 리사이징 적용)
 */
const CartItem = ({ item, onQuantityChange, onRemove, isUpdating }) => {
  const { resizedImageUrl, isLoading: imageLoading } = useImageResize(item.product.image_url);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-start space-x-3">
        {/* 상품 이미지 */}
        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          {imageLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            </div>
          ) : resizedImageUrl ? (
            <img
              src={resizedImageUrl}
              alt={item.product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="overflow-hidden">
              <h3 className="line-clamp-1 text-base font-medium text-gray-900 truncate">
                {item.product.name}
              </h3>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatPrice(item.product.price)}
              </p>
            </div>
            
            {/* 삭제 버튼 */}
            <button
              onClick={() => onRemove(item.id)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 수량 조절 */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1 || isUpdating}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              <span className="w-8 text-center font-medium">
                {isUpdating ? '...' : item.quantity}
              </span>
              
              <button
                onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                disabled={isUpdating}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
            
            {/* 소계 */}
            <div className="text-right">
              <p className="text-sm text-gray-500">소계</p>
              <p className="font-semibold text-gray-900">
                {formatPrice(item.product.price * item.quantity)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Cart = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});

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
  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('이 상품을 장바구니에서 제거하시겠습니까?')) {
      return;
    }
    
    try {
      await removeFromCart(itemId);
      setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } catch (error) {
      setError('상품 삭제에 실패했습니다.');
    } finally {
      setUpdating(prev => ({ ...prev, [itemId]: false }));
    }
  };

  /**
   * 주문하기 처리
   */
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('장바구니가 비어있습니다.');
      return;
    }
    
    // TODO: 주문 페이지로 이동
    alert('준비중입니다.')
  };

  // 총 금액 계산
  const totalAmount = cartItems.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">장바구니를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">장바구니</h1>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-md mx-auto px-4 py-6">
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
                onRemove={handleRemoveItem}
                isUpdating={updating[item.id]}
              />
            ))
          )}
        </div>

    
        {/* 총 금액 및 체크아웃 */}
        {cartItems.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium text-gray-900">총 금액:</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(totalAmount)}
              </span>
            </div>
            
            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-gray-900 text-white text-lg font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              주문하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart; 