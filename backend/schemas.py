"""
API 요청/응답 스키마 정의
- Pydantic 모델을 사용한 데이터 검증
- 입력/출력 데이터 구조 정의
- 타입 힌팅 및 자동 문서화 지원
"""

from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime

# === 사용자 관련 스키마 ===

class UserBase(BaseModel):
    """사용자 기본 정보 스키마"""
    username: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None

class UserCreate(UserBase):
    """사용자 생성 요청 스키마"""
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        """비밀번호 유효성 검증 (보안 강화)"""
        if len(v) < 8:
            raise ValueError('비밀번호는 최소 8자 이상이어야 합니다')
        
        # 대문자 포함 확인
        if not any(c.isupper() for c in v):
            raise ValueError('비밀번호에 대문자를 포함해야 합니다')
        
        # 소문자 포함 확인
        if not any(c.islower() for c in v):
            raise ValueError('비밀번호에 소문자를 포함해야 합니다')
        
        # 숫자 포함 확인
        if not any(c.isdigit() for c in v):
            raise ValueError('비밀번호에 숫자를 포함해야 합니다')
        
        # 특수문자 포함 확인
        if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in v):
            raise ValueError('비밀번호에 특수문자를 포함해야 합니다')
        
        return v
    
    @validator('username')
    def validate_username(cls, v):
        """사용자명 유효성 검증 (보안 강화)"""
        if len(v) < 3:
            raise ValueError('사용자명은 최소 3자 이상이어야 합니다')
        if len(v) > 20:
            raise ValueError('사용자명은 20자 이하여야 합니다')
        if not v.isalnum():
            raise ValueError('사용자명은 영문자와 숫자만 사용 가능합니다')
        
        # SQL 인젝션 방지를 위한 금지 문자열 확인
        forbidden_strings = ['select', 'drop', 'delete', 'insert', 'update', 'union', 'script']
        if any(forbidden in v.lower() for forbidden in forbidden_strings):
            raise ValueError('사용자명에 금지된 문자열이 포함되어 있습니다')
        
        return v
    
    @validator('email')
    def validate_email_security(cls, v):
        """이메일 보안 검증"""
        # 이메일 길이 제한
        if len(str(v)) > 254:
            raise ValueError('이메일 주소가 너무 깁니다')
        
        return v

class UserLogin(BaseModel):
    """로그인 요청 스키마"""
    email: EmailStr  # 이메일로 로그인
    password: str

class UserResponse(UserBase):
    """사용자 정보 응답 스키마"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """사용자 정보 수정 스키마"""
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    password: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        """비밀번호 유효성 검증 (보안 강화)"""
        if v and len(v) < 8:
            raise ValueError('비밀번호는 최소 8자 이상이어야 합니다')
        
        if v:  # 비밀번호가 제공된 경우에만 검증
            # 대문자 포함 확인
            if not any(c.isupper() for c in v):
                raise ValueError('비밀번호에 대문자를 포함해야 합니다')
            
            # 소문자 포함 확인
            if not any(c.islower() for c in v):
                raise ValueError('비밀번호에 소문자를 포함해야 합니다')
            
            # 숫자 포함 확인
            if not any(c.isdigit() for c in v):
                raise ValueError('비밀번호에 숫자를 포함해야 합니다')
            
            # 특수문자 포함 확인
            if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in v):
                raise ValueError('비밀번호에 특수문자를 포함해야 합니다')
        
        return v

# === 인증 관련 스키마 ===

class Token(BaseModel):
    """JWT 토큰 응답 스키마"""
    access_token: str
    token_type: str
    expires_in: int  # 만료 시간(초)
    user: UserResponse

class TokenData(BaseModel):
    """토큰 데이터 스키마"""
    username: Optional[str] = None

# === 상품 관련 스키마 ===

class ProductBase(BaseModel):
    """상품 기본 정보 스키마"""
    name: str
    description: Optional[str] = None
    price: float
    type: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    stock_quantity: int = 0

class ProductCreate(ProductBase):
    """상품 생성 요청 스키마"""
    category_id: Optional[int] = None

class ProductResponse(ProductBase):
    """상품 정보 응답 스키마"""
    id: int
    category_id: Optional[int] = None
    sales: int
    rating: float
    reviews: int
    view_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProductUpdate(BaseModel):
    """상품 정보 수정 스키마"""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    is_active: Optional[bool] = None

# === 장바구니 관련 스키마 ===

class CartItemBase(BaseModel):
    """장바구니 아이템 기본 스키마"""
    product_id: int
    quantity: int = 1
    
    @validator('quantity')
    def validate_quantity(cls, v):
        """수량 유효성 검증"""
        if v < 1:
            raise ValueError('수량은 1개 이상이어야 합니다')
        return v

class CartItemCreate(CartItemBase):
    """장바구니 아이템 추가 요청 스키마"""
    pass

class CartItemResponse(CartItemBase):
    """장바구니 아이템 응답 스키마"""
    id: int
    user_id: int
    product: ProductResponse
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CartItemUpdate(BaseModel):
    """장바구니 아이템 수정 스키마"""
    quantity: int
    
    @validator('quantity')
    def validate_quantity(cls, v):
        """수량 유효성 검증"""
        if v < 1:
            raise ValueError('수량은 1개 이상이어야 합니다')
        return v

# === 찜목록 관련 스키마 ===

class WishlistItemBase(BaseModel):
    """찜목록 아이템 기본 스키마"""
    product_id: int

class WishlistItemCreate(WishlistItemBase):
    """찜목록 아이템 추가 요청 스키마"""
    pass

class WishlistItemResponse(WishlistItemBase):
    """찜목록 아이템 응답 스키마"""
    id: int
    user_id: int
    product: ProductResponse
    created_at: datetime
    
    class Config:
        from_attributes = True

# === 공통 응답 스키마 ===

class MessageResponse(BaseModel):
    """기본 메시지 응답 스키마"""
    message: str
    success: bool = True

class ErrorResponse(BaseModel):
    """에러 응답 스키마"""
    detail: str
    error_code: Optional[str] = None
    success: bool = False 