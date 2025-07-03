"""
가상 시계 착용 백엔드 API 서버
- 이미지 리사이징 서비스 (WatchStore용)
- 가상 시계 착용 처리
- 손 영역 및 시계 영역 추출
- 손목 위치 분석 및 각도 계산
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import cv2
import numpy as np
import io
from PIL import Image
import base64
import os
from typing import Optional
import uuid
import hashlib
from hand_watch_segmentation import HandWatchSegmentation
from dotenv import load_dotenv

# 라우터 임포트
from routes.auth import router as auth_router
from routes.products import router as products_router
from routes.cart import router as cart_router
from routes.wishlist import router as wishlist_router

# 보안 미들웨어 임포트
from security_middleware import SecurityMiddleware, RequestSizeMiddleware

# 데이터베이스 관련 임포트
from database import SessionLocal, get_db
from models import Product

# FastAPI 애플리케이션 인스턴스 생성
app = FastAPI(
    title="쇼핑몰 API", 
    version="0.1.0", 
    description="상품리스트 조회, 장바구니, 위시리스트, 가상 시계 착용 기능 제공"
)

# 환경변수 로드
load_dotenv()

# CORS 설정 (보안 강화)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"

# 보안 미들웨어 등록 (순서 중요!)
app.add_middleware(SecurityMiddleware, max_requests=2000, time_window=60)  # Rate Limiting (개발용: 2000회/분)
app.add_middleware(RequestSizeMiddleware, max_size=10*1024*1024)  # 요청 크기 제한

# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,      # 허용된 도메인만 접근 허용
    allow_credentials=CORS_ALLOW_CREDENTIALS,  # 쿠키 포함 요청 허용
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # 필요한 HTTP 메서드만 허용
    allow_headers=["*"],               # 모든 헤더 허용 (필요시 제한 가능)
)

# AI 세그멘테이션 시스템 초기화 (앱 시작 시 모델 로딩)
segmenter = HandWatchSegmentation()

# 파일 저장 디렉토리 설정
RESIZED_DIR = "resized"                # 리사이징된 이미지 저장 폴더

# 필요한 디렉토리 생성
os.makedirs(RESIZED_DIR, exist_ok=True)

# 정적 파일 서빙은 개별 엔드포인트에서 처리 (MIME 타입 정확성을 위해)

# 라우터 등록
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(wishlist_router)

@app.get("/", tags=["root"], summary="API 상태 확인")
async def root():
    """
    API 루트 엔드포인트 - 서버 실행 상태 확인
    """
    return {"message": "가상 시계 착용 API가 실행 중입니다."}

@app.get("/health", tags=["root"], summary="서버 헬스체크")
async def health_check():
    """
    서버 상태 확인 엔드포인트
    - 로드밸런서나 모니터링 시스템에서 사용
    """
    return {"status": "healthy", "message": "서버가 정상 작동 중입니다."}

@app.get("/debug/client-info", tags=["root"], summary="클라이언트 정보 디버깅")
async def debug_client_info(request: Request):
    """
    클라이언트 접속 정보 확인 (디버깅용)
    - 네트워크 문제 해결 시 사용
    - 클라이언트 IP, 헤더, URL 정보 반환
    """
    client_host = request.client.host if request.client else "Unknown"
    return {
        "client_host": client_host,
        "headers": dict(request.headers),
        "url": str(request.url),
        "method": request.method
    }

def resize_and_save(image_bytes, save_path):
    """
    백그라운드 이미지 리사이징 처리 함수
    - 원본 비율 유지하면서 최대 300x300 크기로 리사이징
    - WEBP 포맷으로 압축하여 용량 최적화
    - BackgroundTasks에서 비동기적으로 실행
    
    Args:
        image_bytes: 원본 이미지 바이트 데이터
        save_path: 저장할 파일 경로
    """
    try:
        # PIL Image 객체로 변환
        image = Image.open(io.BytesIO(image_bytes))
        
        # RGB 모드로 변환 (WEBP 저장을 위해)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 원본 크기 및 리사이징 비율 계산
        original_width, original_height = image.size
        max_size = 300
        ratio = min(max_size / original_width, max_size / original_height)
        
        # 새로운 크기 계산 (비율 유지)
        new_width = int(original_width * ratio)
        new_height = int(original_height * ratio)
        
        # 고품질 리사이징 (LANCZOS 알고리즘 사용)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # WEBP 포맷으로 최적화하여 저장
        image.save(save_path, format="WEBP", quality=85, optimize=True)
        
    except Exception as e:
        pass  # 에러 시 조용히 실패

# 파일 보안 설정
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024  # MB를 바이트로 변환
ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

def is_valid_image(file_bytes: bytes) -> bool:
    """
    이미지 파일의 매직 넘버를 확인하여 유효성 검증
    
    Args:
        file_bytes: 파일 바이트 데이터
        
    Returns:
        bool: 유효한 이미지 파일 여부
    """
    if len(file_bytes) < 4:
        return False
    
    # 이미지 파일 시그니처 (매직 넘버) 확인
    signatures = {
        b'\xff\xd8\xff': 'JPEG',
        b'\x89\x50\x4e\x47\x0d\x0a\x1a\x0a': 'PNG',
        b'\x52\x49\x46\x46': 'WEBP',  # RIFF 헤더 (WEBP 포함)
        b'\x47\x49\x46\x38': 'GIF'
    }
    
    for signature in signatures:
        if file_bytes.startswith(signature):
            return True
    
    return False

@app.post("/resize-image", tags=["이미지 리사이징"], summary="상품 이미지 리사이징")
async def resize_image(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    WatchStore 상품 목록용 이미지 리사이징 엔드포인트
    - 백그라운드에서 비동기 처리로 빠른 응답
    - 원본 비율 유지하면서 최대 300x300 크기로 리사이징
    - 중복 이미지는 캐시된 결과 반환
    - WEBP 포맷으로 압축하여 네트워크 최적화
    
    Args:
        background_tasks: FastAPI 백그라운드 작업 관리자
        file: 업로드된 이미지 파일
        
    Returns:
        dict: 처리 상태 및 이미지 URL 정보
    """
    
    try:
        # 보안 강화된 파일 검증
        if not file.content_type or file.content_type not in ALLOWED_FILE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"허용되지 않는 파일 형식입니다. 허용 형식: {', '.join(ALLOWED_FILE_TYPES)}"
            )
        
        # 파일 크기 제한 검사
        file_bytes = await file.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"파일 크기가 너무 큽니다. 최대 {MAX_FILE_SIZE // (1024*1024)}MB까지 허용됩니다."
            )
        
        # 이미지 파일 유효성 검증 (매직 넘버 확인)
        if not is_valid_image(file_bytes):
            raise HTTPException(
                status_code=400,
                detail="유효하지 않은 이미지 파일입니다."
            )
        
        # 파일 해시 생성으로 중복 확인
        file_hash = hashlib.md5(file_bytes).hexdigest()
        filename = f"{file_hash}.webp"
        save_path = os.path.join(RESIZED_DIR, filename)
        
        # 이미 처리된 파일인지 확인 (캐시 활용)
        if os.path.exists(save_path):
            return {
                "status": "완료",
                "message": "이미지 리사이징 완료 (캐시 사용)",
                "url": f"/images/{filename}",
                "cached": True
            }
        
        # 백그라운드에서 이미지 리사이징 처리
        background_tasks.add_task(resize_and_save, file_bytes, save_path)
        
        return {
            "status": "처리중",
            "message": "이미지 리사이징이 백그라운드에서 처리되고 있습니다",
            "url": f"/images/{filename}",
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"이미지 처리 중 오류가 발생했습니다: {str(e)}"
        )

