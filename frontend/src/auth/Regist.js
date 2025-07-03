import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/api';
import { validateEmail, validatePassword, escapeHtml } from '../utils/security';
import JH from '../components/Assets/icons/JH.png';

const notready = () => {
  alert('준비중입니다.')
}

// 회원가입 페이지 컴포넌트
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
  const [error, setError] = useState('');

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
    setError('');

    // 입력값 검증
    if (!formData.username || formData.username.length < 3) {
      setError('닉네임은 3자 이상 입력해주세요.');
      setLoading(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      setLoading(false);
      return;
    }

    if (!formData.name || formData.name.length < 2) {
      setError('이름은 2자 이상 입력해주세요.');
      setLoading(false);
      return;
    }

    // 비밀번호 강도 검증
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(' '));
      setLoading(false);
      return;
    }

    // 비밀번호 확인
    if (formData.password !== formData.passwordcheck) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    // 이용약관 동의 확인
    if (!formData.terms) {
      setError('이용약관에 동의해주세요.');
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
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
      
    } catch (error) {
      setError(error.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-gray-100 text-black">
      {/* 미니멀 헤더 */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img 
              src={JH} 
              alt="Logo" 
              className="w-16 h-16"
            />
            <span className="font-semibold text-xl">JH SHOP</span>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto">
        <div className="max-w-md mx-auto my-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">회원가입</h2>
            <p className="text-gray-500">이메일로 회원가입</p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-2 ml-3" htmlFor="username">
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
              <label className="block text-sm font-medium mb-2 ml-3" htmlFor="email">
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
              <label className="block text-sm font-medium mb-2 ml-3" htmlFor="name">
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
              <label className="block text-sm font-medium mb-2 ml-3" htmlFor="phone">
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
              <label className="block text-sm font-medium mb-2 ml-3" htmlFor="password">
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
              <label className="block text-sm font-medium mb-2 ml-3" htmlFor="passwordcheck">
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

      {/* 미니멀 푸터 */}
      <div className="border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex justify-between items-center text-sm whitespace-nowrap gap-2 text-gray-500">
            <div>© 2025 JH SHOP. All rights reserved.</div>
            <div className="flex gap-4">
              <a href="#" onClick={notready} className="hover:text-indigo-500 text-sm">이용약관</a>
              <a href="#" onClick={notready} className="hover:text-indigo-500 text-sm">개인정보처리방침</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Regist;