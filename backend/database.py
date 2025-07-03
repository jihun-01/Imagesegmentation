"""
MySQL 데이터베이스 연결 및 ORM 설정
- SQLAlchemy를 사용한 데이터베이스 연결
- 세션 관리 및 의존성 주입
- 데이터베이스 모델 기반 구조
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 데이터베이스 연결 URL 설정 (UTF-8 인코딩 포함)
# 개발환경에서는 SQLite, 운영환경에서는 MySQL 사용
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./watchstore.db"  # 기본값: SQLite (개발용)
)

# SQLAlchemy 엔진 생성
if DATABASE_URL.startswith("sqlite"):
    # SQLite 설정
    engine = create_engine(
        DATABASE_URL,
        echo=False,  # SQL 쿼리 로깅 (개발 시에만 True)
        connect_args={"check_same_thread": False}  # SQLite용 설정
    )
else:
    # MySQL 설정
    engine = create_engine(
        DATABASE_URL,
        echo=False,  # SQL 쿼리 로깅 (개발 시에만 True)
        pool_pre_ping=True,  # 연결 상태 확인
        pool_recycle=3600,   # 연결 재사용 시간 (1시간)
    )

# 세션 로컬 클래스 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 클래스 생성 (모든 모델의 기본 클래스)
Base = declarative_base()

def get_db():
    """
    데이터베이스 세션 의존성 주입
    FastAPI의 Depends와 함께 사용
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    데이터베이스 테이블 초기화
    개발 환경에서 테이블 생성 시 사용
    """
    Base.metadata.create_all(bind=engine) 