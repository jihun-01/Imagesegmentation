/**
 * 찜목록 개별 아이템 컴포넌트
 * - 상품 이미지 표시 (리사이징 적용)
 * - 찜 해제 기능
 * - 장바구니 추가 기능
 * - 상품 상세 페이지 이동
 */

import React from 'react';
import { useImageResize } from '../Hooks/useImageResize';
import { formatPrice } from '../../utils/formatUtils';
import shoppingcarticon from '../Assets/icons/shppingcarticon.png';

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
            <div className="flex flex-col items-end space-y-2">
              {/* 찜 해제 버튼 */}
              <button
                onClick={() => onRemove(item.product.id, item.id)}
                disabled={isProcessing === 'removing'}
                className="w-8 h-8 p-1 rounded text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isProcessing === 'removing' ? (
                  <div className="w-5 h-5 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
              </button>
              {/* 장바구니 추가 버튼 */}
              <button
                onClick={() => onAddToCart(item.product, item.id)}
                disabled={isProcessing === 'adding'}
                className="w-8 h-8 p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isProcessing === 'adding' ? (
                  <div className="w-5 h-5 animate-spin border-2 border-gray-400 border-t-transparent rounded-full"></div>
                ) : (
                  <img src={shoppingcarticon} alt="장바구니" className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishlistItem; 