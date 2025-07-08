/**
 * 시계 쇼핑몰 메인 페이지 컴포넌트
 * - 상품 카테고리별 필터링
 * - 검색 기능
 * - 가상화된 그리드를 통한 성능 최적화
 * - 반응형 디자인 및 모바일 최적화
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';
import BottomNavigation from '../Common/BottomNavigation';
import BackButton from '../Common/Buttons/BackButton';
import imageicon from '../Assets/icons/imageicon.png';
import sendicon from '../Assets/icons/sendicon.png';
import { getWishlistItems, getProducts } from '../../utils/api';
import ProductCard from '../Common/Productcard/ProductCard';


function ChatBot() {
  const { user, isLoggedIn, logout } = useAuth();
  const { alertMessage, alertType, showAlert, showFadeAlert } = useFadeAlert();
  const [wishlistCount, setWishlistCount] = useState(0);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);

  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    { 
      role: 'bot', 
      text: '안녕하세요! 쇼핑 도우미 챗봇입니다. 무엇을 도와드릴까요?',
      buttons: [
        { text: '상품 추천', action: 'recommend' },
        { text: '주문 조회', action: 'order_check' },
        { text: '배송 조회', action: 'delivery_check' },
        { text: '반품/환불 안내', action: 'refund_check' },
        { text: '고객센터', action: 'support' },
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', text: trimmed, time: new Date().toLocaleTimeString() }
    ]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: '챗봇 응답 예시입니다.', time: new Date().toLocaleTimeString() }
      ]);
    }, 500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 확인 (10MB 제한)
      if (file.size > 10 * 1024 * 1024) {
        setError('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 업로드하세요.');
        return;
      }
      
      setSelectedFile(file);
      
      // 가상 착용 처리 시작
      // processVirtualTryOn(file);
      
      // if (onImageSelect) {
      //   onImageSelect(file);
      // }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

   // 최초 1회만 찜목록 개수 불러오기
   useEffect(() => {
    const fetchWishlistCount = async () => {
      try {
        const items = await getWishlistItems();
        setWishlistCount(items.length);
      } catch (e) {
        setWishlistCount(0);
      }
    };
    fetchWishlistCount();
  }, []);

  // 상품 데이터 로드
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productData = await getProducts();
        setProducts(productData);
      } catch (error) {
        console.error('상품 로드 실패:', error);
      }
    };
    loadProducts();
  }, []);

  // 찜목록과 장바구니 상태 갱신 함수들
  const handleWishlistChange = async () => {
    try {
      const items = await getWishlistItems();
      setWishlistCount(items.length);
      setWishlistIds(items.map(item => item.product.id));
    } catch (e) {
      setWishlistCount(0);
      setWishlistIds([]);
    }
  };

  const handleCartChange = async () => {
    // 필요시 장바구니 갱신 로직
  };

  const getRecommendedProducts = (category) => {
    let filtered = products;
    
    switch(category) {
      case 'metal_watch':
        // 예시: 메탈 밴드 시계 필터링
        filtered = products.filter(p => p.type && p.type.includes('메탈'));
        break;
      case 'leather_watch':
        // 예시: 가죽 밴드 시계 필터링  
        filtered = products.filter(p => p.type && p.type.includes('가죽'));
        break;
      case 'smart_watch':
        // 예시: 스마트 시계 필터링
        filtered = products.filter(p => p.type && p.type.includes('스마트'));
        break;
      default:
        // 인기 상품 (최신 3개)
        filtered = products.slice(0, 3);
    }
    
    return filtered.slice(0, 3); // 최대 3개만 추천
  };

  const handleButtonClick = async (action, buttonText) => {
    // 사용자 메시지로 버튼 텍스트 추가
    setMessages(prev => [
      ...prev,
      { role: 'user', text: buttonText, time: new Date().toLocaleTimeString() }
    ]);
    
    // 액션에 따른 봇 응답
    setTimeout(() => {
      let botResponse = '';
      let botResponseButtons = [];
      let recommendedProducts = [];
      
      switch(action) {
        case 'recommend': // 상품 추천
          botResponse = '어떤 종류의 시계를 찾고 계신가요?';
          botResponseButtons = [
            { text: '메탈 밴드', action: 'metal_watch' },
            { text: '가죽 밴드', action: 'leather_watch' },
            { text: '스마트 워치', action: 'smart_watch' },
            { text: '처음으로 이동', action: 'home' }
          ];
          break;
        case 'order_check': // 주문 조회
          botResponse = '주문조회는 준비중입니다.';
          botResponseButtons = [
            { text: '처음으로 이동', action: 'home' }
          ];
          break;
        case 'support': // 고객센터
          botResponse = '고객센터는 준비중입니다.';
          botResponseButtons = [
            { text: '처음으로 이동', action: 'home' }
          ];
          break;
        case 'metal_watch': // 메탈 밴드 시계
          botResponse = '메탈 밴드 시계 인기 상품을 추천해드릴게요!';
          recommendedProducts = getRecommendedProducts('metal_watch');
          botResponseButtons = [
            { text: '처음으로 이동', action: 'home' }
          ];
          break;
        case 'leather_watch': // 가죽 밴드 시계
          botResponse = '가죽 밴드 시계 인기 상품을 추천해드릴게요!';
          recommendedProducts = getRecommendedProducts('leather_watch');
          botResponseButtons = [
            { text: '처음으로 이동', action: 'home' }
          ];
          break;
        case 'smart_watch': // 스마트 시계
          botResponse = '스마트 시계 인기 상품을 추천해드릴게요!';
          recommendedProducts = getRecommendedProducts('smart_watch');
          botResponseButtons = [
            { text: '처음으로 이동', action: 'home' }
          ];
          break;
        case 'home': // 처음으로 이동
          botResponse = '안녕하세요! 쇼핑 도우미 챗봇입니다. 무엇을 도와드릴까요?';
          botResponseButtons = [
            { text: '상품 추천', action: 'recommend' },
            { text: '주문 조회', action: 'order_check' },
            { text: '배송 조회', action: 'delivery_check' },
            { text: '반품/환불 안내', action: 'refund_check' },
            { text: '고객센터', action: 'support' },
          ];
          break;
        case 'delivery_check': // 배송 조회
          botResponse = '배송조회는 준비중입니다.';
          botResponseButtons = [
            { text: '처음으로 이동', action: 'home' }
          ];
          break;
        case 'refund_check': // 반품/환불 안내
          botResponse = '반품/환불 안내는 준비중입니다.'; 
          botResponseButtons = [
            { text: '처음으로 이동', action: 'home' }
          ];
          break;
        default:
          botResponse = '도움이 필요하시면 언제든 말씀해주세요!';
      }
      
      setMessages(prev => [
        ...prev,
        { 
          role: 'bot', 
          text: botResponse, 
          buttons: botResponseButtons,
          products: recommendedProducts,
          time: new Date().toLocaleTimeString() 
        }
      ]);

      if (recommendedProducts.length > 0) { // 추천 상품이 있을 경우 추가메시지
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { role: 'bot', 
              text: '다른 도움이 필요하시면 언제든 말씀해주세요!', 
              buttons: [
                { text: '처음으로 이동', action: 'home' }
              ],
              time: new Date().toLocaleTimeString() 
            }
          ]);
        }, 1000); // 1초 대기 후 메시지 추가가
      }
    }, 500); // 0.5초 대기 후 메시지 추가
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4 overflow-hidden">
      {/* 메인 컨테이너 */}
      <div className="w-full max-w-md min-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg flex flex-col">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-6 py-4">
          <BackButton className="mt-2" />
          <h1 className="mt-2 text-xl font-bold text-gray-800">챗봇</h1>
          <div className="w-10"></div>
        </header>

        {/* 채팅 메시지 영역 */}
        <div
          className="flex-1 overflow-y-auto p-4 bg-gray-300"
          style={{ maxHeight: 'calc(100vh - 230px)' }}
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex-1  flex flex-col gap-2 overflow-y-auto">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`${msg.role === 'bot' ? 'hidden' : 'text-xs mr-2 mt-2 text-gray-500'}`}>
                      {msg.time}
                    </div>
                    <div className={`max-w-[70%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`px-3 py-2 rounded-xl text-sm break-words 
                        ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                        {msg.text}
                      </div>
                      
                      {/* 버튼 렌더링 */}
                      {msg.buttons && msg.role === 'bot' && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.buttons.map((button, btnIdx) => (
                            <button
                              key={btnIdx}
                              onClick={() => handleButtonClick(button.action, button.text)}
                              className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs hover:bg-blue-200 transition-colors"
                            >
                              {button.text}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 상품 카드 렌더링 */}
                      {msg.products && msg.products.length > 0 && msg.role === 'bot' && (
                        <div className="mt-3 space-y-2">
                          {msg.products.map((product) => (
                            <div key={product.id} className="max-w-[74%]">
                              <ProductCard
                                image={product.image_url}
                                name={product.name}
                                price={product.price}
                                id={product.id}
                                isVisible={true}
                                wishlistIds={wishlistIds}
                                onWishlistChange={handleWishlistChange}
                                onCartChange={handleCartChange}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`${msg.role === 'user' ? 'hidden' : 'text-xs ml-2 mt-2 text-gray-500'}`}>
                      {msg.time}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* 입력창 */}
        <div className="mb-10 flex gap-2 p-2 bg-white items-center">

             <img src={imageicon} alt='imageicon' className=' w-6 h-6 cursor-pointer hover:bg-gray-200' onClick={() => fileInputRef.current.click()}/>
             <input 
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isProcessing}
                className="hidden"
              />
            
          <input
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none"
            type="text"
            placeholder="메시지를 입력하세요"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="bg-white text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-200 transition"
            onClick={handleSend}
          >
            <img src={sendicon} alt='sendicon' className='w-6 h-6'/>
          </button>
        </div>
      </div>

      {/* 하단 고정 네비게이션 바 */}
      <BottomNavigation
        isLoggedIn={isLoggedIn}
        user={user}
        wishlistCount={wishlistCount}
        onLogout={logout}
        onCategoryClick={() => showFadeAlert('준비중입니다.', 'error')}
      />
      <FadeAlert message={alertMessage} type={alertType} show={showAlert} />
    </div>
  );
}

export default ChatBot;
