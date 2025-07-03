import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, escapeHtml } from '../../utils/security';
import JH from '../Assets/icons/JH.png';

const notready = () => {
  alert('준비중입니다.')
}

// 로그인 페이지 컴포넌트
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 입력값 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 로그인 폼 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 입력값 검증
    if (!validateEmail(formData.email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      // XSS 방지를 위한 입력값 escape
      const sanitizedEmail = escapeHtml(formData.email.trim());
      
      const result = await login(sanitizedEmail, formData.password);
      
      // 로그인 성공 시 메인 페이지로 이동
      navigate('/');
      
    } catch (error) {
      // 에러 메시지 파싱 및 표시
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      
      if (error.message) {
        if (error.message.includes('401')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
        } else if (error.message.includes('404')) {
          errorMessage = '존재하지 않는 사용자입니다.';
        } else if (error.message.includes('422')) {
          errorMessage = '입력 정보를 확인해주세요.';
        } else if (error.message.includes('500')) {
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      
      <div className="min-h-screen mx-auto bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto w-full bg-white rounded-xl p-8 shadow-2xl">
          {/* 로고 섹션 */}
          <div className="flex justify-center mb-8">
            <img 
              src={JH} 
              alt="Logo" 
              className="h-12 w-12 rounded-full shadow-lg"
            />
          </div>

          {/* 헤더 섹션 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">로그인</h1>
            <p className="text-gray-600">이메일로 로그인</p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* 폼 섹션 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2">이메일</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-black placeholder-gray-300" 
                placeholder="이메일을 입력해주세요"
              />
            </div>

            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2">비밀번호</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-black placeholder-gray-300" 
                placeholder="비밀번호를 입력해주세요"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 rounded border-gray-600 bg-white text-black focus:ring-black"
                />
                <label className="ml-2 text-sm text-gray-600">아이디 저장</label>
              </div>
              <a href="#" onClick={notready} className="text-sm text-blue-500 hover:text-blue-700">비밀번호 찾기</a>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 
              focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 소셜 로그인 섹션 */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-600">소셜 로그인</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button onClick={notready} className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg border border-gray-200/20 transition-colors">
                <i className="fab fa-google"></i>
              </button>
              <button onClick={notready} className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg border border-gray-200/20 transition-colors">
                <i className="fab fa-github"></i>
              </button>
              <button onClick={notready} className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg border border-gray-200/20 transition-colors">
                <i className="fab fa-twitter"></i>
              </button>
            </div>
          </div>

          {/* 회원가입 링크 */}
          <p className="mt-8 text-center text-sm text-gray-600">
            계정이 없으신가요? 
            <Link to="/regist" className="font-medium text-blue-500 hover:text-blue-700">회원가입</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;