@app.get("/images/{filename}", tags=["이미지 리사이징"], summary="리사이징된 이미지 다운로드")
async def get_resized_image(filename: str):
    """
    리사이징된 이미지 파일 제공 엔드포인트
    - 클라이언트에서 리사이징된 이미지를 요청할 때 사용
    - 브라우저 캐시 헤더 설정으로 성능 최적화
    - CORS 헤더 설정으로 크로스 도메인 지원
    
    Args:
        filename: 요청할 이미지 파일명
        
    Returns:
        FileResponse: 이미지 파일 응답
    """
    file_path = os.path.join(RESIZED_DIR, filename)
    
    # 파일 존재 여부 확인
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="이미지를 찾을 수 없습니다. 아직 처리 중이거나 파일이 존재하지 않습니다."
        )
    
    # 최적화된 응답 헤더와 함께 파일 반환
    return FileResponse(
        file_path,
        media_type="image/webp",
        headers={
            "Cache-Control": "public, max-age=3600",         # 1시간 브라우저 캐시
            "Access-Control-Allow-Origin": "*",              # CORS 허용
            "Access-Control-Allow-Methods": "GET, OPTIONS",  # 허용 메서드
            "Access-Control-Allow-Headers": "*"              # 허용 헤더
        }
    )

@app.post("/virtual-try-on", tags=["가상 시계 착용"], summary="AI 가상 시계 착용")
async def virtual_try_on(
    hand_image: UploadFile = File(...),
    watch_image: UploadFile = File(...),
    watch_id: Optional[str] = Form(None)
):
    """
    AI 기반 가상 시계 착용 처리 엔드포인트
    - 손 이미지와 시계 이미지를 합성하여 자연스러운 착용 효과 생성
    - 개선된 마스크 알고리즘으로 시계판 영역 정확도 향상
    - 메모리 기반 처리로 빠른 응답 시간
    - 손목 각도 및 위치 자동 감지
    - Base64 인코딩으로 결과 이미지 반환
    
    Args:
        hand_image: 손목이 보이는 손 이미지
        watch_image: 시계 제품 이미지
        watch_id: 시계 상품 ID (선택사항)
        
    Returns:
        dict: 성공 여부, 세션 ID, 합성된 이미지 데이터
    """
    # 입력 파일 유효성 검사
    if not hand_image.content_type or not hand_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="손 이미지 파일이 올바르지 않습니다.")
    
    if not watch_image.content_type or not watch_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="시계 이미지 파일이 올바르지 않습니다.")
    
    try:
        # 업로드된 이미지를 메모리에서 직접 읽기
        hand_image_bytes = await hand_image.read()
        watch_image_bytes = await watch_image.read()
        
        # AI 세그멘테이션 모델을 사용한 가상 착용 처리
        original_hand, result_image = segmenter.process_virtual_try_on_from_bytes(
            hand_image_bytes, watch_image_bytes
        )
        
        # 처리 결과 검증
        if original_hand is None or result_image is None:
            raise HTTPException(
                status_code=500, 
                detail="가상 착용 처리에 실패했습니다. 손목이 명확하게 보이는 이미지를 사용해주세요."
            )
        
        # 결과 이미지를 JPEG로 인코딩 후 Base64 변환
        _, buffer = cv2.imencode('.jpg', result_image)
        result_base64 = base64.b64encode(buffer.tobytes()).decode('utf-8')
        
        # 고유 세션 ID 생성
        session_id = str(uuid.uuid4())
        
        response_data = {
            "success": True,
            "message": "가상 착용이 성공적으로 완료되었습니다.",
            "result": {
                "session_id": session_id,
                "result_image": f"data:image/jpeg;base64,{result_base64}",
                "watch_id": watch_id
            }
        }
        

        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"가상 착용 처리 중 오류: {str(e)}")

