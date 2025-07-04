import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';

const NotFound = () => {
    const navigate = useNavigate();
    const { showFadeAlert, alertMessage, alertType, showAlert } = useFadeAlert();
    const notready = () => {
        showFadeAlert('준비중입니다.', 'error');
    };
    // 페이지 로드 시 애니메이션 효과
    useEffect(() => {
        const elements = document.querySelectorAll('.space-y-8 > div');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }, []);

    return (
        <div className="max-w-md mx-auto p-4 min-h-screen flex items-center justify-center bg-white">
            <div className="text-center space-y-8">
                {/* 404 Large Text */}
                <div className="relative">
                    <h1 className="text-[180px] font-bold text-indigo-500 leading-none">404</h1>
                    <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent bottom-[20%]"></div>
                </div>
                
                {/* Error Message */}
                <div className="space-y-4">
                    <h2 className="text-3xl font-semibold text-black">
                        페이지를 찾을 수 없습니다.
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto">
                    찾고 계신 페이지가 삭제되었거나, 이름이 변경되었거나, 일시적으로 사용할 수 없습니다.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button onClick={() => navigate(-1)} className="px-6 py-3 bg-gray-50 text-black rounded-lg hover:bg-gray-100 transition-colors">
                        뒤로가기
                    </button>
                    <a href="/" className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                        홈으로 이동
                    </a>
                </div>

                {/* Support Section */}
                <div className="pt-8">
                    <p className="text-gray-500">
                        도움이 필요하신가요? 
                        <a onClick={notready} className="text-indigo-500 hover:text-indigo-600">문의하기</a>
                    </p>
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

export default NotFound;