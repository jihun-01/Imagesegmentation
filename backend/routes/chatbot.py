"""
챗봇 API 라우터
- 메시지 처리 엔드포인트
- 상품 추천 엔드포인트  
- 액션 처리 엔드포인트
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from database import get_db
from chatbot_service import RuleBasedChatbot
from models import ChatHistory
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
    - **user_id**: 사용자 ID (선택사항)
    """
    try:
        user_id = request.user_id if hasattr(request, 'user_id') else None
        
        if request.action:
            # 액션 처리
            response = chatbot.handle_action(
                action=request.action,
                conversation_id=request.conversation_id or chatbot.generate_conversation_id(),
                user_id=user_id
            )
        else:
            # 일반 메시지 처리
            response = chatbot.generate_response(
                message=request.message,
                conversation_id=request.conversation_id,
                user_id=user_id
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

@router.get("/history/{conversation_id}")
async def get_chat_history(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    """채팅 히스토리 조회"""
    try:
        # 해당 대화의 모든 메시지 조회
        chat_history = db.query(ChatHistory).filter(
            ChatHistory.conversation_id == conversation_id
        ).order_by(ChatHistory.created_at.asc()).all()
        
        # 메시지 형식으로 변환
        messages = []
        for chat in chat_history:
            message_data = {
                "role": chat.role,
                "text": chat.message,
                "time": chat.created_at.strftime("%H:%M")
            }
            
            # 버튼 정보 추가
            if chat.buttons:
                try:
                    buttons_data = json.loads(chat.buttons)
                    message_data["buttons"] = buttons_data
                except:
                    message_data["buttons"] = []
            
            # 상품 정보 추가
            if chat.products:
                try:
                    products_data = json.loads(chat.products)
                    message_data["products"] = products_data
                except:
                    message_data["products"] = []
            
            messages.append(message_data)
        
        return {
            "conversation_id": conversation_id,
            "messages": messages
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"채팅 히스토리 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/conversations")
async def get_user_conversations(
    user_id: int,
    db: Session = Depends(get_db)
):
    """사용자의 대화 목록 조회"""
    try:
        # 사용자의 최근 대화 ID 목록 조회
        conversations = db.query(ChatHistory.conversation_id).filter(
            ChatHistory.user_id == user_id
        ).distinct().order_by(ChatHistory.created_at.desc()).limit(10).all()
        
        return {
            "conversations": [conv[0] for conv in conversations]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"대화 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/latest-conversation/{user_id}")
async def get_latest_conversation(
    user_id: int,
    db: Session = Depends(get_db)
):
    """사용자의 최신 대화 조회"""
    try:
        # 해당 사용자의 가장 최근 대화 조회
        latest_conversation = db.query(ChatHistory).filter(
            ChatHistory.user_id == user_id
        ).order_by(ChatHistory.created_at.desc()).first()
        
        if not latest_conversation:
            return {
                "conversation_id": None,
                "messages": []
            }
        
        # 해당 대화의 모든 메시지 조회
        chat_history = db.query(ChatHistory).filter(
            ChatHistory.conversation_id == latest_conversation.conversation_id
        ).order_by(ChatHistory.created_at.asc()).all()
        
        # 메시지 형식으로 변환
        messages = []
        for chat in chat_history:
            message_data = {
                "role": chat.role,
                "text": chat.message,
                "time": chat.created_at.strftime("%H:%M")
            }
            
            # 버튼 정보 추가
            if chat.buttons:
                try:
                    buttons_data = json.loads(chat.buttons)
                    message_data["buttons"] = buttons_data
                except:
                    message_data["buttons"] = []
            
            # 상품 정보 추가
            if chat.products:
                try:
                    products_data = json.loads(chat.products)
                    message_data["products"] = products_data
                except:
                    message_data["products"] = []
            
            messages.append(message_data)
        
        return {
            "conversation_id": latest_conversation.conversation_id,
            "messages": messages
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"최신 대화 조회 중 오류가 발생했습니다: {str(e)}"
        )






