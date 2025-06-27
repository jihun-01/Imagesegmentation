# 🕐 가상 시계 착용 시스템

AI 기반 가상 시계 착용 웹 애플리케이션입니다. 사용자가 업로드한 손 이미지에 시계를 가상으로 착용해볼 수 있는 서비스를 제공합니다.

## ✨ 주요 기능

- **🛍️ 시계 쇼핑몰**: 다양한 시계 상품 보기
- **📱 상품 상세보기**: 시계 정보 및 리뷰 확인
- **🤖 AI 가상 착용**: 손 이미지에 시계를 가상으로 착용
- **💾 결과 저장**: 가상 착용 결과 이미지 다운로드

## 🏗️ 시스템 구조

```
Imagesegmentation/
├── backend/                     # FastAPI 백엔드 서버
│   ├── main.py                 # FastAPI 메인 서버
│   ├── hand_watch_segmentation.py  # AI 세그멘테이션 모듈
│   ├── requirements.txt        # Python 의존성
│   ├── start_server.py         # 서버 시작 스크립트
│   ├── best.pt                 # YOLO 세그멘테이션 모델
│   └── uploads/                # 업로드된 이미지 저장소
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/Pages/
│   │   │   ├── WatchStore.js       # 시계 목록 페이지
│   │   │   ├── ProductDetail.js    # 상품 상세 페이지
│   │   │   ├── VirtualWear.js      # 가상 착용 페이지
│   │   │   └── VirtualResult.js    # 결과 표시 페이지
│   │   └── tempdata.js         # 시계 상품 데이터
│   └── package.json            # Node.js 의존성
└── README.md
```

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd Imagesegmentation
```

### 2. 백엔드 설정
```bash
cd backend

# Python 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 시작
python start_server.py
# 또는
python main.py
```

### 3. 프론트엔드 설정
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm start
```

### 4. 접속
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 📖 사용법

### 가상 시계 착용하기

1. **시계 선택**: 메인 페이지에서 원하는 시계를 선택합니다.
2. **상품 상세보기**: 시계 정보를 확인하고 '착용해 보기' 버튼을 클릭합니다.
3. **손 이미지 업로드**: 손목이 명확하게 보이는 손 사진을 업로드합니다.
4. **AI 처리**: AI가 손목 위치를 감지하고 시계를 가상으로 착용시킵니다.
5. **결과 확인**: 가상 착용 결과를 확인하고 이미지를 저장할 수 있습니다.

### API 엔드포인트

- `POST /virtual-try-on`: 가상 시계 착용 처리
- `POST /extract-hand`: 손 영역 추출
- `POST /extract-watch`: 시계 영역 추출
- `GET /result/{session_id}`: 결과 이미지 다운로드
- `GET /health`: 서버 상태 확인

## 🔧 기술 스택

### 백엔드
- **FastAPI**: 웹 API 프레임워크
- **YOLO**: 객체 검출 및 세그멘테이션
- **MediaPipe**: 손 랜드마크 검출
- **OpenCV**: 이미지 처리
- **PyTorch**: 딥러닝 프레임워크

### 프론트엔드
- **React**: 사용자 인터페이스
- **React Router**: 페이지 라우팅
- **Tailwind CSS**: 스타일링

## 📋 필수 조건

- **Python 3.8+**
- **Node.js 16+**
- **GPU (권장)**: CUDA 지원 GPU로 더 빠른 AI 처리

## 🎯 지원되는 이미지 형식

- **손 이미지**: JPG, PNG (최대 10MB)
- **시계 이미지**: JPG, PNG
- **권장 해상도**: 1080p 이하

## 🔍 문제 해결

### 서버 연결 오류
```bash
# 백엔드 서버가 실행 중인지 확인
curl http://localhost:8000/health

# 방화벽 설정 확인
# CORS 오류인 경우 브라우저 콘솔 확인
```

### AI 모델 오류
```bash
# YOLO 모델 파일 확인
ls backend/best.pt

# GPU 메모리 부족 시 CPU 모드로 실행
# hand_watch_segmentation.py에서 device 설정 변경
```

### 손목 검출 실패
- 손목이 명확하게 보이는 이미지 사용
- 충분한 조명 확보
- 손목 전체가 프레임 안에 들어오도록 촬영

## 📝 라이선스

이 프로젝트는 MIT 라이선스하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해주세요.


