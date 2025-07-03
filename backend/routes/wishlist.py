"""
찜목록 관련 API 라우터
- 찜목록 아이템 목록 조회
- 상품 찜하기 (찜목록에 추가)
- 찜 해제 (찜목록에서 제거)
- 특정 상품의 찜 상태 확인
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError


from database import get_db
from models import User, Product, WishlistItem
from schemas import WishlistItemCreate, WishlistItemResponse, MessageResponse
from auth import get_current_active_user

# 라우터 인스턴스 생성
router = APIRouter(prefix="/wishlist", tags=["찜목록"])

@router.get("/", response_model=List[WishlistItemResponse], summary="찜목록 아이템 목록 조회")
async def get_wishlist_items(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 사용자의 찜목록 아이템 목록 조회
    
    찜한 모든 상품 정보를 반환합니다.
    상품 정보도 함께 포함됩니다.
    """
    
    wishlist_items = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id
    ).order_by(WishlistItem.created_at.desc()).all()
    
    return wishlist_items

@router.post("/", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED, summary="찜목록에 상품 추가")
async def add_to_wishlist(
    item_data: WishlistItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    찜목록에 상품 추가 (찜하기)
    
    - **product_id**: 찜할 상품 ID
    
    이미 찜한 상품인 경우 중복 추가되지 않습니다.
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
    
    # 이미 찜한 상품인지 확인
    existing_item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == item_data.product_id
    ).first()
    
    if existing_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 찜한 상품입니다"
        )
    
    # 찜목록에 추가
    try:
        wishlist_item = WishlistItem(
            user_id=current_user.id,
            product_id=item_data.product_id
        )
        
        db.add(wishlist_item)
        db.commit()
        db.refresh(wishlist_item)
        
        return wishlist_item
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="찜목록 추가 중 오류가 발생했습니다"
        )

@router.delete("/{product_id}", response_model=MessageResponse, summary="찜목록에서 상품 삭제")
async def remove_from_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    찜목록에서 상품 제거 (찜 해제)
    
    - **product_id**: 찜 해제할 상품 ID
    """
    
    # 찜목록 아이템 조회 (본인 소유만)
    wishlist_item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    if not wishlist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="찜목록에서 해당 상품을 찾을 수 없습니다"
        )
    
    # 아이템 삭제
    db.delete(wishlist_item)
    db.commit()
    
    return {"message": "찜목록에서 상품이 제거되었습니다"}

@router.get("/check/{product_id}", summary="찜목록 상태 확인")
async def check_wishlist_status(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 상품의 찜 상태 확인
    
    - **product_id**: 확인할 상품 ID
    
    반환값:
    - is_wishlisted: 찜 여부 (true/false)
    - product_exists: 상품 존재 여부
    """
    
    # 상품 존재 여부 확인
    product_exists = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first() is not None
    
    if not product_exists:
        return {
            "is_wishlisted": False,
            "product_exists": False,
            "message": "상품을 찾을 수 없습니다"
        }
    
    # 찜 상태 확인
    wishlist_item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    return {
        "is_wishlisted": wishlist_item is not None,
        "product_exists": True,
        "product_id": product_id
    }

@router.post("/toggle/{product_id}", summary="찜목록 상태 토글")
async def toggle_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    찜 상태 토글 (찜하기/찜 해제 자동 전환)
    
    - **product_id**: 토글할 상품 ID
    
    찜하지 않은 상품이면 찜목록에 추가하고,
    이미 찜한 상품이면 찜목록에서 제거합니다.
    """
    
    # 상품 존재 여부 확인
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상품을 찾을 수 없습니다"
        )
    
    # 현재 찜 상태 확인
    existing_item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    if existing_item:
        # 찜 해제
        db.delete(existing_item)
        db.commit()
        
        return {
            "action": "removed",
            "is_wishlisted": False,
            "message": "찜목록에서 제거되었습니다"
        }
    else:
        # 찜하기
        try:
            wishlist_item = WishlistItem(
                user_id=current_user.id,
                product_id=product_id
            )
            
            db.add(wishlist_item)
            db.commit()
            
            return {
                "action": "added",
                "is_wishlisted": True,
                "message": "찜목록에 추가되었습니다"
            }
            
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="찜목록 추가 중 오류가 발생했습니다"
            )

@router.delete("/", response_model=MessageResponse, summary="찜목록 전체 비우기")
async def clear_wishlist(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    찜목록 전체 비우기
    
    현재 사용자의 찜목록에 있는 모든 아이템을 삭제합니다.
    """
    
    # 사용자의 모든 찜목록 아이템 삭제
    deleted_count = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id
    ).delete()
    
    db.commit()
    
    return {"message": f"찜목록이 비워졌습니다. ({deleted_count}개 아이템 삭제)"}

@router.get("/summary", summary="찜목록 요약 정보 조회")
async def get_wishlist_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    찜목록 요약 정보 조회
    
    - 총 찜한 상품 수
    - 찜한 상품들의 평균 가격
    - 찜한 상품들의 총 가치
    - 카테고리별 찜한 상품 수
    """
    

    
    # 찜목록 아이템 조회 (상품 정보 포함)
    wishlist_query = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id
    ).join(Product).filter(Product.is_active == True)
    
    wishlist_items = wishlist_query.all()
    
    if not wishlist_items:
        return {
            "total_items": 0,
            "average_price": 0,
            "total_value": 0,
            "categories": {}
        }
    
    # 통계 계산
    total_items = len(wishlist_items)
    total_value = sum(item.product.price for item in wishlist_items)
    average_price = total_value / total_items if total_items > 0 else 0
    
    # 카테고리별 통계
    category_counts = {}
    for item in wishlist_items:
        category = item.product.type
        category_counts[category] = category_counts.get(category, 0) + 1
    
    return {
        "total_items": total_items,
        "average_price": round(float(average_price), 2),
        "total_value": float(total_value),
        "categories": category_counts
    } 