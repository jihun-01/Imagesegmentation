/**
 * 시계 쇼핑몰 챗봇 컴포넌트
 * - 상품 추천 기능
 * - 메시지 기반 상호작용
 * - 상품 카드 표시
 * - 반응형 디자인
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
import { getWishlistItems, getProducts, sendChatMessage } from '../../utils/api';
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
  const [conversationId, setConversationId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'bot', 
      text: '안녕하세요! 쇼핑 도우미 챗봇입니다. 무엇을 도와드릴까요?',
      buttons: [
        { text: '상품 추천', action: 'product_recommend' },
        { text: '주문 조회', action: 'order_inquiry' },
        { text: '가격 문의', action: 'price_inquiry' },
        { text: '고객센터', action: 'customer_service' },
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // 메시지 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 찜목록 개수 로드
  useEffect(() => {
    const fetchWishlistCount = async () => {
      try {
        const items = await getWishlistItems();
        setWishlistCount(items.length);
        setWishlistIds(items.map(item => item.product.id));
      } catch (error) {
        console.error('찜목록 로드 실패:', error);
        setWishlistCount(0);
        setWishlistIds([]);
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

  // 백엔드로 메시지 전송
  const sendMessageToBackend = async (message, action) => {
    try {
      setIsTyping(true);
      const response = await sendChatMessage(message, conversationId, action);
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }
      return response;
    } catch (error) {
      console.error('백엔드 메시지 전송 실패:', error);
      return {
        message: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
        buttons: [{ text: '처음으로 이동', action: 'greeting' }]
      };
    } finally {
      setIsTyping(false);
    }
  };

  // 일반 텍스트 메시지 전송 처리
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // 사용자 메시지 추가
    setMessages(prev => [
      ...prev,
      { role: 'user', text: trimmed, time: new Date().toLocaleTimeString() }
    ]);
    setInput('');

    // 백엔드로 메시지 전송
    const response = await sendMessageToBackend(trimmed, '');
    
    // 봇 응답 추가
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { 
          role: 'bot', 
          text: response.message || '응답을 처리하는 중 오류가 발생했습니다.',
          buttons: response.buttons || [],
          products: response.products || [],
          time: new Date().toLocaleTimeString() 
        }
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

  // 찜목록 상태 갱신
  const handleWishlistChange = async () => {
    try {
      const items = await getWishlistItems();
      setWishlistCount(items.length);
      setWishlistIds(items.map(item => item.product.id));
    } catch (error) {
      console.error('찜목록 갱신 실패:', error);
      setWishlistCount(0);
      setWishlistIds([]);
    }
  };

  // 버튼 클릭 처리
  const handleButtonClick = async (action, buttonText) => {
    // 장바구니 이동 처리
    if (action === 'go_to_cart') {
      setMessages(prev => [
        ...prev,
        { role: 'user', text: buttonText, time: new Date().toLocaleTimeString() }
      ]);

      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { role: 'bot', text: '장바구니로 이동합니다.', time: new Date().toLocaleTimeString() }
        ]);
      }, 200);

      setTimeout(() => {
        navigate('/cart');
      }, 1000);
      return;
    }
    
    // 사용자 메시지 추가
    setMessages(prev => [
      ...prev,
      { role: 'user', text: buttonText, time: new Date().toLocaleTimeString() }
    ]);

    // 백엔드 응답 처리
    const response = await sendMessageToBackend('default', action);
    
    if (response.products && response.products.length > 0) {
      // 상품 추천 응답 처리
      setMessages(prev => {
        const next = [
          ...prev,
          {
            role: 'bot',
            text: response.message,
            buttons: response.buttons || [],
            products: response.products,
            time: new Date().toLocaleTimeString()
          }
        ];
        
        // 추가 안내 메시지
        setTimeout(() => {
          setMessages(current => [
            ...next,
            {
              role: 'bot',
              text: "더 필요한 것이 있으면 말씀해주세요.",
              buttons: getDefaultButtons(),
              products: [],
              time: new Date().toLocaleTimeString()
            }
          ]);
        }, 1000);
        return next;
      });
    } else {
      // 일반 응답 처리
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: response.message,
          buttons: response.buttons || [],
          products: response.products || [],
          time: new Date().toLocaleTimeString()
        }
      ]);
    }
  };

  // 기본 버튼 반환
  const getDefaultButtons = () => {
    return [
      { text: '상품 추천', action: 'product_recommend' },
      { text: '주문 조회', action: 'order_inquiry' },
      { text: '가격 문의', action: 'price_inquiry' },
      { text: '고객센터', action: 'customer_service' }
    ];
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
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`${msg.role === 'bot' ? 'hidden' : 'text-xs mr-2 mt-2 text-gray-500'}`}>
                      {msg.time}
                    </div>
                    <div className="max-w-[70%] text-left">
                      <div className={`px-3 py-2 rounded-xl text-sm break-words whitespace-pre-line 
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
                            <div key={product.id} className="flex justify-start max-w-[68%]">
                              <ProductCard
                                image={product.image_url}
                                name={product.name}
                                price={product.price}
                                id={product.id}
                                isVisible={true}
                                wishlistIds={wishlistIds}
                                onWishlistChange={handleWishlistChange}
                                onCartChange={() => {}}
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
                
                {/* 타이핑 인디케이터 */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] text-left">
                      <div className="px-3 py-2 rounded-xl text-sm bg-white text-gray-800">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
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
            <img src={sendicon} alt="전송" className="w-6 h-6"/>
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
