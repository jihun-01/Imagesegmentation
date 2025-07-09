"""
사용자 설정 관련 API 라우터
- 손 사진 업로드/관리
- 사용자 설정 정보
"""

import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import User, UserHandImage
from schemas import UserHandImageResponse, UserHandImageCreate, MessageResponse
from auth import get_current_active_user

# 라우터 인스턴스 생성
router = APIRouter(prefix="/user-settings", tags=["사용자 설정"])

# 업로드 디렉토리 설정
UPLOAD_DIR = "uploads/hand_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/hand-images/upload", response_model=UserHandImageResponse, tags=["사용자 설정"], summary="손 사진 업로드")
async def upload_hand_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    사용자의 손 사진 업로드
    
    - **file**: 업로드할 이미지 파일 (JPG, PNG, GIF 지원)
    """
    
    # 파일 타입 검증
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일만 업로드 가능합니다"
        )
    
    # 파일 크기 검증 (5MB 제한)
    if file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 크기는 5MB 이하여야 합니다"
        )
    
    try:
        # 파일명 생성 (사용자ID_타임스탬프.확장자)
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"{current_user.id}_{int(os.urandom(8).hex(), 16)}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # 파일 저장
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 사용자의 기존 손사진 개수 확인
        existing_count = db.query(UserHandImage).filter(
            UserHandImage.user_id == current_user.id
        ).count()
        
        # 데이터베이스에 기록
        db_hand_image = UserHandImage(
            user_id=current_user.id,
            filename=filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=file.size,
            content_type=file.content_type,
            is_default=(existing_count == 0)  # 첫 번째 사진이면 자동으로 기본 설정
        )
        
        db.add(db_hand_image)
        db.commit()
        db.refresh(db_hand_image)
        
        return db_hand_image
        
    except Exception as e:
        # 파일 저장 실패 시 정리
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="파일 업로드 중 오류가 발생했습니다"
        )

@router.get("/hand-images", response_model=List[UserHandImageResponse], tags=["사용자 설정"], summary="손 사진 목록 조회")
async def get_hand_images(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 사용자의 손 사진 목록 조회
    """
    
    hand_images = db.query(UserHandImage).filter(
        UserHandImage.user_id == current_user.id
    ).order_by(UserHandImage.created_at.desc()).all()
    
    return hand_images

@router.get("/hand-images/{image_id}", response_model=UserHandImageResponse, tags=["사용자 설정"], summary="손 사진 상세 조회")
async def get_hand_image(
    image_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 손 사진 상세 정보 조회
    """
    
    hand_image = db.query(UserHandImage).filter(
        UserHandImage.id == image_id,
        UserHandImage.user_id == current_user.id
    ).first()
    
    if not hand_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="손 사진을 찾을 수 없습니다"
        )
    
    return hand_image

@router.get("/hand-images/{image_id}/download", tags=["사용자 설정"], summary="손 사진 다운로드")
async def download_hand_image(
    image_id: int,
    token: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    손 사진 파일 다운로드
    - 토큰 파라미터는 프론트엔드 호환성을 위해 유지하지만 실제로는 사용하지 않음
    - 인증은 Authorization 헤더를 통해 처리됨
    """
    
    hand_image = db.query(UserHandImage).filter(
        UserHandImage.id == image_id,
        UserHandImage.user_id == current_user.id
    ).first()
    
    if not hand_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="손 사진을 찾을 수 없습니다"
        )
    
    if not os.path.exists(hand_image.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="파일이 존재하지 않습니다"
        )
    
    return FileResponse(
        hand_image.file_path,
        filename=hand_image.original_filename,
        media_type=hand_image.content_type
    )

@router.put("/hand-images/{image_id}/set-default", response_model=MessageResponse, tags=["사용자 설정"], summary="기본 손 사진 설정")
async def set_default_hand_image(
    image_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    기본 손 사진으로 설정
    """
    
    # 기존 기본 설정 해제
    db.query(UserHandImage).filter(
        UserHandImage.user_id == current_user.id,
        UserHandImage.is_default == True
    ).update({"is_default": False})
    
    # 새로운 기본 설정
    hand_image = db.query(UserHandImage).filter(
        UserHandImage.id == image_id,
        UserHandImage.user_id == current_user.id
    ).first()
    
    if not hand_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="손 사진을 찾을 수 없습니다"
        )
    
    hand_image.is_default = True
    
    try:
        db.commit()
        return {"message": "기본 손 사진이 설정되었습니다"}
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="기본 설정 중 오류가 발생했습니다"
        )

@router.delete("/hand-images/{image_id}", response_model=MessageResponse, tags=["사용자 설정"], summary="손 사진 삭제")
async def delete_hand_image(
    image_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    손 사진 삭제
    """
    
    hand_image = db.query(UserHandImage).filter(
        UserHandImage.id == image_id,
        UserHandImage.user_id == current_user.id
    ).first()
    
    if not hand_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="손 사진을 찾을 수 없습니다"
        )
    
    try:
        # 삭제할 사진이 기본 설정인지 확인
        is_deleting_default = hand_image.is_default
        
        # 파일 삭제
        if os.path.exists(hand_image.file_path):
            os.remove(hand_image.file_path)
        
        # 데이터베이스에서 삭제
        db.delete(hand_image)
        db.commit()
        
        # 삭제된 사진이 기본 설정이었고, 남은 사진이 있다면 첫 번째 사진을 기본으로 설정
        if is_deleting_default:
            remaining_images = db.query(UserHandImage).filter(
                UserHandImage.user_id == current_user.id
            ).order_by(UserHandImage.created_at.asc()).first()
            
            if remaining_images:
                remaining_images.is_default = True
                db.commit()
        
        return {"message": "손 사진이 삭제되었습니다"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="손 사진 삭제 중 오류가 발생했습니다"
        ) 