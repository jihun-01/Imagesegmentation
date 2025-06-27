from fastapi import FastAPI, File, UploadFile, HTTPException, Form
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
from hand_watch_segmentation import HandWatchSegmentation

# FastAPI 앱 생성
app = FastAPI(title="가상 시계 착용 API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 세그멘테이션 시스템 초기화
segmenter = HandWatchSegmentation()

# 업로드된 파일을 저장할 디렉토리
UPLOAD_DIR = "uploads"
RESULT_DIR = "results"

# 디렉토리 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

@app.get("/")
async def root():
    """
    API 상태 확인
    """
    return {"message": "가상 시계 착용 API가 실행 중입니다."}

@app.get("/health")
async def health_check():
    """
    서버 상태 확인
    """
    return {"status": "healthy", "message": "서버가 정상 작동 중입니다."}

def save_upload_file(upload_file: UploadFile, destination: str) -> str:
    """
    업로드된 파일을 저장합니다.
    
    Args:
        upload_file: 업로드된 파일
        destination: 저장할 경로
        
    Returns:
        str: 저장된 파일 경로
    """
    try:
        with open(destination, "wb") as buffer:
            content = upload_file.file.read()
            buffer.write(content)
        return destination
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {str(e)}")

def image_to_base64(image_path: str) -> str:
    """
    이미지를 base64로 인코딩합니다.
    
    Args:
        image_path: 이미지 파일 경로
        
    Returns:
        str: base64 인코딩된 이미지
    """
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 인코딩 실패: {str(e)}")

@app.post("/virtual-try-on")
async def virtual_try_on(
    hand_image: UploadFile = File(..., description="손 이미지 파일"),
    watch_image: UploadFile = File(..., description="시계 이미지 파일"),
    watch_id: Optional[str] = Form(None, description="시계 상품 ID")
):
    """
    가상 시계 착용 처리
    
    Args:
        hand_image: 손 이미지 파일 (사용자가 업로드)
        watch_image: 시계 이미지 파일 (상품 이미지)
        watch_id: 시계 상품 ID (선택사항)
        
    Returns:
        dict: 처리 결과와 합성된 이미지 정보
    """
    
    # 파일 유효성 검사
    if not hand_image.content_type or not hand_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="손 이미지 파일이 올바르지 않습니다.")
    
    if not watch_image.content_type or not watch_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="시계 이미지 파일이 올바르지 않습니다.")
    
    try:
        # 고유한 파일명 생성
        session_id = str(uuid.uuid4())
        
        # 손 이미지 저장
        hand_filename = f"hand_{session_id}.jpg"
        hand_path = os.path.join(UPLOAD_DIR, hand_filename)
        save_upload_file(hand_image, hand_path)
        
        # 시계 이미지 저장
        watch_filename = f"watch_{session_id}.jpg"
        watch_path = os.path.join(UPLOAD_DIR, watch_filename)
        save_upload_file(watch_image, watch_path)
        
        print(f"파일 저장 완료: {hand_path}, {watch_path}")
        
        # 가상 착용 처리
        result_filename = f"result_{session_id}.jpg"
        result_path = os.path.join(RESULT_DIR, result_filename)
        
        print("가상 착용 처리 시작...")
        original_hand, result_image = segmenter.process_virtual_try_on(
            hand_path, 
            watch_path, 
            result_path
        )
        
        if original_hand is None or result_image is None:
            raise HTTPException(
                status_code=500, 
                detail="가상 착용 처리에 실패했습니다. 손목이 명확하게 보이는 이미지를 사용해주세요."
            )
        
        print(f"가상 착용 처리 완료: {result_path}")
        
        # 결과 이미지를 base64로 인코딩
        result_base64 = image_to_base64(result_path)
        
        # 임시 파일 정리 (선택사항)
        # os.remove(hand_path)
        # os.remove(watch_path)
        
        return {
            "success": True,
            "message": "가상 착용이 성공적으로 완료되었습니다.",
            "result": {
                "session_id": session_id,
                "result_image": f"data:image/jpeg;base64,{result_base64}",
                "watch_id": watch_id,
                "original_hand_file": hand_filename,
                "watch_file": watch_filename,
                "result_file": result_filename
            }
        }
        
    except Exception as e:
        print(f"가상 착용 처리 오류: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"가상 착용 처리 중 오류가 발생했습니다: {str(e)}"
        )

