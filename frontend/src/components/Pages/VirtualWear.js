import React, { useRef, useState } from 'react';
import plusicon from '../Assets/icons/plusicon.png';
import backicon from '../Assets/icons/backicon.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';

const VirtualWear = ({ onImageSelect }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  
  // 상품 상세페이지에서 전달받은 시계 정보
  const location = useLocation();
  const navigate = useNavigate();
  const selectedWatch = location.state?.selectedWatch;
  
  
// API URL은 config에서 가져옴

  // 버튼 클릭 시 파일 선택창 열기
  const handleButtonClick = () => {
    if (!isProcessing) {
      fileInputRef.current.click();
    }
  };

  // 가상 착용 처리 함수
  const processVirtualTryOn = async (handImageFile) => {
    if (!selectedWatch) {
      setError('시계가 선택되지 않았습니다. 상품 상세페이지에서 시계를 선택해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // 손 이미지 추가
      formData.append('hand_image', handImageFile);
      
      // 시계 이미지 가져오기 및 추가
      const watchImageBlob = await fetchWatchImage(selectedWatch.image);
      formData.append('watch_image', watchImageBlob, 'watch.jpg');
      
      // 시계 ID 추가 (선택사항)
      if (selectedWatch.id) {
        formData.append('watch_id', selectedWatch.id);
      }
      

      
      const response = await fetch(`${API_BASE_URL}/virtual-try-on`, {
        method: 'POST',
        body: formData,
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.detail || `서버 오류: ${response.status}`);
      }
      
      if (responseData.success) {
        
        // 결과 페이지로 이동
        navigate('/virtual-result', {
          state: {
            result: responseData.result,
            selectedWatch: selectedWatch,
            originalHandImage: URL.createObjectURL(handImageFile)
          }
        });
      } else {
        setError(responseData.message || '가상 착용 처리에 실패했습니다.');
      }
      
    } catch (err) {
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('네트워크 연결에 실패했습니다. 서버가 실행 중인지 확인하세요.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인하세요.');
      } else {
        setError('가상 착용 처리 중 오류가 발생했습니다: ' + err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 시계 이미지를 Blob으로 가져오는 함수
  const fetchWatchImage = async (imageUrl) => {
    try {
      // 상대 경로인 경우 절대 경로로 변환
      let fullImageUrl = imageUrl;
      if (imageUrl.startsWith('./') || imageUrl.startsWith('/')) {
        fullImageUrl = `${window.location.origin}${imageUrl.replace('./', '/')}`;
      }
      
      const response = await fetch(fullImageUrl);
      if (!response.ok) {
        throw new Error(`이미지 로드 실패: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      throw new Error('시계 이미지를 불러올 수 없습니다.');
    }
  };

  // 파일 선택 처리
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
      processVirtualTryOn(file);
      
      if (onImageSelect) {
        onImageSelect(file);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto flex flex-col min-h-[calc(100vh-56px)] bg-gray-100 px-4 py-8">
      <div className="w-full h-full bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center">
        <Link to="/">
          <button className="absolute top-4 left-4 bg-white rounded-xl p-2 shadow">
            <img src={backicon} alt="backicon" className="w-6 h-6" />
          </button>
        </Link>

        {/* 선택된 시계 정보 표시 */}
        {selectedWatch && (
          <div className="w-full bg-blue-50 rounded-2xl p-4 mb-4 text-center">
            <div className="flex items-center justify-center gap-4">
              <img 
                src={selectedWatch.image} 
                alt={selectedWatch.name} 
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div>
                <p className="text-lg font-semibold text-gray-800 line-clamp-1">{selectedWatch.name}</p>
                <p className="text-sm text-gray-600">선택된 시계</p>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 표시 */}
        {error && (
          <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex">
              <div className="py-1">
                <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold">오류 발생</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <p className="text-black text-lg font-semibold mb-8 mt-2 text-center whitespace-break-spaces">
          {isProcessing ? 'AI가 가상 착용을 처리하는 중...' : '시계를 착용해볼 손 사진을 업로드 해 주세요'}
        </p>
        
        {/* 업로드 버튼 */}
        <button
          className={`bg-gray-100 rounded-2xl p-8 shadow-md transition flex flex-col items-center ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'
          }`}
          onClick={handleButtonClick}
          type="button"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="w-96 h-96 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-gray-600 text-center">AI 처리 중...</p>
            </div>
          ) : (
            <img src={plusicon} alt="이미지 업로드" className="w-96 h-96 object-contain" />
          )}
        </button>
        
        {/* 숨겨진 파일 입력 */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
        
        {/* 선택된 파일 표시 */}
        {selectedFile && !isProcessing && (
          <div className="text-black mt-4 text-center">
            선택된 파일: {selectedFile.name}
          </div>
        )}
        
        {/* 안내 텍스트 */}
        <span className="text-sm text-black mt-6 ">
          {isProcessing ? 'AI가 가상 착용을 처리하고 있습니다...' : '업로드 버튼을 눌러 시계를 착용해볼 손 사진을 업로드 해 주세요'}
        </span>
        
        <span className="text-xs text-gray-500 mt-2">
          지원 형식: JPG, PNG (최대 10MB)
        </span>
      </div>
    </div>
  );
};

export default VirtualWear;