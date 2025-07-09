import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/api';
import { validateEmail, validatePassword, escapeHtml } from '../utils/security';
import JH from '../components/Assets/icons/JH.png';
import useFadeAlert from '../components/Hooks/useFadeAlert';
import FadeAlert from '../components/Common/FadeAlert/FadeAlert';
import BackButton from '../components/Common/Buttons/BackButton';

const Regist = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    passwordcheck: '',
    phone: '',
    terms: false
  });
  
  const [loading, setLoading] = useState(false);
  const { showFadeAlert, alertMessage, alertType, showAlert } = useFadeAlert();

  const notready = () => {
    showFadeAlert('준비중입니다.', 'error');
  };

  // 입력값 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 입력값 검증
    if (!formData.username || formData.username.length < 3) {
      showFadeAlert('닉네임은 3자 이상 입력해주세요.', 'error');
      setLoading(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      showFadeAlert('올바른 이메일 형식을 입력해주세요.', 'error');
      setLoading(false);
      return;
    }

    if (!formData.name || formData.name.length < 2) {
      showFadeAlert('이름은 2자 이상 입력해주세요.', 'error');
      setLoading(false);
      return;
    }

    // 비밀번호 강도 검증
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      showFadeAlert(passwordValidation.errors.join(' '), 'error');
      setLoading(false);
      return;
    }

    // 비밀번호 확인
    if (formData.password !== formData.passwordcheck) {
      showFadeAlert('비밀번호가 일치하지 않습니다.', 'error');
      setLoading(false);
      return;
    }

    // 이용약관 동의 확인
    if (!formData.terms) {
      showFadeAlert('이용약관에 동의해주세요.', 'error');
      setLoading(false);
      return;
    }

    try {
      // XSS 방지를 위한 입력값 escape
      const userData = {
        username: escapeHtml(formData.username.trim()),
        email: escapeHtml(formData.email.trim()),
        password: formData.password,
        name: escapeHtml(formData.name.trim()),
        phone: formData.phone ? escapeHtml(formData.phone.trim()) : null
      };

      await registerUser(userData);
      
      // 회원가입 성공
      showFadeAlert('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
      navigate('/login');
      
    } catch (error) {
      showFadeAlert(error.message || '회원가입 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
      <div className="w-full max-w-md h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg p-4 flex flex-col overflow-hidden relative">
        
        {/* 뒤로가기 버튼 */}
        <div className="flex justify-start mb-4">
          <BackButton className="ml-2 mt-2"/>
        </div>

        {/* 로고 섹션 */}
        <div className="flex justify-center mb-4">
          <img 
            src={JH} 
            alt="Logo" 
            className="h-12 w-12 rounded-full shadow-lg"
          />
        </div>

        {/* 헤더 섹션 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black">회원가입</h1>
          <p className="text-gray-600">이메일로 회원가입</p>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium ml-3" htmlFor="username">
                닉네임
              </label>
              <input 
                type="text" 
                id="username" 
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                placeholder="영문자와 숫자만 사용 (3자 이상)"
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium ml-3" htmlFor="email">
                이메일 주소
              </label>
              <input 
                type="email" 
                id="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium ml-3" htmlFor="name">
                이름
              </label>
              <input 
                type="text" 
                id="name" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium ml-3" htmlFor="phone">
                전화번호 (선택사항)
              </label>
              <input 
                type="tel" 
                id="phone" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                placeholder="010-1234-5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium ml-3" htmlFor="password">
                비밀번호
              </label>
              <input 
                type="password" 
                id="password" 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                placeholder="6자 이상"
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium ml-3" htmlFor="passwordcheck">
                비밀번호 확인
              </label>
              <input 
                type="password" 
                id="passwordcheck" 
                name="passwordcheck"
                value={formData.passwordcheck}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                required 
              />
            </div>

            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="terms" 
                name="terms"
                checked={formData.terms}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 ml-3" 
                required 
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-500">
                <a href="#" onClick={notready} className="text-indigo-500 hover:text-indigo-600">이용약관</a>과{' '}
                <a href="#" onClick={notready} className="text-indigo-500 hover:text-indigo-600">개인정보처리방침</a>에 동의합니다
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : '계정 만들기'}
            </button>

            <div className="text-center text-sm text-gray-500">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-indigo-500 hover:text-indigo-600">로그인</Link>
            </div>
          </form>
        </div>
      </div>

      <FadeAlert
        show={showAlert}
        message={alertMessage}
        type={alertType}
        position="bottom"
      />
    </div>
  );
};

export default Regist;