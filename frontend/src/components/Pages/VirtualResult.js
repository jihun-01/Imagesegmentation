import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import backicon from '../Assets/icons/backicon.png';
import { addToCart } from '../../utils/api';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';
import { formatPrice } from '../../utils/formatUtils';

const VirtualResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState({});
  const { alertMessage, alertType, showAlert, showFadeAlert } = useFadeAlert();
  
  const { result, selectedWatch } = location.state || {};

  // 결과 데이터가 없으면 이전 페이지로 리다이렉트
  if (!result) {
    navigate(-1);
    return null;
  }

  const handleAddToCart = async (product, itemId) => {
    try {
      setProcessing(prev => ({ ...prev, [itemId]: 'adding' }));
      
      await addToCart(product.id, 1);
      showFadeAlert('장바구니에 추가되었습니다!', 'success');
      
      // 1초 후 장바구니로 이동
      setTimeout(() => {
        navigate('/cart');
      }, 1000);
    } catch (error) {
      if (error.message.includes('이미 장바구니에 있는 상품입니다')) {
        showFadeAlert('이미 장바구니에 있는 상품입니다.', 'error');
      } else {
        showFadeAlert('장바구니 추가에 실패했습니다.', 'error');
      }
    } finally {
      setProcessing(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleTryAgain = () => {
    // 다시 시도 - VirtualWear 페이지로 돌아가기
    navigate('/virtual-wear', {
      state: { selectedWatch }
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
      <div className="w-full max-w-md min-h-[calc(100vh-56px)] bg-white rounded-2xl shadow-lg p-6 flex flex-col mb-4">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="bg-gray-100 rounded-xl p-2 shadow hover:bg-gray-200 transition"
          >
            <img src={backicon} alt="뒤로가기" className="w-6 h-6" />
          </button>
          
          <h1 className="text-xl font-bold text-gray-800">가상 착용 결과</h1>
          
          <div className="w-10"></div> {/* 공간 맞추기용 */}
        </div>

        {/* 선택된 시계 정보 */}
        {selectedWatch && (
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <img 
                src={selectedWatch.image} 
                alt={selectedWatch.name}
                className="w-12 h-12 object-cover rounded-lg"
              />
              <div>
                <p className="font-semibold text-gray-800 line-clamp-1">{selectedWatch.name}</p>
                <p className="text-sm text-gray-600">{formatPrice(selectedWatch.price)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 결과 이미지 비교 */}
        <div className="flex-1 space-y-6">
          
          {/* 가상 착용 결과 */}
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">가상 착용 결과</h2>
            <div className="bg-gray-50 rounded-2xl p-4">
              <img 
                src={result.result_image}
                alt="가상 착용 결과"
                className="w-full max-w-sm mx-auto rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="mt-6 space-y-4">
          <div className="flex gap-4 pb-4">
            <button
              onClick={handleTryAgain}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              다시 시도
            </button>
            
            <button
              onClick={() => handleAddToCart(selectedWatch, selectedWatch.id)}
              disabled={processing[selectedWatch.id] === 'adding'}
              className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing[selectedWatch.id] === 'adding' ? (
                <span className="flex items-center justify-center">
                  <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  추가 중...
                </span>
              ) : (
                '장바구니에 담기' 
              )}
            </button>
          </div>

          {/* 쇼핑 계속하기 */}
          <Link to="/watch-store">
            <button className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition">
              다른 시계 구경하기
            </button>
          </Link>
        </div>
      </div>
      <FadeAlert message={alertMessage} type={alertType} show={showAlert} />
    </div>
  );
};

export default VirtualResult; 