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
import shoppingcarticon from '../Assets/icons/shppingcarticon.png';
import { getWishlistItems, getProducts, sendChatMessage, getHandImages, downloadHandImage, addToCart, addToWishlist } from '../../utils/api';
import ProductCard from '../Common/Productcard/ProductCard';
import { formatPrice } from '../../utils/formatUtils';

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
  const [handImages, setHandImages] = useState([]);
  const [isLoadingHandImages, setIsLoadingHandImages] = useState(false);
  const [virtualTryOnResults, setVirtualTryOnResults] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
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

  // 등록된 손 사진 로드
  useEffect(() => {
    const loadHandImages = async () => {
      setIsLoadingHandImages(true);
      try {
        const handImagesData = await getHandImages();
        const handImagesWithBlobs = await Promise.all(
          handImagesData.map(async (img) => {
            try {
              const blob = await downloadHandImage(img.id);
              const url = URL.createObjectURL(blob);
              return {
                id: img.id,
                url: url,
                name: img.original_filename,
                isDefault: img.is_default
              };
            } catch (error) {
              console.error(`손 사진 ${img.id} 로드 실패:`, error);
              return null;
            }
          })
        );
        setHandImages(handImagesWithBlobs.filter(img => img !== null));
      } catch (error) {
        console.error('손 사진 로드 실패:', error);
      } finally {
        setIsLoadingHandImages(false);
      }
    };

    loadHandImages();

    // 컴포넌트 언마운트 시 Blob URL 정리
    return () => {
      handImages.forEach(image => {
        if (image.url && image.url.startsWith('blob:')) {
          URL.revokeObjectURL(image.url);
        }
      });
    };
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

  // 가상 착용 처리 함수
  const processVirtualTryOn = async (product) => {
    // 기본 손 사진 찾기
    const defaultHandImage = handImages.find(img => img.isDefault);
    
    if (!defaultHandImage) {
      // 기본 손 사진이 없는 경우 메시지 표시
      setMessages(prev => [
        ...prev,
        { 
          role: 'bot', 
          text: '가상 착용을 위해서는 기본 손 사진이 필요합니다. 먼저 손 사진을 등록해주세요.',
          buttons: [
            { text: '손 사진 등록하기', action: 'register_hand_image' }
          ],
          time: new Date().toLocaleTimeString() 
        }
      ]);
      return;
    }

    try {
      // 사용자 메시지 추가
      setMessages(prev => [
        ...prev,
        { 
          role: 'user', 
          text: `${product.name} 착용해보기`, 
          time: new Date().toLocaleTimeString() 
        }
      ]);

      // 처리 중 메시지 추가
      setMessages(prev => [
        ...prev,
        { 
          role: 'bot', 
          text: 'AI가 가상 착용을 처리하는 중입니다...', 
          time: new Date().toLocaleTimeString() 
        }
      ]);

      const formData = new FormData();
      
      // 손 이미지 추가 (Blob URL에서 File 객체 생성)
      const handResponse = await fetch(defaultHandImage.url);
      const handBlob = await handResponse.blob();
      formData.append('hand_image', handBlob, 'hand.jpg');
      
      // 시계 이미지 가져오기 및 추가
      const watchImageUrl = product.image_url || product.image;
      const watchImageBlob = await fetchWatchImage(watchImageUrl);
      formData.append('watch_image', watchImageBlob, 'watch.jpg');
      
      // 시계 ID 추가
      formData.append('watch_id', product.id);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://192.168.45.74:8000'}/virtual-try-on`, {
        method: 'POST',
        body: formData,
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.detail || `서버 오류: ${response.status}`);
      }
      
      if (responseData.success) {
        // 결과 저장
        setVirtualTryOnResults(prev => ({
          ...prev,
          [product.id]: responseData.result
        }));
        
        // 결과 메시지로 교체
        setMessages(prev => {
          const newMessages = [...prev];
          // 마지막 메시지(처리 중 메시지)를 결과로 교체
          newMessages[newMessages.length - 1] = {
            role: 'bot',
            text: `${product.name} 가상 착용 결과입니다. 어떠신가요?`,
            virtualTryOn: {
              product: product,
              result: responseData.result,
              handImage: defaultHandImage
            },
            time: new Date().toLocaleTimeString()
          };
          return newMessages;
        });
      } else {
        throw new Error(responseData.message || '가상 착용 처리에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('가상 착용 처리 오류:', error);
      
      // 에러 메시지로 교체
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'bot',
          text: '가상 착용 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
          time: new Date().toLocaleTimeString()
        };
        return newMessages;
      });
    }
  };

  // 시계 이미지를 Blob으로 가져오는 함수
  const fetchWatchImage = async (imageUrl) => {
    try {
      let fullImageUrl = imageUrl;
      
      // 상대 경로인 경우 절대 경로로 변환
      if (imageUrl.startsWith('./') || imageUrl.startsWith('/')) {
        fullImageUrl = `${window.location.origin}${imageUrl.replace('./', '/')}`;
      }
      
      // public 폴더의 이미지인 경우
      if (imageUrl.startsWith('watch_')) {
        fullImageUrl = `${window.location.origin}/images/${imageUrl}`;
      }
      
      // /images/ 경로로 시작하는 경우
      if (imageUrl.startsWith('/images/')) {
        fullImageUrl = `${window.location.origin}${imageUrl}`;
      }
      
      const response = await fetch(fullImageUrl);
      if (!response.ok) {
        throw new Error(`이미지 로드 실패: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('시계 이미지 로드 오류:', error);
      throw new Error('시계 이미지를 불러올 수 없습니다.');
    }
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

  // 가상 착용 결과에서 장바구니/찜 추가 처리
  const handleVirtualTryOnAction = async (product, action) => {
    try {
      if (action === 'add_to_cart') {
        await addToCart(product.id, 1);
        showFadeAlert('장바구니에 추가되었습니다.', 'success');
      } else if (action === 'add_to_wishlist') {
        await addToWishlist(product.id);
        showFadeAlert('찜 목록에 추가되었습니다.', 'success');
        handleWishlistChange();
      }
    } catch (error) {
      console.error('상품 추가 실패:', error);
      showFadeAlert('상품 추가에 실패했습니다.', 'error');
    }
  };

  // 버튼 클릭 처리
  const handleButtonClick = async (action, buttonText) => {
    // 손 사진 등록 페이지 이동
    if (action === 'register_hand_image') {
      setMessages(prev => [
        ...prev,
        { role: 'user', text: buttonText, time: new Date().toLocaleTimeString() }
      ]);

      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { role: 'bot', text: '사용자 설정 페이지로 이동합니다.', time: new Date().toLocaleTimeString() }
        ]);
      }, 200);

      setTimeout(() => {
        navigate('/user-settings');
      }, 1000);
      return;
    }

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
                        <div className="mt-3 space-y-4">
                          {msg.products.map((product) => (
                            <div key={product.id} className="space-y-2">
                              <div className="flex justify-start max-w-[68%]">
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
                              
                              {/* 각 상품별 착용해보기 버튼 */}
                              <div className="flex justify-start max-w-[68%]">
                                <button
                                  onClick={() => processVirtualTryOn(product)}
                                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
                                >
                                  착용해보기
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 가상 착용 결과 렌더링 */}
                      {msg.virtualTryOn && msg.role === 'bot' && (
                        <div className="mt-3">
                          <div className="bg-white rounded-xl shadow-md p-4 max-w-[68%]">
                            <div className="flex items-center space-x-3 mb-3">
                              <img 
                                src={msg.virtualTryOn.product.image_url || msg.virtualTryOn.product.image} 
                                alt={msg.virtualTryOn.product.name} 
                                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-gray-800 text-sm line-clamp-2">
                                  {msg.virtualTryOn.product.name}
                                </h3>
                                <p className="text-blue-600 font-semibold text-xs">
                                  {formatPrice(msg.virtualTryOn.product.price)}
                                </p>
                              </div>
                            </div>
                            
                            {/* 가상 착용 결과 이미지 */}
                            <div className="mb-3">
                              <img 
                                src={msg.virtualTryOn.result.result_image} 
                                alt="가상 착용 결과" 
                                className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => {
                                  setSelectedImage(msg.virtualTryOn.result.result_image);
                                  setShowImageModal(true);
                                }}
                              />
                            </div>
                            
                            {/* 액션 버튼들 - ProductCard와 동일한 디자인 */}
                            <div className="flex justify-end space-x-2">
                              {/* 찜하기 버튼 */}
                              <button
                                onClick={() => handleVirtualTryOnAction(msg.virtualTryOn.product, 'add_to_wishlist')}
                                className={`rounded-xl p-2 transition-colors ${
                                  wishlistIds.includes(msg.virtualTryOn.product.id)
                                    ? 'bg-red-100 text-red-500' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
                                }`}
                              >
                                <svg className="w-5 h-5" fill={wishlistIds.includes(msg.virtualTryOn.product.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              </button>
                              
                              {/* 장바구니 버튼 */}
                              <button
                                onClick={() => handleVirtualTryOnAction(msg.virtualTryOn.product, 'add_to_cart')}
                                className="bg-blue-100 text-blue-600 rounded-xl p-2 hover:bg-blue-200 transition-colors"
                              >
                                <img src={shoppingcarticon} alt="장바구니" className='w-5 h-5' />
                              </button>
                            </div>
                          </div>
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

      {/* 이미지 확대 모달 */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full max-h-[calc(100vh-2rem)] bg-white rounded-2xl overflow-hidden">
            {/* 닫기 버튼 */}
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage(null);
              }}
              className="absolute top-3 right-3 z-10 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* 이미지 */}
            <img 
              src={selectedImage} 
              alt="가상 착용 결과 확대" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatBot;
