/**
 * 시계 쇼핑몰 메인 페이지 컴포넌트
 * - 상품 카테고리별 필터링
 * - 검색 기능
 * - 가상화된 그리드를 통한 성능 최적화
 * - 반응형 디자인 및 모바일 최적화
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';
import homeicon from '../Assets/icons/homeicon.png';
import menuicon from '../Assets/icons/listicon.png';
import likeicon from '../Assets/icons/likeicon.png';
import usericon from '../Assets/icons/usericon.png';
import backicon from '../Assets/icons/backicon.png';
import imageicon from '../Assets/icons/imageicon.png';
import sendicon from '../Assets/icons/sendicon.png';
import { getWishlistItems } from '../../utils/api';


function ChatBot() {
  const { user, isLoggedIn, logout } = useAuth();
  const { alertMessage, alertType, showAlert, showFadeAlert } = useFadeAlert();
  const [wishlistCount, setWishlistCount] = useState(0);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    { role: 'bot', text: '안녕하세요! 쇼핑 도우미 챗봇입니다. 무엇을 도와드릴까요?' }
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
    }, 300);
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

   // 최초 1회만 찜목록/장바구니 개수 불러오기
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

  // 찜목록 갱신 콜백
  const handleWishlistChange = async () => {
    try {
      const items = await getWishlistItems();
      setWishlistCount(items.length);
    } catch (e) {
      setWishlistCount(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4 overflow-hidden">
      {/* 메인 컨테이너 */}
      <div className="w-full max-w-md min-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg flex flex-col">
        {/* 헤더 */}
        <header className="flex  items-center justify-between  px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="mt-2 bg-gray-100 rounded-xl p-2 shadow hover:bg-gray-200 transition"
          >
            <img src={backicon} alt="뒤로가기" className="w-6 h-6" />
          </button>
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
                    <div
                      className={`px-3 py-2 rounded-xl max-w-[70%] text-sm break-words 
                        ${msg.role === 'user' ? 'bg-blue-500 text-white text-right' : 'bg-white text-gray-800 text-left'}`}
                    >
                      {msg.text}
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
      <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-lg flex justify-around items-center py-3">
        <Link to="/">
          <button className="flex flex-col items-center">
            <img src={homeicon} alt="homeicon" className="w-6 h-6" />
            <span className="text-xs">홈</span>
          </button>
        </Link>
        <button
          className="flex flex-col items-center"
          onClick={() => showFadeAlert('준비중입니다.', 'error')}
        >
          <img src={menuicon} alt="menuicon" className="w-6 h-6" />
          <span className="text-xs">카테고리</span>
        </button>
        <Link to="/wishlist">
          <button className="flex flex-col items-center">
            <img src={likeicon} alt="likeicon" className="w-6 h-6" />
            <span className="text-xs">
              찜하기{wishlistCount > 0 ? ` (${wishlistCount})` : ''}
            </span>
          </button>
        </Link>
        {isLoggedIn ? (
          <button className="flex flex-col items-center" onClick={logout}>
            <img src={usericon} alt="usericon" className="w-6 h-6" />
            <span className="text-xs">{user?.name || '로그아웃'}</span>
          </button>
        ) : (
          <Link to="/login">
            <button className="flex flex-col items-center">
              <img src={usericon} alt="usericon" className="w-6 h-6" />
              <span className="text-xs">로그인</span>
            </button>
          </Link>
        )}
      </div>
      <FadeAlert message={alertMessage} type={alertType} show={showAlert} />
    </div>
  );
}

export default ChatBot;
