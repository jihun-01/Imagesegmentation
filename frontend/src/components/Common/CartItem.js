/**
 * 장바구니 개별 아이템 컴포넌트
 * - 상품 이미지 표시 (리사이징 적용)
 * - 수량 조절 기능
 * - 상품 삭제 기능
 * - 소계 계산 표시
 */

import React from 'react';
import { useImageResize } from '../Hooks/useImageResize';
import { formatPrice } from '../../utils/formatUtils';
import useQuantity from '../Hooks/useQuantity';

const CartItem = ({ item, onQuantityChange, onRemove, isUpdating }) => {
  const { resizedImageUrl, isLoading: imageLoading } = useImageResize(item.product.image_url);
  const { quantity, increase, decrease } = useQuantity(item.quantity, 1, 99);

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
                onClick={() => { decrease(); onQuantityChange(item.id, quantity - 1); }}
                disabled={quantity <= 1 || isUpdating}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              <span className="w-8 text-center font-medium">
                {isUpdating ? '...' : quantity}
              </span>
              
              <button
                onClick={() => { increase(); onQuantityChange(item.id, quantity + 1); }}
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

export default CartItem; 