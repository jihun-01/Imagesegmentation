"""
사용자 인증 시스템
- JWT 토큰 생성 및 검증
- 비밀번호 해싱 및 검증
- 인증 미들웨어 및 의존성 주입
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# JWT 설정 (환경변수에서 로드)
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.")
if len(SECRET_KEY) < 32:
    raise ValueError("SECRET_KEY는 보안을 위해 최소 32자 이상이어야 합니다.")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# 비밀번호 정책 설정
MIN_PASSWORD_LENGTH = 8
REQUIRE_UPPERCASE = True
REQUIRE_LOWERCASE = True
REQUIRE_NUMBERS = True
REQUIRE_SPECIAL_CHARS = True

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer 토큰 스키마
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    평문 비밀번호와 해시된 비밀번호를 비교하여 일치 여부 확인
    
    Args:
        plain_password: 사용자가 입력한 평문 비밀번호
        hashed_password: 데이터베이스에 저장된 해시된 비밀번호
        
    Returns:
        bool: 비밀번호 일치 여부
    """
    return pwd_context.verify(plain_password, hashed_password)

def validate_password_strength(password: str) -> bool:
    """
    비밀번호 강도 검증
    
    Args:
        password: 검증할 비밀번호
        
    Returns:
        bool: 비밀번호 강도 조건 만족 여부
        
    Raises:
        ValueError: 비밀번호가 정책에 맞지 않는 경우
    """
    errors = []
    
    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"비밀번호는 최소 {MIN_PASSWORD_LENGTH}자 이상이어야 합니다")
    
    if REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
        errors.append("비밀번호에 대문자를 포함해야 합니다")
    
    if REQUIRE_LOWERCASE and not any(c.islower() for c in password):
        errors.append("비밀번호에 소문자를 포함해야 합니다")
    
    if REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
        errors.append("비밀번호에 숫자를 포함해야 합니다")
    
    if REQUIRE_SPECIAL_CHARS and not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in password):
        errors.append("비밀번호에 특수문자를 포함해야 합니다")
    
    if errors:
        raise ValueError(" ".join(errors))
    
    return True

def get_password_hash(password: str) -> str:
    """
    평문 비밀번호를 bcrypt로 해싱 (보안 강도 검증 포함)
    
    Args:
        password: 해싱할 평문 비밀번호
        
    Returns:
        str: 해시된 비밀번호
        
    Raises:
        ValueError: 비밀번호가 정책에 맞지 않는 경우
    """
    # 비밀번호 강도 검증
    validate_password_strength(password)
    
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT 액세스 토큰 생성
    
    Args:
        data: 토큰에 포함할 데이터 (일반적으로 user_id, username 등)
        expires_delta: 토큰 만료 시간 (기본값: 30분)
        
    Returns:
        str: 생성된 JWT 토큰
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """
    JWT 토큰 검증 및 페이로드 추출
    
    Args:
        token: 검증할 JWT 토큰
        
    Returns:
        dict: 토큰 페이로드 (유효하지 않은 경우 None)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    사용자 인증 (로그인 검증)
    
    Args:
        db: 데이터베이스 세션
        email: 이메일 주소
        password: 평문 비밀번호
        
    Returns:
        User: 인증된 사용자 객체 (인증 실패 시 None)
    """
    # 이메일로 사용자 조회
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
        
    return user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    현재 로그인한 사용자 정보 가져오기 (의존성 주입용)
    
    Args:
        credentials: HTTP Authorization 헤더의 Bearer 토큰
        db: 데이터베이스 세션
        
    Returns:
        User: 현재 사용자 객체
        
    Raises:
        HTTPException: 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(credentials.credentials)
        if payload is None:
            raise credentials_exception
            
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    현재 활성 사용자 정보 가져오기
    
    Args:
        current_user: 현재 사용자 객체
        
    Returns:
        User: 활성 사용자 객체
        
    Raises:
        HTTPException: 사용자가 비활성 상태인 경우
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    return current_user 