/**
 * 사용자 정보 설정 페이지 컴포넌트
 * - 사용자 프로필 정보 수정
 * - 비밀번호 변경 (모달)
 * - 손 사진 등록 (가상 착용용)
 * - 계정 설정
 * - 로그아웃 기능
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';
import BottomNavigation from '../Common/BottomNavigation';
import BackButton from '../Common/Buttons/BackButton';
import PasswordChangeModal from '../Common/PasswordChangeModal';
import PasswordChangeSuccessModal from '../Common/PasswordChangeSuccessModal';
import usericon from '../Assets/icons/usericon.png';
import imageicon from '../Assets/icons/imageicon.png';
import { getWishlistItems, uploadHandImage, getHandImages, setDefaultHandImage, deleteHandImage, getHandImageDownloadUrl, downloadHandImage, updateUser } from '../../utils/api';

function UserSettings() {
  const { user, isLoggedIn, logout, updateUser: updateUserContext } = useAuth();
  const { alertMessage, alertType, showAlert, showFadeAlert } = useFadeAlert();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPasswordSuccessModalOpen, setIsPasswordSuccessModalOpen] = useState(false);
  const [handImages, setHandImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const navigate = useNavigate();

  // 찜목록 개수와 손 사진 목록 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 찜목록 개수 로드
        const items = await getWishlistItems();
        setWishlistCount(items.length);
        
        // 손 사진 목록 로드
        const handImagesData = await getHandImages();
        const handImagesWithBlobs = await Promise.all(
          handImagesData.map(async (img) => {
            try {
              const blob = await downloadHandImage(img.id);
              const url = URL.createObjectURL(blob);
              return {
                id: img.id,
                file: null,
                url: url,
                name: img.original_filename,
                isDefault: img.is_default
              };
            } catch (error) {
              console.error(`손 사진 ${img.id} 로드 실패:`, error);
              return {
                id: img.id,
                file: null,
                url: null,
                name: img.original_filename,
                isDefault: img.is_default
              };
            }
          })
        );
        setHandImages(handImagesWithBlobs);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        setWishlistCount(0);
      }
    };
    fetchData();
  }, []);

  // 사용자 정보가 변경될 때 formData 업데이트
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  // 로그인 상태 확인
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  // 컴포넌트 언마운트 시 Blob URL 정리
  useEffect(() => {
    return () => {
      handImages.forEach(image => {
        if (image.url && image.url.startsWith('blob:')) {
          URL.revokeObjectURL(image.url);
        }
      });
    };
  }, [handImages]);

  // 폼 데이터 변경 처리
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 프로필 정보 저장
  const handleSaveProfile = async () => {
    try {
      const updatedUser = await updateUser(formData);
      setIsEditing(false);
      showFadeAlert('프로필 정보가 성공적으로 업데이트되었습니다.', 'success');
      
      // AuthContext의 사용자 정보 업데이트
      updateUserContext(updatedUser);
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      
      // 사용자 친화적인 에러 메시지 생성
      let errorMessage = '프로필 업데이트에 실패했습니다.';
      
      if (error.message) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('이미 사용 중인 닉네임')) {
          errorMessage = '이미 사용 중인 닉네임입니다. 다른 닉네임을 사용해주세요.';
        } else if (errorText.includes('닉네임')) {
          errorMessage = '닉네임 형식이 올바르지 않습니다.';
        } else if (errorText.includes('전화번호')) {
          errorMessage = '전화번호 형식이 올바르지 않습니다.';
        } else if (errorText.includes('주소')) {
          errorMessage = '주소 형식이 올바르지 않습니다.';
        } else if (errorText.includes('400')) {
          // 백엔드에서 오는 구체적인 에러 메시지 추출
          const match = error.message.match(/400: (.+)/);
          if (match) {
            errorMessage = match[1];
          }
        }
      }
      
      showFadeAlert(errorMessage, 'error');
    }
  };

  // 비밀번호 변경 처리
  const handlePasswordChange = async (passwordData) => {
    try {
      const updatedUser = await updateUser({
        current_password: passwordData.currentPassword,
        password: passwordData.newPassword
      });
      // AuthContext의 사용자 정보 업데이트
      updateUserContext(updatedUser);
      
      // 비밀번호 변경 완료 모달 표시
      setIsPasswordSuccessModalOpen(true);
      
      return Promise.resolve();
    } catch (error) {
      console.error('비밀번호 변경 실패:', error);
      
      // 사용자 친화적인 에러 메시지 생성
      let errorMessage = '비밀번호 변경에 실패했습니다.';
      
      if (error.message) {
        const errorText = error.message.toLowerCase();
        
        // 백엔드에서 오는 구체적인 에러 메시지 추출 (400: 메시지 형식)
        if (errorText.includes('400:')) {
          const match = error.message.match(/400: (.+)/);
          if (match) {
            const backendMessage = match[1];
            
            // 백엔드 비밀번호 검증 패턴에 따른 메시지 매핑
            if (backendMessage.includes('현재 비밀번호가 올바르지 않습니다')) {
              errorMessage = '현재 비밀번호가 올바르지 않습니다.';
            } else if (backendMessage.includes('현재 비밀번호를 입력해주세요')) {
              errorMessage = '현재 비밀번호를 입력해주세요.';
            } else if (backendMessage.includes('비밀번호는 최소 8자 이상이어야 합니다')) {
              errorMessage = '새 비밀번호는 최소 8자 이상이어야 합니다.';
            } else if (backendMessage.includes('비밀번호에 대문자를 포함해야 합니다')) {
              errorMessage = '새 비밀번호에 대문자를 포함해야 합니다.';
            } else if (backendMessage.includes('비밀번호에 소문자를 포함해야 합니다')) {
              errorMessage = '새 비밀번호에 소문자를 포함해야 합니다.';
            } else if (backendMessage.includes('비밀번호에 숫자를 포함해야 합니다')) {
              errorMessage = '새 비밀번호에 숫자를 포함해야 합니다.';
            } else if (backendMessage.includes('비밀번호에 특수문자를 포함해야 합니다')) {
              errorMessage = '새 비밀번호에 특수문자를 포함해야 합니다.';
            } else {
              // 백엔드에서 오는 다른 메시지들
              errorMessage = backendMessage;
            }
          }
        } else {
          // 직접적인 에러 메시지 처리
          if (errorText.includes('현재 비밀번호가 올바르지 않습니다')) {
            errorMessage = '현재 비밀번호가 올바르지 않습니다.';
          } else if (errorText.includes('현재 비밀번호를 입력해주세요')) {
            errorMessage = '현재 비밀번호를 입력해주세요.';
          } else if (errorText.includes('비밀번호는 최소 8자 이상')) {
            errorMessage = '새 비밀번호는 최소 8자 이상이어야 합니다.';
          } else if (errorText.includes('비밀번호에 대문자를 포함')) {
            errorMessage = '새 비밀번호에 대문자를 포함해야 합니다.';
          } else if (errorText.includes('비밀번호에 소문자를 포함')) {
            errorMessage = '새 비밀번호에 소문자를 포함해야 합니다.';
          } else if (errorText.includes('비밀번호에 숫자를 포함')) {
            errorMessage = '새 비밀번호에 숫자를 포함해야 합니다.';
          } else if (errorText.includes('비밀번호에 특수문자를 포함')) {
            errorMessage = '새 비밀번호에 특수문자를 포함해야 합니다.';
          }
        }
      }
      
      return Promise.reject(new Error(errorMessage));
    }
  };

  // 비밀번호 변경 완료 후 로그아웃 처리
  const handlePasswordChangeSuccess = () => {
    setIsPasswordSuccessModalOpen(false);
    logout();
    navigate('/login');
    showFadeAlert('비밀번호가 변경되었습니다. 다시 로그인해주세요.', 'info');
  };

  // 손 사진 업로드 처리
  const handleHandImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      showFadeAlert('이미지 파일만 업로드 가능합니다.', 'error');
      return;
    }

    setIsUploading(true);
    
    try {
              // 각 파일을 서버에 업로드
        for (const file of imageFiles) {
          const uploadedImage = await uploadHandImage(file);
          
          // 업로드된 이미지를 Blob으로 다운로드하여 URL 생성
          try {
            const blob = await downloadHandImage(uploadedImage.id);
            const url = URL.createObjectURL(blob);
            
            // 업로드된 이미지를 목록에 추가
            setHandImages(prev => [...prev, {
              id: uploadedImage.id,
              file: null,
              url: url,
              name: uploadedImage.original_filename,
              isDefault: uploadedImage.is_default
            }]);
          } catch (error) {
            console.error('업로드된 이미지 로드 실패:', error);
            // URL 생성 실패 시에도 목록에 추가 (이미지는 표시되지 않음)
            setHandImages(prev => [...prev, {
              id: uploadedImage.id,
              file: null,
              url: null,
              name: uploadedImage.original_filename,
              isDefault: uploadedImage.is_default
            }]);
          }
        }
      
      showFadeAlert(`${imageFiles.length}개의 손 사진이 성공적으로 업로드되었습니다.`, 'success');
    } catch (error) {
      console.error('손 사진 업로드 실패:', error);
      
      // 사용자 친화적인 에러 메시지 생성
      let errorMessage = '손 사진 업로드에 실패했습니다.';
      
      if (error.message) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('이미지 파일만 업로드')) {
          errorMessage = '이미지 파일만 업로드 가능합니다.';
        } else if (errorText.includes('파일 크기는 5mb 이하')) {
          errorMessage = '파일 크기는 5MB 이하여야 합니다.';
        } else if (errorText.includes('파일 업로드 중 오류')) {
          errorMessage = '파일 업로드 중 오류가 발생했습니다. 다시 시도해주세요.';
        } else if (errorText.includes('400')) {
          // 백엔드에서 오는 구체적인 에러 메시지 추출
          const match = error.message.match(/400: (.+)/);
          if (match) {
            errorMessage = match[1];
          }
        }
      }
      
      showFadeAlert(errorMessage, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // 손 사진 삭제
  const handleDeleteHandImage = async (imageId) => {
    try {
      await deleteHandImage(imageId);
      setHandImages(prev => prev.filter(img => img.id !== imageId));
      showFadeAlert('손 사진이 삭제되었습니다.', 'info');
    } catch (error) {
      console.error('손 사진 삭제 실패:', error);
      
      // 사용자 친화적인 에러 메시지 생성
      let errorMessage = '손 사진 삭제에 실패했습니다.';
      
      if (error.message) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('손 사진을 찾을 수 없습니다')) {
          errorMessage = '삭제할 손 사진을 찾을 수 없습니다.';
        } else if (errorText.includes('400')) {
          // 백엔드에서 오는 구체적인 에러 메시지 추출
          const match = error.message.match(/400: (.+)/);
          if (match) {
            errorMessage = match[1];
          }
        }
      }
      
      showFadeAlert(errorMessage, 'error');
    }
  };

  // 손 사진 기본 설정
  const handleSetDefaultHandImage = async (imageId) => {
    try {
      await setDefaultHandImage(imageId);
      // 목록에서 기본 설정 상태 업데이트
      setHandImages(prev => prev.map(img => ({
        ...img,
        isDefault: img.id === imageId
      })));
      showFadeAlert('기본 손 사진이 설정되었습니다.', 'success');
    } catch (error) {
      console.error('기본 손 사진 설정 실패:', error);
      
      // 사용자 친화적인 에러 메시지 생성
      let errorMessage = '기본 손 사진 설정에 실패했습니다.';
      
      if (error.message) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('손 사진을 찾을 수 없습니다')) {
          errorMessage = '설정할 손 사진을 찾을 수 없습니다.';
        } else if (errorText.includes('기본 설정 중 오류')) {
          errorMessage = '기본 설정 중 오류가 발생했습니다. 다시 시도해주세요.';
        } else if (errorText.includes('400')) {
          // 백엔드에서 오는 구체적인 에러 메시지 추출
          const match = error.message.match(/400: (.+)/);
          if (match) {
            errorMessage = match[1];
          }
        }
      }
      
      showFadeAlert(errorMessage, 'error');
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    logout();
    navigate('/');
    showFadeAlert('로그아웃되었습니다.', 'info');
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4 overflow-hidden">
      {/* 메인 컨테이너 */}
      <div className="w-full max-w-md h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg flex flex-col">
        {/* 헤더 - 고정 */}
        <header className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <BackButton className="mt-2" />
          <h1 className="mt-2 text-xl font-bold text-gray-800">설정</h1>
          <div className="w-10"></div>
        </header>

        {/* 사용자 프로필 섹션 - 고정 */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <img src={usericon} alt="사용자" className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800">{user?.name || '사용자'}</h2>
              <p className="text-sm text-gray-600">{user?.email || '이메일 없음'}</p>
            </div>
          </div>
        </div>

        {/* 설정 메뉴 - 스크롤 가능한 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 mb-8">
          {/* 프로필 정보 수정 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">프로필 정보</h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="닉네임을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="전화번호를 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="주소를 입력하세요"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">이름</span>
                  <span className="font-medium">{user?.name || '설정되지 않음'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">이메일</span>
                  <span className="font-medium">{user?.email || '설정되지 않음'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">닉네임</span>
                  <span className="font-medium">{user?.username || '설정되지 않음'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">전화번호</span>
                  <span className="font-medium">{user?.phone || '설정되지 않음'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="mr-10 text-gray-600 whitespace-nowrap">주소</span>
                  <span className="font-medium text-sm break-words whitespace-normal">{user?.address || '설정되지 않음'}</span>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors mt-4"
                >
                  수정하기
                </button>
              </div>
            )}
          </div>

          {/* 비밀번호 변경 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">비밀번호 변경</h3>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
              비밀번호 변경하기
            </button>
          </div>

          {/* 손 사진 관리 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">손 사진 관리</h3>
            <p className="text-sm text-gray-600 mb-4">
              가상 착용과 챗봇에서 사용할 손 사진을 등록하세요.
            </p>
            
            {/* 업로드 버튼 */}
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={isUploading}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors mb-4 flex items-center justify-center space-x-2"
            >
              <img src={imageicon} alt="이미지" className="w-4 h-4" />
              <span>{isUploading ? '업로드 중...' : '손 사진 추가'}</span>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleHandImageUpload}
              className="hidden"
            />

            {/* 등록된 손 사진 목록 */}
            {handImages.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">등록된 손 사진 ({handImages.length})</h4>
                <div className="grid grid-cols-2 gap-3">
                  {handImages.map((image) => (
                    <div key={image.id} className="relative group">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt="손 사진"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500 text-sm">이미지 로드 실패</span>
                        </div>
                      )}
                      {/* 기본 설정 표시 */}
                      {image.isDefault && (
                        <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          기본
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                          {!image.isDefault && (
                            <button
                              onClick={() => handleSetDefaultHandImage(image.id)}
                              className="bg-blue-500 text-white p-1 rounded text-xs hover:bg-blue-600"
                              title="기본으로 설정"
                            >
                              기본
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteHandImage(image.id)}
                            className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600"
                            title="삭제"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 계정 관리 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">계정 관리</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/orders')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                주문 내역
              </button>
              <button
                onClick={() => navigate('/wishlist')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                찜 목록
              </button>
              <button
                onClick={() => navigate('/cart')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                장바구니
              </button>
            </div>
          </div>

          {/* 로그아웃 */}
          <div className="bg-red-50 rounded-xl p-4">
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onPasswordChange={handlePasswordChange}
      />

      {/* 비밀번호 변경 완료 모달 */}
      <PasswordChangeSuccessModal
        isOpen={isPasswordSuccessModalOpen}
        onConfirm={handlePasswordChangeSuccess}
      />

      {/* 하단 고정 네비게이션 바 */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-lg flex justify-around items-center py-3">
        <BottomNavigation
          isLoggedIn={isLoggedIn}
          user={user}
          wishlistCount={wishlistCount}
          onLogout={logout}
          onCategoryClick={() => showFadeAlert('준비중입니다.', 'error')}
        />
      </div>
      <FadeAlert message={alertMessage} type={alertType} show={showAlert} />
    </div>
  );
}

export default UserSettings; 