@app.post("/extract-hand")
async def extract_hand_region(
    hand_image: UploadFile = File(..., description="손 이미지 파일")
):
    """
    손 영역 추출 및 손목 위치 분석
    
    Args:
        hand_image: 손 이미지 파일
        
    Returns:
        dict: 손 영역 정보와 손목 위치
    """
    
    if not hand_image.content_type or not hand_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일이 올바르지 않습니다.")
    
    try:
        # 파일 저장
        session_id = str(uuid.uuid4())
        hand_filename = f"hand_extract_{session_id}.jpg"
        hand_path = os.path.join(UPLOAD_DIR, hand_filename)
        save_upload_file(hand_image, hand_path)
        
        # 손 영역 추출
        hand_image_data, hand_mask, wrist_info_list = segmenter.extract_hand_region(hand_path)
        
        if not wrist_info_list:
            raise HTTPException(
                status_code=400, 
                detail="손목을 찾을 수 없습니다. 손목이 명확하게 보이는 이미지를 사용해주세요."
            )
        
        # 손목 정보 정리
        wrist_data = []
        for i, wrist_info in enumerate(wrist_info_list):
            if len(wrist_info) == 3:
                x, y, angle = wrist_info
                wrist_data.append({
                    "index": i,
                    "position": {"x": x, "y": y},
                    "angle": angle
                })
            else:
                x, y = wrist_info
                wrist_data.append({
                    "index": i,
                    "position": {"x": x, "y": y},
                    "angle": 0
                })
        
        # 임시 파일 정리
        os.remove(hand_path)
        
        return {
            "success": True,
            "message": f"{len(wrist_info_list)}개의 손목을 발견했습니다.",
            "result": {
                "wrist_count": len(wrist_info_list),
                "wrist_positions": wrist_data,
                "image_size": {
                    "width": hand_image_data.shape[1],
                    "height": hand_image_data.shape[0]
                }
            }
        }
        
    except Exception as e:
        print(f"손 영역 추출 오류: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"손 영역 추출 중 오류가 발생했습니다: {str(e)}"
        )

@app.post("/extract-watch")
async def extract_watch_region(
    watch_image: UploadFile = File(..., description="시계 이미지 파일")
):
    """
    시계 영역 추출 및 분석
    
    Args:
        watch_image: 시계 이미지 파일
        
    Returns:
        dict: 시계 영역 정보
    """
    
    if not watch_image.content_type or not watch_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일이 올바르지 않습니다.")
    
    try:
        # 파일 저장
        session_id = str(uuid.uuid4())
        watch_filename = f"watch_extract_{session_id}.jpg"
        watch_path = os.path.join(UPLOAD_DIR, watch_filename)
        save_upload_file(watch_image, watch_path)
        
        # 시계 영역 추출
        watch_image_data, watch_mask = segmenter.extract_watch_from_image(watch_path)
        
        # 시계 마스크 통계 계산
        mask_area = np.sum(watch_mask > 0)
        total_area = watch_mask.shape[0] * watch_mask.shape[1]
        coverage_ratio = mask_area / total_area
        
        # 바운딩 박스 계산
        contours, _ = cv2.findContours(watch_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        bounding_box = None
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            bounding_box = {"x": x, "y": y, "width": w, "height": h}
        
        # 임시 파일 정리
        os.remove(watch_path)
        
        return {
            "success": True,
            "message": "시계 영역이 성공적으로 추출되었습니다.",
            "result": {
                "mask_coverage": coverage_ratio,
                "mask_area": int(mask_area),
                "total_area": int(total_area),
                "bounding_box": bounding_box,
                "image_size": {
                    "width": watch_image_data.shape[1],
                    "height": watch_image_data.shape[0]
                }
            }
        }
        
    except Exception as e:
        print(f"시계 영역 추출 오류: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"시계 영역 추출 중 오류가 발생했습니다: {str(e)}"
        )

@app.get("/result/{session_id}")
async def get_result_image(session_id: str):
    """
    처리된 결과 이미지를 반환합니다.
    
    Args:
        session_id: 세션 ID
        
    Returns:
        FileResponse: 결과 이미지 파일
    """
    result_path = os.path.join(RESULT_DIR, f"result_{session_id}.jpg")
    
    if not os.path.exists(result_path):
        raise HTTPException(status_code=404, detail="결과 이미지를 찾을 수 없습니다.")
    
    return FileResponse(
        result_path,
        media_type="image/jpeg",
        filename=f"virtual_try_on_result_{session_id}.jpg"
    )

if __name__ == "__main__":
    import uvicorn
    print("가상 시계 착용 API 서버를 시작합니다...")
    print("API 문서: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
