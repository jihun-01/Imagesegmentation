"""
룰 베이스 챗봇 서비스
- 패턴 매칭 기반 응답 생성
- 상품 추천 로직 구현
- 카테고리별 필터링 기능
"""

import re
import uuid
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from models import Product, Category
from schemas import ChatButton, ChatProduct, ChatMessageResponse, ProductRecommendationRequest

class RuleBasedChatbot:
    """룰 베이스 챗봇 클래스"""
    
    def __init__(self, db: Session):
        self.db = db
        self.conversation_memory = {}
        
        # 패턴 정의
        self.patterns = {
            'greeting': [
                r'안녕', r'하이', r'헬로', r'반가', r'처음', r'시작', r'메인'
            ],
            'product_inquiry': [
                r'상품', r'제품', r'시계', r'워치', r'추천', r'찾', r'보여줘', r'알려줘'
            ],
            'price_inquiry': [
                r'가격', r'얼마', r'비용', r'돈', r'가격대', r'저렴', r'비싸', 
                r'가성비', r'가격대별', r'비싼', r'싼', r'저렴한'
            ],
            'category_inquiry': [
                r'메탈', r'가죽', r'스마트', r'종류', r'타입', r'분류'
            ],
            'order_inquiry': [
                r'주문', r'구매', r'결제', r'배송', r'주문하기', r'사고싶'
            ],
            'return_inquiry': [
                r'반품', r'환불', r'교환', r'취소', r'문제', r'불량'
            ],
            'help': [
                r'도움', r'도와줘', r'모르겠', r'헬프', r'설명', r'가이드'
            ],
            'goodbye': [
                r'안녕히', r'잘가', r'고마워', r'감사', r'끝', r'종료'
            ]
        }
        
        # 카테고리 매핑
        self.category_mapping = {
            '메탈': '메탈밴드시계',
            '가죽': '가죽밴드시계', 
            '스마트': '스마트 워치',
            '스마트워치': '스마트 워치',
            '금속': '메탈밴드시계',
            '가죽밴드': '가죽밴드시계',
            '디지털': '스마트 워치'
        }
        
        # 가격대 매핑
        self.price_ranges = {
            # 기본 가격대
            '저렴': (0, 100000),
            '중간': (100000, 300000),
            '고급': (300000, 500000),
            '프리미엄': (500000, 2000000),
            
            # 10만원 관련
            '10만원 이하': (0, 100000),
            '10만원 미만': (0, 100000),
            '10만원대': (100000, 200000),
            
            # 20만원 관련
            '20만원 이하': (0, 200000),
            '20만원 미만': (0, 200000),
            '20만원대': (200000, 300000),
            
            # 30만원 관련
            '30만원 이하': (0, 300000),
            '30만원 미만': (0, 300000),
            '30만원대': (300000, 400000),
            
            # 40만원 관련
            '40만원 이하': (0, 400000),
            '40만원 미만': (0, 400000),
            '40만원대': (400000, 500000),
            
            # 50만원 관련
            '50만원 이하': (0, 500000),
            '50만원 미만': (0, 500000),
            '50만원대': (500000, 600000),
            '50만원 이상': (500000, 2000000),
            
            # 100만원 관련
            '100만원 이하': (0, 1000000),
            '100만원 미만': (0, 1000000),
            '100만원 이상': (1000000, 2000000)
        }

    def generate_conversation_id(self) -> str:
        """대화 ID 생성"""
        return str(uuid.uuid4())

    def match_pattern(self, message: str) -> List[str]:
        """메시지에서 패턴 매칭"""
        matched_categories = []
        message_lower = message.lower()
        
        for category, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    matched_categories.append(category)
                    break
        
        return matched_categories

    def extract_category_from_message(self, message: str) -> Optional[str]:
        """메시지에서 카테고리 추출"""
        message_lower = message.lower()
        
        for korean_category, english_category in self.category_mapping.items():
            if korean_category in message_lower:
                return english_category
        
        return None

    def extract_price_range_from_message(self, message: str) -> Optional[Tuple[int, int]]:
        """메시지에서 가격대 추출"""
        message_lower = message.lower()
        
        # 구체적인 가격 추출
        price_match = re.search(r'(\d+)만원?', message_lower)
        if price_match:
            price = int(price_match.group(1)) * 10000
            return self._get_price_range_by_keyword(price, message_lower)
        
        # 가격대 키워드 매칭
        for price_keyword, price_range in self.price_ranges.items():
            if price_keyword in message:  # 원본 메시지에서 검색
                return price_range
        
        return None

    def _get_price_range_by_keyword(self, price: int, message_lower: str) -> Tuple[int, int]:
        """키워드에 따른 가격 범위 반환"""
        if '이하' in message_lower or '미만' in message_lower:
            return (0, price)
        elif '이상' in message_lower or '초과' in message_lower:
            return (price, 2000000)
        elif '대' in message_lower:
            return (price, price + 100000)
        else:
            return (price, 2000000)

    def get_products_by_criteria(self, 
                               category: Optional[str] = None,
                               price_range: Optional[Tuple[int, int]] = None,
                               limit: int = 5) -> List[Product]:
        """조건에 따른 상품 조회"""
        query = self.db.query(Product).filter(Product.is_active == True)
        
        if category:
            query = query.filter(Product.type == category)
        
        if price_range:
            min_price, max_price = price_range
            query = query.filter(and_(Product.price >= min_price, Product.price <= max_price))
        
        # 인기순 정렬 (판매량 + 평점 + 조회수)
        query = query.order_by(desc(Product.sales + Product.rating * 10 + Product.view_count))
        
        return query.limit(limit).all()

    def get_popular_products(self, limit: int = 5) -> List[Product]:
        """인기 상품 조회"""
        return self.db.query(Product)\
            .filter(Product.is_active == True)\
            .order_by(desc(Product.sales))\
            .limit(limit).all()

    def convert_products_to_chat_products(self, products: List[Product]) -> List[ChatProduct]:
        """Product 모델을 ChatProduct 스키마로 변환"""
        return [
            ChatProduct(
                id=product.id,
                name=product.name,
                price=float(product.price),
                image_url=product.image_url,
                type=product.type
            )
            for product in products
        ]

    def generate_response(self, message: str, conversation_id: Optional[str] = None) -> ChatMessageResponse:
        """메시지에 대한 응답 생성"""
        if not conversation_id:
            conversation_id = self.generate_conversation_id()
        
        # 패턴 매칭
        matched_patterns = self.match_pattern(message)
        
        # 응답 생성
        if 'greeting' in matched_patterns:
            return self._create_greeting_response(conversation_id)
        elif 'product_inquiry' in matched_patterns:
            return self._create_product_inquiry_response(message, conversation_id)
        elif 'price_inquiry' in matched_patterns:
            return self._create_price_inquiry_response(conversation_id)
        elif 'category_inquiry' in matched_patterns:
            return self._create_category_inquiry_response(message, conversation_id)
        elif 'order_inquiry' in matched_patterns:
            return self._create_order_inquiry_response(conversation_id)
        elif 'return_inquiry' in matched_patterns:
            return self._create_return_inquiry_response(conversation_id)
        elif 'help' in matched_patterns:
            return self._create_help_response(conversation_id)
        elif 'goodbye' in matched_patterns:
            return self._create_goodbye_response(conversation_id)
        else:
            return self._create_default_response(conversation_id)

    def _create_greeting_response(self, conversation_id: str) -> ChatMessageResponse:
        """인사말 응답 생성"""
        return ChatMessageResponse(
            message="안녕하세요! 쇼핑 도우미 챗봇입니다. 어떤 상품을 찾고 계신가요?",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="상품 추천  ", action="product_recommend"),
                ChatButton(text="주문 조회회", action="order_inquiry"),
                ChatButton(text="가격 문의", action="price_inquiry"),
                ChatButton(text="반품/환불 문의", action="refund_check"),
                ChatButton(text="고객센터", action="customer_service")
            ],
            products=[]
        )

    def _create_product_inquiry_response(self, message: str, conversation_id: str) -> ChatMessageResponse:
        """상품 문의 응답 생성"""
        category = self.extract_category_from_message(message)
        price_range = self.extract_price_range_from_message(message)
        
        if category or price_range:
            products_list = self.get_products_by_criteria(category, price_range)
            products = self.convert_products_to_chat_products(products_list)
            
            if products:
                category_text = f"{category} " if category else ""
                price_text = f"가격대별 " if price_range else ""
                response_message = f"{category_text}{price_text}추천 상품을 보여드릴게요!"
            else:
                response_message = "조건에 맞는 상품이 없습니다. 다른 조건으로 검색해보세요."
                products = []
        else:
            response_message = "어떤 종류의 시계를 찾고 계신가요?"
            buttons = [
                ChatButton(text="메탈 시계", action="category_metal"),
                ChatButton(text="가죽 시계", action="category_leather"),
                ChatButton(text="스마트워치", action="category_smart"),
                ChatButton(text="인기 상품", action="popular_products"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ]
            return ChatMessageResponse(
                message=response_message,
                conversation_id=conversation_id,
                buttons=buttons,
                products=[]
            )
        
        return ChatMessageResponse(
            message=response_message,
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _create_price_inquiry_response(self, conversation_id: str) -> ChatMessageResponse:
        """가격 문의 응답 생성"""
        return ChatMessageResponse(
            message="가격대별로 상품을 찾아드릴게요!",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="10만원 이하", action="price_under_100k"),
                ChatButton(text="10-20만원", action="price_100k_200k"),
                ChatButton(text="20-30만원", action="price_200k_300k"),
                ChatButton(text="30-40만원", action="price_300k_400k"),
                ChatButton(text="40-50만원", action="price_400k_500k"),
                ChatButton(text="50만원 이상", action="price_over_500k"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _create_category_inquiry_response(self, message: str, conversation_id: str) -> ChatMessageResponse:
        """카테고리 문의 응답 생성"""
        category = self.extract_category_from_message(message)
        if category:
            products_list = self.get_products_by_criteria(category=category)
            products = self.convert_products_to_chat_products(products_list)
            response_message = f"{category} 시계 추천 상품입니다!"
            return ChatMessageResponse(
                message=response_message,
                conversation_id=conversation_id,
                buttons=[],
                products=products
            )
        else:
            return ChatMessageResponse(
                message="시계 종류별로 상품을 보여드릴게요!",
                conversation_id=conversation_id,
                buttons=[
                    ChatButton(text="메탈 시계", action="category_metal"),
                    ChatButton(text="가죽 시계", action="category_leather"),
                    ChatButton(text="스마트워치", action="category_smart"),
                    ChatButton(text='처음으로 돌아가기', action='greeting')
                ],
                products=[]
            )

    def _create_order_inquiry_response(self, conversation_id: str) -> ChatMessageResponse:
        """주문 문의 응답 생성"""
        return ChatMessageResponse(
            message="주문 관련 안내입니다:\n• 결제 후 1-2일 내 배송\n• 무료배송 (5만원 이상)\n• 카드/계좌이체 결제 가능\n\n상품을 선택하시면 바로 주문하실 수 있습니다!",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="인기 상품 보기", action="popular_products"),
                ChatButton(text="장바구니 가기", action="go_to_cart"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _create_return_inquiry_response(self, conversation_id: str) -> ChatMessageResponse:
        """반품/환불 문의 응답 생성"""
        return ChatMessageResponse(
            message="반품/환불 안내:\n• 구매 후 7일 이내 반품 가능\n• 상품 불량 시 무료 교환\n• 단순 변심 시 배송비 고객 부담\n\n자세한 문의는 고객센터로 연락해주세요.",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="고객센터 연결", action="customer_service"),
                ChatButton(text="주문 내역 확인", action="order_history"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _create_help_response(self, conversation_id: str) -> ChatMessageResponse:
        """도움말 응답 생성"""
        return ChatMessageResponse(
            message="무엇을 도와드릴까요?\n\n• 상품 추천 및 검색\n• 가격 정보 안내\n• 주문/배송 문의\n• 반품/환불 안내",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="상품 추천", action="product_recommend"),
                ChatButton(text="가격 문의", action="price_inquiry"),
                ChatButton(text="주문 문의", action="order_inquiry"),
                ChatButton(text="고객센터", action="customer_service"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _create_goodbye_response(self, conversation_id: str) -> ChatMessageResponse:
        """작별 인사 응답 생성"""
        return ChatMessageResponse(
            message="감사합니다! 좋은 하루 되세요. 언제든 다시 방문해주세요!",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _create_default_response(self, conversation_id: str) -> ChatMessageResponse:
        """기본 응답 생성"""
        return ChatMessageResponse(
            message="죄송합니다. 잘 이해하지 못했습니다.\n\n다음 중에서 선택해주세요:",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="상품 추천", action="product_recommend"),
                ChatButton(text="가격 문의", action="price_inquiry"),
                ChatButton(text="주문 문의", action="order_inquiry"),
                ChatButton(text="고객센터", action="customer_service"),
            ],
            products=[]
        )

    def handle_action(self, action: str, conversation_id: str) -> ChatMessageResponse:
        """액션에 따른 응답 처리"""
        action_handlers = {
            "popular_products": self._handle_popular_products,
            "category_metal": self._handle_category_metal,
            "category_leather": self._handle_category_leather,
            "category_smart": self._handle_category_smart,
            "price_under_100k": self._handle_price_under_100k,
            "price_100k_200k": self._handle_price_100k_200k,
            "price_200k_300k": self._handle_price_200k_300k,
            "price_300k_400k": self._handle_price_300k_400k,
            "price_400k_500k": self._handle_price_400k_500k,
            "price_over_500k": self._handle_price_over_500k,
            "product_recommend": self._handle_product_recommend,
            "price_inquiry": self._handle_price_inquiry,
            "order_inquiry": self._handle_order_inquiry,
            "customer_service": self._handle_customer_service,
            "go_to_cart": self._handle_go_to_cart,
            "order_history": self._handle_order_history,
            "faq": self._handle_faq,
            "greeting": self._handle_greeting
        }
        
        handler = action_handlers.get(action, self._handle_unknown_action)
        return handler(conversation_id)

    def _handle_popular_products(self, conversation_id: str) -> ChatMessageResponse:
        """인기 상품 처리"""
        products_list = self.get_popular_products()
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="인기 상품을 보여드릴게요!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_category_metal(self, conversation_id: str) -> ChatMessageResponse:
        """메탈 시계 카테고리 처리"""
        products_list = self.get_products_by_criteria(category="메탈밴드시계")
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="메탈 시계 추천 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_category_leather(self, conversation_id: str) -> ChatMessageResponse:
        """가죽 시계 카테고리 처리"""
        products_list = self.get_products_by_criteria(category="가죽밴드시계")
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="가죽 시계 추천 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_category_smart(self, conversation_id: str) -> ChatMessageResponse:
        """스마트워치 카테고리 처리"""
        products_list = self.get_products_by_criteria(category="스마트 워치")
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="스마트워치 추천 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_price_under_100k(self, conversation_id: str) -> ChatMessageResponse:
        """10만원 이하 가격대 처리"""
        products_list = self.get_products_by_criteria(price_range=(0, 100000))
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="10만원 이하 추천 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_price_100k_200k(self, conversation_id: str) -> ChatMessageResponse:
        """10-20만원 가격대 처리"""
        products_list = self.get_products_by_criteria(price_range=(100000, 200000))
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="10-20만원 추천 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_price_200k_300k(self, conversation_id: str) -> ChatMessageResponse:
        """20-30만원 가격대 처리"""
        products_list = self.get_products_by_criteria(price_range=(200000, 300000))
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="20-30만원 추천 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_price_300k_400k(self, conversation_id: str) -> ChatMessageResponse:
        """30-40만원 가격대 처리"""
        products_list = self.get_products_by_criteria(price_range=(300000, 400000))
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="30-40만원 추천 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_price_400k_500k(self, conversation_id: str) -> ChatMessageResponse:
        """40-50만원 가격대 처리"""
        products_list = self.get_products_by_criteria(price_range=(400000, 500000))
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="40-50만원 추천 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_price_over_500k(self, conversation_id: str) -> ChatMessageResponse:
        """50만원 이상 가격대 처리"""
        products_list = self.get_products_by_criteria(price_range=(500000, 2000000))
        products = self.convert_products_to_chat_products(products_list)
        return ChatMessageResponse(
            message="50만원 이상 프리미엄 상품입니다!",
            conversation_id=conversation_id,
            buttons=[],
            products=products
        )

    def _handle_product_recommend(self, conversation_id: str) -> ChatMessageResponse:
        """상품 추천 처리"""
        return ChatMessageResponse(
            message="어떤 종류의 시계를 찾고 계신가요?",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="메탈 시계", action="category_metal"),
                ChatButton(text="가죽 시계", action="category_leather"),
                ChatButton(text="스마트워치", action="category_smart"),
                ChatButton(text="인기 상품", action="popular_products"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _handle_price_inquiry(self, conversation_id: str) -> ChatMessageResponse:
        """가격 문의 처리"""
        return ChatMessageResponse(
            message="가격대별로 상품을 찾아드릴게요!",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="10만원 이하", action="price_under_100k"),
                ChatButton(text="10-20만원", action="price_100k_200k"),
                ChatButton(text="20-30만원", action="price_200k_300k"),
                ChatButton(text="30-40만원", action="price_300k_400k"),
                ChatButton(text="40-50만원", action="price_400k_500k"),
                ChatButton(text="50만원 이상", action="price_over_500k"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _handle_order_inquiry(self, conversation_id: str) -> ChatMessageResponse:
        """주문 문의 처리"""
        return ChatMessageResponse(
            message="주문 관련 안내입니다:\n• 결제 후 1-2일 내 배송\n• 무료배송 (5만원 이상)\n• 카드/계좌이체 결제 가능",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="인기 상품 보기", action="popular_products"),
                ChatButton(text="장바구니 가기", action="go_to_cart"),
                ChatButton(text="찜 목록 보기", action="wishlist_inquiry"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _handle_customer_service(self, conversation_id: str) -> ChatMessageResponse:
        """고객센터 처리"""
        return ChatMessageResponse(
            message="고객센터 안내:\n• 운영시간: 평일 09:00-18:00\n• 전화: 1588-0000\n• 이메일: support@watchstore.com\n• 카카오톡: @watchstore",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="자주 묻는 질문", action="faq"),
                ChatButton(text="상품 문의", action="product_recommend"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _handle_go_to_cart(self, conversation_id: str) -> ChatMessageResponse:
        """장바구니 이동 처리"""
        return ChatMessageResponse(
            message="장바구니로 이동합니다. 담은 상품을 확인해보세요!",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="상품 더 보기", action="popular_products"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _handle_order_history(self, conversation_id: str) -> ChatMessageResponse:
        """주문 내역 처리"""
        return ChatMessageResponse(
            message="주문 내역을 확인하려면 로그인이 필요합니다.",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="로그인하기", action="login"),
                ChatButton(text="상품 보기", action="popular_products"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _handle_faq(self, conversation_id: str) -> ChatMessageResponse:
        """FAQ 처리"""
        return ChatMessageResponse(
            message="자주 묻는 질문:\n• 배송은 얼마나 걸리나요? → 1-2일\n• 반품은 어떻게 하나요? → 7일 이내 가능\n• 무료배송 조건은? → 5만원 이상",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="더 많은 문의", action="customer_service"),
                ChatButton(text="상품 보기", action="popular_products"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def _handle_greeting(self, conversation_id: str) -> ChatMessageResponse:
        """인사말 처리"""
        return ChatMessageResponse(
            message="안녕하세요! 쇼핑 도우미 챗봇입니다. 어떤 상품을 찾고 계신가요?",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="상품 추천", action="product_recommend"),
                ChatButton(text="주문 조회", action="order_inquiry"),
                ChatButton(text="가격 문의", action="price_inquiry"),
                ChatButton(text="고객센터", action="customer_service")
            ],
            products=[]
        )

    def _handle_unknown_action(self, conversation_id: str) -> ChatMessageResponse:
        """알 수 없는 액션 처리"""
        return ChatMessageResponse(
            message="죄송합니다. 해당 기능을 찾을 수 없습니다.",
            conversation_id=conversation_id,
            buttons=[
                ChatButton(text="상품 추천", action="product_recommend"),
                ChatButton(text="고객센터", action="customer_service"),
                ChatButton(text='처음으로 돌아가기', action='greeting')
            ],
            products=[]
        )

    def recommend_products(self, request: ProductRecommendationRequest) -> List[ChatProduct]:
        """상품 추천 요청 처리"""
        category = request.category if request.category != "all" else None
        preferences = request.preferences or {}
        
        # 선호도에서 가격대 추출
        price_range = None
        if "price_min" in preferences and "price_max" in preferences:
            price_range = (preferences["price_min"], preferences["price_max"])
        
        limit = request.limit or 5
        
        products_list = self.get_products_by_criteria(
            category=category,
            price_range=price_range,
            limit=limit
        )
        
        return self.convert_products_to_chat_products(products_list) 