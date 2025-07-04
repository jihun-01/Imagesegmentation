import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, addToCart, toggleWishlist } from '../../utils/api';
import { formatPrice } from '../../utils/formatUtils';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../utils/config';
import { tokenStorage } from '../../utils/security';
import likeicon from '../Assets/icons/likeicon.png';
import backicon from '../Assets/icons/backicon.png';
import { Link } from 'react-router-dom';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';

// 별점 컴포넌트
const StarRating = ({ rating }) => (
  <div className="flex items-center">
    <svg className="w-5 h-5 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" /></svg>
    <span className="font-semibold text-gray-800 mr-1">{rating}</span>
  </div>
);

// 상품 상세 컴포넌트
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { alertMessage, alertType, showAlert, showFadeAlert } = useFadeAlert();
  
  const [quantity, setQuantity] = useState(1);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isTogglingWish, setIsTogglingWish] = useState(false);

  // 상품 데이터 로드
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const productData = await getProduct(id);
        setItem(productData);
      } catch (error) {
        setError('상품을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  // 찜하기 상태 확인
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isLoggedIn || !id) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/wishlist/check/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenStorage.getToken('access_token')}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setIsWishlisted(result.is_wishlisted);
        }
      } catch (error) {
        // 에러 시 기본값 유지
      }
    };

    checkWishlistStatus();
  }, [isLoggedIn, id]);

  const handleMinus = () => setQuantity(q => Math.max(1, q - 1));
  const handlePlus = () => setQuantity(q => q + 1);

  // 가상 착용 페이지로 이동하는 함수
  const handleVirtualTryOn = () => {
    if (item) {
      navigate('/virtual-wear', {
        state: {
          selectedWatch: {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image_url,
            description: item.description,
            rating: item.rating,
            reviews: item.reviews
          }
        }
      });
    }
  };

  // 찜하기 함수
  const handleWishlist = async () => {
    if (!isLoggedIn) {
      showFadeAlert('로그인이 필요합니다.', 'error');
      return;
    }
    
    try {
      setIsTogglingWish(true);
      const result = await toggleWishlist(item.id);
      
      if (result.action === 'added') {
        setIsWishlisted(true);
        showFadeAlert('찜목록에 추가되었습니다!', 'success');
      } else if (result.action === 'removed') {
        setIsWishlisted(false);
        showFadeAlert('찜목록에서 제거되었습니다!', 'success');
      }
    } catch (error) {
      showFadeAlert('찜하기에 실패했습니다.', 'error');
    } finally {
      setIsTogglingWish(false);
    }
  };

  // 장바구니에 담기 함수
  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      showFadeAlert('로그인이 필요합니다.', 'error');
      return;
    }
    
    try {
      setIsAddingToCart(true);
      await addToCart(item.id, quantity);
      showFadeAlert(`${item.name} ${quantity}개가 장바구니에 담겼습니다!`, 'success');
      
      // 2초 후 장바구니로 이동
      setTimeout(() => {
        navigate('/cart');
      }, 2000);
    } catch (error) {
      if (error.message.includes('이미 장바구니에 있는 상품입니다')) {
        showFadeAlert('이미 장바구니에 있는 상품입니다.', 'error');
      } else {
        showFadeAlert('장바구니 추가에 실패했습니다.', 'error');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
        <div className="w-full max-w-md min-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col relative">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">상품 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
        <div className="w-full max-w-md min-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col relative">
          <div className="p-8 text-center text-gray-500">
            <p>{error || '존재하지 않는 상품입니다.'}</p>
            <Link to="/" className="mt-4 inline-block bg-gray-900 text-white px-6 py-2 rounded-lg">
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
      <div className="w-full max-w-md flex-1 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
        {/* 상단 이미지 - 원본 이미지 직접 사용 */}
        <div className="relative bg-white">
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-3/4 h-[400px] mx-28 object-cover rounded-b-3xl" 
            loading="lazy"
          />
          <Link to="/">
            <button className="absolute top-4 left-4 bg-white rounded-xl p-2 shadow">
              <img src={backicon} alt="backicon" className="w-6 h-6" />
            </button>
          </Link>
        </div>
        
        {/* 상세 정보 */}
        <div className="flex-1 p-6 pb-4 overflow-y-auto flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-gray-900">{item.name}</h2>
          
          {/* 가격 */}
          <div className="flex items-center justify-between mb-2">    
            <div className="text-2xl font-bold text-gray-900">{formatPrice(item.price)}</div>
            {/* 수량 조절 */}
            <span className="flex items-center">
              <button onClick={handlePlus} className="bg-gray-100 rounded-lg px-2 py-1 mx-1 text-xl font-bold">+</button>
              <span className="mx-2 text-lg font-mono">{String(quantity).padStart(2, '0')}</span>
              <button onClick={handleMinus} className="bg-gray-100 rounded-lg px-2 py-1 mx-1 text-xl font-bold">-</button>
            </span>
          </div>
          
          {/* 별점 및 리뷰 */}
          <div className="flex items-center mb-2">
            <StarRating rating={item.rating || 0} />
            <span className="text-gray-400 ml-1">({item.reviews || 0} reviews)</span>
          </div>
          
          {/* 설명 */}
          <p className="text-gray-500 text-sm mb-6">{item.description}</p>
        </div>
        
        {/* 하단 고정 버튼 */}
        <div className="fixed bottom-0 max-w-md w-full bg-white border-t border-gray-100 p-4 flex gap-3 rounded-b-2xl mt-auto">
          <button 
            onClick={handleWishlist}
            disabled={isTogglingWish}
            className={`rounded-xl p-3 transition-colors ${
              isWishlisted 
                ? 'bg-red-100 text-red-500' 
                : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
            } ${isTogglingWish ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isTogglingWish ? (
              <div className="w-6 h-6 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
            ) : (
              <svg className="w-6 h-6" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
          
          <button 
            onClick={handleVirtualTryOn}
            className="flex-1 bg-blue-600 text-white rounded-xl p-3 font-bold text-lg shadow hover:bg-blue-700 transition"
          >
            착용해 보기
          </button>
          
          <button 
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            className={`flex-1 bg-black text-white rounded-xl p-3 font-bold text-lg shadow hover:bg-gray-800 transition whitespace-nowrap ${
              isAddingToCart ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isAddingToCart ? (
              <span className="flex items-center justify-center">
                <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2"></div>
                추가 중...
              </span>
            ) : (
              '장바구니에 담기'
            )}
          </button>
        </div>
        
        {/* 페이드 알림 */}
        <FadeAlert 
          show={showAlert}
          message={alertMessage}
          type={alertType}
          position="bottom"
        />
      </div>
    </div>
  );
};

export default ProductDetail; 