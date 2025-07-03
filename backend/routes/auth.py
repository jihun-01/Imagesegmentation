"""
사용자 인증 관련 API 라우터
- 회원가입 엔드포인트
- 로그인 엔드포인트  
- 사용자 정보 조회 엔드포인트
- 사용자 정보 수정 엔드포인트
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse, UserUpdate, Token, MessageResponse
from auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash, 
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# 라우터 인스턴스 생성
router = APIRouter(prefix="/auth", tags=["인증"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED,tags=["인증"], summary="사용자 회원가입")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    새 사용자 회원가입
    
    - **username**: 사용자명 (3자 이상, 영숫자만)
    - **email**: 이메일 주소
    - **password**: 비밀번호 (6자 이상)
    - **name**: 실명
    - **phone**: 전화번호 (선택사항)
    - **address**: 주소 (선택사항)
    """
    
    # 중복 사용자명 체크
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        if existing_user.username == user_data.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 사용 중인 사용자명입니다"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 사용 중인 이메일 주소입니다"
            )
    
    try:
        # 비밀번호 해싱
        hashed_password = get_password_hash(user_data.password)
        
        # 새 사용자 생성
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hashed_password,
            name=user_data.name,
            phone=user_data.phone,
            address=user_data.address
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="사용자 생성 중 오류가 발생했습니다"
        )

@router.post("/login", response_model=Token,tags=["인증"], summary="사용자 로그인")
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """
    사용자 로그인
    
    - **email**: 이메일 주소
    - **password**: 비밀번호
    
    성공 시 JWT 액세스 토큰과 사용자 정보를 반환합니다.
    """
    
    # 사용자 인증 (이메일 기반)
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="잘못된 이메일 또는 비밀번호입니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 사용자가 비활성 상태인지 확인
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비활성화된 계정입니다"
        )
    
    # JWT 토큰 생성
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # 초 단위
        "user": user
    }

@router.get("/me", response_model=UserResponse,tags=["인증"], summary="사용자 정보 조회")
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    현재 로그인한 사용자의 정보 조회
    
    Authorization 헤더에 Bearer 토큰이 필요합니다.
    """
    return current_user

@router.put("/me", response_model=UserResponse,tags=["인증"], summary="사용자 정보 수정")
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인한 사용자의 정보 수정
    
    - **name**: 실명 수정
    - **phone**: 전화번호 수정
    - **address**: 주소 수정
    - **password**: 비밀번호 변경
    """
    
    # 수정할 필드만 업데이트
    update_data = user_update.dict(exclude_unset=True)
    
    # 비밀번호 변경 시 해싱
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    
    # 사용자 정보 업데이트
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    try:
        db.commit()
        db.refresh(current_user)
        return current_user
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="사용자 정보 수정 중 오류가 발생했습니다"
        )

@router.delete("/me", response_model=MessageResponse,tags=["인증"], summary="사용자 계정 삭제(비활성화)")
async def delete_current_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인한 사용자 계정 비활성화
    
    실제로 계정을 삭제하지 않고 is_active를 False로 설정합니다.
    """
    
    current_user.is_active = False
    
    try:
        db.commit()
        return {"message": "계정이 성공적으로 비활성화되었습니다"}
        
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="계정 비활성화 중 오류가 발생했습니다"
        ) 