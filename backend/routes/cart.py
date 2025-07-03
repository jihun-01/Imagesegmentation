"""
장바구니 관련 API 라우터
- 장바구니 아이템 목록 조회
- 장바구니에 상품 추가
- 장바구니 아이템 수량 수정
- 장바구니에서 상품 삭제
- 장바구니 전체 비우기
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError


from database import get_db
from models import User, Product, CartItem
from schemas import CartItemCreate, CartItemResponse, CartItemUpdate, MessageResponse
from auth import get_current_active_user

# 라우터 인스턴스 생성
router = APIRouter(prefix="/cart", tags=["장바구니"])

@router.get("/", response_model=List[CartItemResponse], summary="장바구니 아이템 목록 조회")
async def get_cart_items(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 사용자의 장바구니 아이템 목록 조회
    
    장바구니에 담긴 모든 상품과 수량 정보를 반환합니다.
    상품 정보도 함께 포함됩니다.
    """
    
    cart_items = db.query(CartItem).filter(
        CartItem.user_id == current_user.id
    ).all()
    
    return cart_items

@router.post("/", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED, summary="장바구니에 상품 추가")
async def add_to_cart(
    item_data: CartItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    장바구니에 상품 추가
    
    - **product_id**: 추가할 상품 ID
    - **quantity**: 수량 (기본값: 1)
    
    이미 장바구니에 있는 상품인 경우 수량이 증가합니다.
    """
    
    # 상품 존재 여부 확인
    product = db.query(Product).filter(
        Product.id == item_data.product_id,
        Product.is_active == True
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상품을 찾을 수 없습니다"
        )
    
    # 재고 확인
    if product.stock_quantity < item_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"재고가 부족합니다. 현재 재고: {product.stock_quantity}개"
        )
    
    # 기존 장바구니 아이템 확인
    existing_item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == item_data.product_id
    ).first()
    
    if existing_item:
        # 기존 아이템의 수량 증가
        new_quantity = existing_item.quantity + item_data.quantity
        
        # 재고 확인
        if product.stock_quantity < new_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"재고가 부족합니다. 현재 재고: {product.stock_quantity}개, 장바구니 수량: {existing_item.quantity}개"
            )
        
        existing_item.quantity = new_quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item
    
    else:
        # 새 아이템 추가
        try:
            cart_item = CartItem(
                user_id=current_user.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity
            )
            
            db.add(cart_item)
            db.commit()
            db.refresh(cart_item)
            return cart_item
            
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="장바구니 아이템 추가 중 오류가 발생했습니다"
            )

@router.put("/{item_id}", response_model=CartItemResponse, summary="장바구니 아이템 수량 수정")
async def update_cart_item(
    item_id: int,
    item_update: CartItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    장바구니 아이템 수량 수정
    
    - **quantity**: 새로운 수량
    
    수량을 0으로 설정하면 해당 아이템이 삭제됩니다.
    """
    
    # 장바구니 아이템 조회 (본인 소유만)
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="장바구니 아이템을 찾을 수 없습니다"
        )
    
    # 수량이 0이면 아이템 삭제
    if item_update.quantity == 0:
        db.delete(cart_item)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_204_NO_CONTENT,
            detail="장바구니에서 상품이 제거되었습니다"
        )
    
    # 재고 확인
    product = cart_item.product
    if product.stock_quantity < item_update.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"재고가 부족합니다. 현재 재고: {product.stock_quantity}개"
        )
    
    # 수량 업데이트
    cart_item.quantity = item_update.quantity
    db.commit()
    db.refresh(cart_item)
    
    return cart_item

@router.delete("/{item_id}", response_model=MessageResponse, summary="장바구니에서 상품 삭제")
async def remove_from_cart(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    장바구니에서 특정 상품 제거
    """
    
    # 장바구니 아이템 조회 (본인 소유만)
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="장바구니 아이템을 찾을 수 없습니다"
        )
    
    # 아이템 삭제
    db.delete(cart_item)
    db.commit()
    
    return {"message": "장바구니에서 상품이 제거되었습니다"}

@router.delete("/", response_model=MessageResponse, summary="장바구니 전체 비우기")
async def clear_cart(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    장바구니 전체 비우기
    
    현재 사용자의 장바구니에 있는 모든 아이템을 삭제합니다.
    """
    
    # 사용자의 모든 장바구니 아이템 삭제
    deleted_count = db.query(CartItem).filter(
        CartItem.user_id == current_user.id
    ).delete()
    
    db.commit()
    
    return {"message": f"장바구니가 비워졌습니다. ({deleted_count}개 아이템 삭제)"}

@router.get("/summary", summary="장바구니 요약 정보 조회")
async def get_cart_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    장바구니 요약 정보 조회
    
    - 총 아이템 수
    - 총 상품 개수 (수량 합계)
    - 총 금액
    - 예상 배송비 (100,000원 이상 무료배송)
    """
    

    
    # 장바구니 아이템 조회
    cart_items = db.query(CartItem).filter(
        CartItem.user_id == current_user.id
    ).all()
    
    if not cart_items:
        return {
            "total_items": 0,
            "total_quantity": 0,
            "total_amount": 0,
            "shipping_fee": 0,
            "final_amount": 0
        }
    
    # 통계 계산
    total_items = len(cart_items)
    total_quantity = sum(item.quantity for item in cart_items)
    total_amount = sum(item.product.price * item.quantity for item in cart_items)
    
    # 배송비 계산 (10만원 이상 무료배송)
    shipping_fee = 0 if total_amount >= 100000 else 3000
    final_amount = total_amount + shipping_fee
    
    return {
        "total_items": total_items,
        "total_quantity": total_quantity,
        "total_amount": float(total_amount),
        "shipping_fee": shipping_fee,
        "final_amount": float(final_amount),
        "free_shipping_threshold": 100000,
        "free_shipping_remaining": max(0, 100000 - total_amount) if total_amount < 100000 else 0
    } 