@app.post("/extract-hand", tags=["가상 시계 착용"], summary="AI 손 영역 추출")
async def extract_hand_region(hand_image: UploadFile = File(...)):
    """
    AI 기반 손 영역 추출 및 손목 위치 분석 엔드포인트
    - 딥러닝 모델을 사용한 정확한 손 세그멘테이션
    - 손목 위치 좌표 및 각도 자동 계산
    - 다중 손목 감지 지원
    - 메모리 기반 처리로 빠른 응답
    
    Args:
        hand_image: 손이 포함된 이미지 파일
        
    Returns:
        dict: 감지된 손목 개수, 위치 좌표, 각도 정보
    """
    # 이미지 파일 유효성 검사
    if not hand_image.content_type or not hand_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일이 올바르지 않습니다.")
    
    try:
        # 업로드된 이미지를 메모리에서 읽기
        hand_image_bytes = await hand_image.read()
        
        # AI 모델을 사용한 손 영역 추출 및 분석
        hand_image_data, hand_mask, wrist_info_list = segmenter.extract_hand_region_from_bytes(hand_image_bytes)
        
        # 손목 감지 결과 검증
        if not wrist_info_list:
            raise HTTPException(
                status_code=400, 
                detail="손목을 찾을 수 없습니다. 손목이 명확하게 보이는 이미지를 사용해주세요."
            )
        
        # 손목 정보를 표준화된 형식으로 변환
        wrist_data = []
        for i, wrist_info in enumerate(wrist_info_list):
            if len(wrist_info) == 3:
                # 위치 좌표와 각도 정보가 모두 있는 경우
                x, y, angle = wrist_info
                wrist_data.append({"index": i, "position": {"x": x, "y": y}, "angle": angle})
            else:
                # 위치 좌표만 있는 경우 (각도는 0도로 설정)
                x, y = wrist_info
                wrist_data.append({"index": i, "position": {"x": x, "y": y}, "angle": 0})
        
        return {
            "success": True,
            "message": f"{len(wrist_info_list)}개의 손목을 발견했습니다.",
            "result": {
                "wrist_count": len(wrist_info_list),
                "wrist_positions": wrist_data,
                "image_size": {"width": hand_image_data.shape[1], "height": hand_image_data.shape[0]}
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"손 영역 추출 중 오류: {str(e)}")

@app.post("/extract-watch", tags=["가상 시계 착용"], summary="AI 시계 영역 추출")
async def extract_watch_region(watch_image: UploadFile = File(...)):
    """
    AI 기반 시계 영역 추출 및 분석 엔드포인트
    - 딥러닝 모델을 사용한 정확한 시계 세그멘테이션
    - 시계 영역 마스크 및 바운딩 박스 계산
    - 시계 영역 커버리지 비율 분석
    - 메모리 기반 처리로 빠른 응답
    
    Args:
        watch_image: 시계가 포함된 이미지 파일
        
    Returns:
        dict: 시계 영역 마스크 정보, 바운딩 박스, 커버리지 비율
    """
    # 이미지 파일 유효성 검사
    if not watch_image.content_type or not watch_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일이 올바르지 않습니다.")
    
    try:
        # 업로드된 이미지를 메모리에서 읽기
        watch_image_bytes = await watch_image.read()
        
        # AI 모델을 사용한 시계 영역 추출
        watch_image_data, watch_mask = segmenter.extract_watch_from_bytes(watch_image_bytes)
        
        # 마스크 영역 통계 계산
        mask_area = np.sum(watch_mask > 0)                    # 시계 영역 픽셀 수
        total_area = watch_mask.shape[0] * watch_mask.shape[1] # 전체 이미지 픽셀 수
        coverage_ratio = mask_area / total_area               # 시계가 차지하는 비율
        
        # 시계 영역의 바운딩 박스 계산
        contours, _ = cv2.findContours(watch_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        bounding_box = None
        
        if contours:
            # 가장 큰 윤곽선을 시계 영역으로 간주
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            bounding_box = {"x": x, "y": y, "width": w, "height": h}
        
        return {
            "success": True,
            "message": "시계 영역이 성공적으로 추출되었습니다.",
            "result": {
                "mask_coverage": coverage_ratio,               # 시계 영역 비율
                "mask_area": int(mask_area),                   # 시계 영역 픽셀 수
                "total_area": int(total_area),                 # 전체 이미지 픽셀 수
                "bounding_box": bounding_box,                  # 시계 바운딩 박스
                "image_size": {"width": watch_image_data.shape[1], "height": watch_image_data.shape[0]}
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시계 영역 추출 중 오류: {str(e)}")


# 개발 모드에서 서버 직접 실행
if __name__ == "__main__":
    import uvicorn
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # 환경변수에서 설정 로드
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    print("가상 시계 착용 API 서버를 시작합니다...")
    print(f"API 문서: http://localhost:{port}/docs")
    print(f"헬스체크: http://localhost:{port}/health")
    uvicorn.run(app, host=host, port=port)
