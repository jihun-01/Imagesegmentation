"""
상품 관련 API 라우터
- 상품 목록 조회 (필터링, 정렬, 페이징)
- 상품 상세 정보 조회
- 상품 검색 기능
- 카테고리별 상품 조회
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from database import get_db
from models import Product
from schemas import ProductResponse

# 라우터 인스턴스 생성
router = APIRouter(prefix="/products", tags=["상품"])

@router.get("/", response_model=List[ProductResponse], summary="상품 목록 조회")
async def get_products(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(50, ge=1, le=100, description="조회할 항목 수 (최대 100)"),
    category: Optional[str] = Query(None, description="카테고리 필터 (type 값)"),
    search: Optional[str] = Query(None, description="검색어 (상품명, 브랜드, 설명)"),
    min_price: Optional[float] = Query(None, ge=0, description="최소 가격"),
    max_price: Optional[float] = Query(None, ge=0, description="최대 가격"),
    sort_by: str = Query("id", description="정렬 기준 (id, name, price, rating, sales, view_count)"),
    sort_order: str = Query("asc", description="정렬 순서 (asc, desc)")
):
    """
    상품 목록 조회 (필터링, 검색, 정렬 지원)
    
    **필터링 옵션:**
    - category: 상품 카테고리 (스마트 워치, 메탈밴드시계, 가죽밴드시계)
    - search: 상품명, 브랜드, 설명에서 검색
    - min_price, max_price: 가격 범위 필터
    
    **정렬 옵션:**
    - sort_by: id, name, price, rating, sales, view_count
    - sort_order: asc (오름차순), desc (내림차순)
    
    **페이징:**
    - skip: 건너뛸 항목 수 (기본값: 0)
    - limit: 조회할 항목 수 (기본값: 50, 최대: 100)
    """
    
    # 기본 쿼리 (활성 상품만)
    query = db.query(Product).filter(Product.is_active == True)
    
    # 카테고리 필터
    if category:
        query = query.filter(Product.type == category)
    
    # 검색 필터 (상품명, 브랜드, 설명에서 검색)
    if search:
        search_filter = or_(
            Product.name.ilike(f"%{search}%"),
            Product.brand.ilike(f"%{search}%"),
            Product.description.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # 가격 범위 필터
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    
    # 정렬 적용
    valid_sort_fields = ["id", "name", "price", "rating", "sales", "view_count", "created_at"]
    if sort_by not in valid_sort_fields:
        sort_by = "id"
    
    sort_column = getattr(Product, sort_by)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # 페이징 적용 및 결과 반환
    products = query.offset(skip).limit(limit).all()
    return products

@router.get("/{product_id}", response_model=ProductResponse, summary="상품 상세 정보 조회")
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """
    특정 상품의 상세 정보 조회
    
    상품 조회 시 view_count가 자동으로 1 증가합니다.
    """
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상품을 찾을 수 없습니다"
        )
    
    # 조회수 증가
    product.view_count += 1
    db.commit()
    
    return product

@router.get("/category/{category_name}", response_model=List[ProductResponse], summary="카테고리별 상품 조회")
async def get_products_by_category(
    category_name: str,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """
    카테고리별 상품 조회
    
    **지원 카테고리:**
    - 스마트 워치
    - 메탈밴드시계  
    - 가죽밴드시계
    """
    
    products = db.query(Product).filter(
        Product.type == category_name,
        Product.is_active == True
    ).offset(skip).limit(limit).all()
    
    return products

@router.get("/popular/top", response_model=List[ProductResponse], summary="인기 상품 목록 조회")
async def get_popular_products(
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50, description="조회할 인기 상품 수")
):
    """
    인기 상품 목록 조회 (판매량 + 평점 + 조회수 기준)
    
    인기도 계산 공식:
    - 판매량 × 2 + 평점 × 10 + 조회수 ÷ 100
    """
    
    # 인기도 계산을 위한 복합 정렬
    products = db.query(Product).filter(
        Product.is_active == True
    ).order_by(
        desc(Product.sales * 2 + Product.rating * 10 + Product.view_count / 100)
    ).limit(limit).all()
    
    return products

@router.get("/search/suggestions", response_model=List[str], summary="검색어 자동완성 제안")
async def get_search_suggestions(
    query: str = Query(..., min_length=1, description="검색어"),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=20)
):
    """
    검색어 자동완성 제안
    
    입력된 검색어를 기반으로 상품명에서 유사한 키워드를 제안합니다.
    """
    
    # 상품명에서 검색어가 포함된 항목들을 찾아서 중복 제거
    products = db.query(Product.name).filter(
        Product.name.ilike(f"%{query}%"),
        Product.is_active == True
    ).distinct().limit(limit).all()
    
    # 상품명 리스트로 변환
    suggestions = [product.name for product in products]
    return suggestions

@router.get("/stats/summary", summary="상품 통계 정보 조회")
async def get_product_stats(db: Session = Depends(get_db)):
    """
    상품 통계 정보 조회
    
    - 전체 상품 수
    - 카테고리별 상품 수  
    - 평균 가격
    - 최고/최저 가격
    """
    

    
    # 전체 통계
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    avg_price = db.query(func.avg(Product.price)).filter(Product.is_active == True).scalar()
    min_price = db.query(func.min(Product.price)).filter(Product.is_active == True).scalar()
    max_price = db.query(func.max(Product.price)).filter(Product.is_active == True).scalar()
    
    # 카테고리별 통계
    category_stats = db.query(
        Product.type,
        func.count(Product.id).label('count')
    ).filter(Product.is_active == True).group_by(Product.type).all()
    
    return {
        "total_products": total_products,
        "average_price": round(float(avg_price) if avg_price else 0, 2),
        "min_price": float(min_price) if min_price else 0,
        "max_price": float(max_price) if max_price else 0,
        "categories": {stat.type: stat.count for stat in category_stats}
    } 