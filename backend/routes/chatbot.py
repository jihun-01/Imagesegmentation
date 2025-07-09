"""
챗봇 API 라우터
- 메시지 처리 엔드포인트
- 상품 추천 엔드포인트  
- 액션 처리 엔드포인트
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from chatbot_service import RuleBasedChatbot
from schemas import (
    ChatMessageRequest, 
    ChatMessageResponse, 
    ProductRecommendationRequest,
    ChatProduct,
    MessageResponse
)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

def get_chatbot_service(db: Session = Depends(get_db)) -> RuleBasedChatbot:
    """챗봇 서비스 의존성 주입"""
    return RuleBasedChatbot(db)

@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    request: ChatMessageRequest,
    chatbot: RuleBasedChatbot = Depends(get_chatbot_service)
):
    """
    챗봇에게 메시지 전송
    
    - **message**: 사용자 메시지
    - **conversation_id**: 대화 ID (선택사항)
    - **action**: 액션 타입 (선택사항)
    """
    try:
        if request.action:
            # 액션 처리
            response = chatbot.handle_action(
                action=request.action,
                conversation_id=request.conversation_id or chatbot.generate_conversation_id()
            )
        else:
            # 일반 메시지 처리
            response = chatbot.generate_response(
                message=request.message,
                conversation_id=request.conversation_id
            )
        
        return response
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"챗봇 응답 생성 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/recommend", response_model=List[ChatProduct])
async def recommend_products(
    request: ProductRecommendationRequest,
    chatbot: RuleBasedChatbot = Depends(get_chatbot_service)
):
    """
    상품 추천 요청
    
    - **category**: 카테고리 (all, metal, leather, smart)
    - **preferences**: 선호도 설정 (가격대 등)
    - **limit**: 추천 상품 수 (기본값: 5)
    """
    try:
        products = chatbot.recommend_products(request)
        return products
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"상품 추천 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/action", response_model=ChatMessageResponse)
async def handle_action(
    action: str,
    conversation_id: str,
    chatbot: RuleBasedChatbot = Depends(get_chatbot_service)
):
    """
    챗봇 액션 처리
    
    - **action**: 실행할 액션
    - **conversation_id**: 대화 ID
    """
    try:
        response = chatbot.handle_action(action, conversation_id)
        return response
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"액션 처리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/health", response_model=MessageResponse)
async def health_check():
    """챗봇 서비스 상태 확인"""
    return MessageResponse(
        message="챗봇 서비스가 정상적으로 작동 중입니다.",
        success=True
    )

@router.get("/categories", response_model=List[str])
async def get_categories():
    """사용 가능한 카테고리 목록 반환"""
    return ["all", "metal", "leather", "smart"]

@router.get("/actions", response_model=List[str])
async def get_available_actions():
    """사용 가능한 액션 목록 반환"""
    return [
        "popular_products",
        "category_metal",
        "category_leather", 
        "category_smart",
        "price_under_100k",
        "price_100k_300k",
        "price_300k_500k",
        "price_over_500k",
        "product_recommend",
        "price_inquiry",
        "order_inquiry",
        "customer_service",
        "go_to_cart",
        "order_history",
        "faq",
        "delivery_check",
        "refund_check",
        "home",
        "greeting",
        "product_inquiry",
        "wishlist_inquiry"
    ]






