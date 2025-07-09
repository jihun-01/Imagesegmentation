import React, { useRef, useState, useEffect } from 'react';
import plusicon from '../Assets/icons/plusicon.png';
import backicon from '../Assets/icons/backicon.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { formatPrice } from '../../utils/formatUtils';
import BackButton from '../Common/Buttons/BackButton';
import { getHandImages, downloadHandImage } from '../../utils/api';


const VirtualWear = ({ onImageSelect }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [handImages, setHandImages] = useState([]);
  const [selectedHandImage, setSelectedHandImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);

  
  // 상품 상세페이지에서 전달받은 시계 정보
  const location = useLocation();
  const navigate = useNavigate();
  const selectedWatch = location.state?.selectedWatch;

  // 등록된 손 사진 로드
  useEffect(() => {
    const loadHandImages = async () => {
      setIsLoadingImages(true);
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
        setIsLoadingImages(false);
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
  
  
// API URL은 config에서 가져옴

  // 등록된 손 사진 선택
  const handleHandImageSelect = async (image) => {
    if (isProcessing) return;
    
    try {
      // Blob URL에서 File 객체 생성
      const response = await fetch(image.url);
      const blob = await response.blob();
      const file = new File([blob], image.name, { type: blob.type });
      
      setSelectedHandImage(image);
      setSelectedFile(file);
      
      // 가상 착용 처리 시작
      processVirtualTryOn(file);
      
      if (onImageSelect) {
        onImageSelect(file);
      }
    } catch (error) {
      setError('손 사진을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 새 사진 업로드 버튼 클릭
  const handleNewImageUpload = () => {
    if (!isProcessing) {
      fileInputRef.current.click();
    }
  };

  // 이미지 선택 모달 토글
  const toggleImageSelector = () => {
    if (!isProcessing) {
      setShowImageSelector(!showImageSelector);
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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4 overflow-hidden">
      <div className="w-full max-w-md min-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg p-6 flex flex-col overflow-y-auto">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          <h1 className="text-xl font-bold text-gray-800">가상 착용</h1>
          <div className="w-10"></div> {/* 공간 맞추기용 */}
        </div>
          
        {/* 선택된 시계 정보 표시 */}
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
                <p className="text-sm text-gray-600">{formatPrice(selectedWatch.price)}</p>
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

        {/* 이미지 선택 영역 */}
        <div className="flex-1 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              {isProcessing ? 'AI가 가상 착용을 처리하는 중...' : '손 사진 선택'}
            </h2>
            
            {isProcessing ? (
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="w-full h-80 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mb-4"></div>
                  <p className="text-gray-600 text-center">AI 처리 중...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 등록된 손 사진이 있는 경우 */}
                {handImages.length > 0 && (
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <h3 className="text-md font-semibold mb-3 text-gray-800">등록된 손 사진</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {handImages.map((image) => (
                        <div 
                          key={image.id} 
                          className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            selectedHandImage?.id === image.id 
                              ? 'border-blue-500 shadow-lg' 
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                          onClick={() => handleHandImageSelect(image)}
                        >
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-24 object-cover"
                          />
                          {image.isDefault && (
                            <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              기본
                            </div>
                          )}
                          {selectedHandImage?.id === image.id && (
                            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                              <div className="bg-blue-500 text-white rounded-full p-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">등록된 손 사진을 클릭하여 선택하세요</p>
                  </div>
                )}

                {/* 새 사진 업로드 버튼 */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <button
                    className="w-full bg-gray-100 rounded-2xl p-6 shadow-md transition hover:bg-gray-200 flex flex-col items-center"
                    onClick={handleNewImageUpload}
                    type="button"
                    disabled={isProcessing}
                  >
                    <img src={plusicon} alt="새 사진 업로드" className="w-16 h-16 object-contain mb-2" />
                    <span className="text-gray-700 font-medium">새 손 사진 업로드</span>
                  </button>
                </div>

                {/* 손 사진이 없는 경우 안내 */}
                {handImages.length === 0 && !isLoadingImages && (
                  <div className="bg-yellow-50 rounded-2xl p-4">
                    <p className="text-sm text-yellow-800">
                      등록된 손 사진이 없습니다. 새 사진을 업로드하거나 
                      <Link to="/user-settings" className="text-blue-600 underline ml-1">
                        사용자 설정
                      </Link>
                      에서 손 사진을 등록해주세요.
                    </p>
                  </div>
                )}

                {/* 로딩 중 */}
                {isLoadingImages && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">손 사진을 불러오는 중...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 숨겨진 파일 입력 */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
        
        {/* 안내 텍스트 */}
        <div className='flex flex-col items-center'>
          <div className="mt-6 text-center space-y-2">
            {selectedFile && !isProcessing && (
              <p className="text-sm text-gray-700">
                선택된 파일: {selectedFile.name}
              </p>
            )}
            
            <p className="text-xs text-gray-600">
              {isProcessing ? 'AI가 가상 착용을 처리하고 있습니다...' : '등록된 손 사진을 선택하거나 새 사진을 업로드해주세요'}
            </p>
            
            <p className="text-xs text-gray-500">
              지원 형식: JPG, PNG (최대 10MB)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualWear;