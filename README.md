# 가상 시계 착용 쇼핑몰

AI 기반 가상 시계 착용 체험이 가능한 온라인 시계 쇼핑몰입니다.

## 주요 기능

### 쇼핑몰 기능
- **상품 목록 및 검색**: 카테고리별 필터링, 검색 기능
- **가상화된 렌더링**: 대량 상품 목록의 성능 최적화
- **지연 로딩**: 뷰포트 기반 이미지 로딩으로 빠른 초기 로딩
- **디자인**: 모바일 최적화된 UI

### 사용자 인증
- **회원가입/로그인**: 이메일 기반 인증 시스템
- **JWT 토큰**: 안전한 인증 토큰 관리
- **자동 로그인**: 토큰 기반 세션 유지

### AI 기능
- **이미지 세그멘테이션**: 손목 및 시계 영역 자동 추출
- **가상 착용**: AI 기반 시계 착용 시뮬레이션
- **이미지 최적화**: 자동 리사이징 및 압축

### 쇼핑 기능
- **장바구니**: 상품 담기 및 수량 관리
- **위시리스트**: 관심 상품 저장
- **상품 상세**: 상품 정보 및 리뷰 시스템

## 기술 스택

### Frontend
- **React 18**: 모던 React with Hooks
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **React Router**: SPA 라우팅
- **Context API**: 전역 상태 관리

### Backend
- **FastAPI**: 고성능 Python API 프레임워크
- **SQLAlchemy**: ORM 및 데이터베이스 관리
- **SQLite/MySQL**: 개발/운영 데이터베이스
- **JWT**: 토큰 기반 인증
- **Pydantic**: 데이터 검증 및 직렬화

### AI/ML
- **YOLO11**: 객체 탐지 및 세그멘테이션
- **MediaPipe**: 손 랜드마크 탐지
- **OpenCV**: 이미지 처리
- **PyTorch**: 딥러닝 프레임워크

## 설치 및 실행

### 환경 요구사항
- Python 3.10+
- Node.js 16+
- npm 또는 yarn


### 1. 백엔드 설정
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# 패키지 설치
pip install -r requirements.txt

# 환경변수 설정
copy .env.example .env
# .env 파일을 열어서 데이터베이스 정보 등을 설정하세요

# 서버 실행
python main.py
```

### 2. 프론트엔드 설정
```bash
cd frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm start
```

### 4. 접속
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

```


## 프로젝트 구조

```
├── backend/                 # 백엔드 API 서버

│   ├── routes/             # API 라우터

│   ├── models.py           # 데이터베이스 모델

│   ├── schemas.py          # Pydantic 스키마

│   ├── auth.py             # 인증 시스템

│   ├── database.py         # 데이터베이스 설정

│   └── main.py             # FastAPI 앱

├── frontend/               # React 프론트엔드

│   ├── src/

│   │   ├── components/     # React 컴포넌트

│   │   ├── contexts/       # Context API

│   │   ├── utils/          # 유틸리티 함수

│   │   └── auth/           # 인증 관련

│   └── public/

├── database/               # 데이터베이스 초기화

└── docker-compose.yml      # Docker 설정
```

### API 테스트
Swagger UI를 통한 대화형 API 테스트: http://localhost:8000/docs
