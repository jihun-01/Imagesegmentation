import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import backicon from '../Assets/icons/backicon.png';

const VirtualResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { result, selectedWatch, originalHandImage } = location.state || {};

  // 결과 데이터가 없으면 이전 페이지로 리다이렉트
  if (!result) {
    navigate(-1);
    return null;
  }

  const handleSaveImage = () => {
    // base64 이미지를 다운로드하는 함수
    const link = document.createElement('a');
    link.href = result.result_image;
    link.download = `virtual_try_on_${result.session_id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTryAgain = () => {
    // 다시 시도 - VirtualWear 페이지로 돌아가기
    navigate('/virtual-wear', {
      state: { selectedWatch }
    });
  };

  return (
    <div className="max-w-screen-sm mx-auto flex flex-col min-h-[calc(100vh-56px)] bg-gray-100 px-4 py-8">
      <div className="w-full h-full bg-white rounded-2xl shadow-lg p-6 flex flex-col">
        
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
                <p className="text-sm text-gray-600">{selectedWatch.price}</p>
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
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleTryAgain}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            다시 시도
          </button>
          
          <button
            onClick={handleSaveImage}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition"
          >
            이미지 저장
          </button>
        </div>

        {/* 쇼핑 계속하기 */}
        <Link to="/watch-store" className="mt-3">
          <button className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition">
            다른 시계 구경하기
          </button>
        </Link>

        {/* 세션 정보 (디버깅용 - 실제 서비스에서는 숨김) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
            <p>세션 ID: {result.session_id}</p>
            <p>처리 완료 시간: {new Date().toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualResult; 