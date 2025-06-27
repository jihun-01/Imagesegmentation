#!/usr/bin/env python3
"""
가상 시계 착용 API 서버 시작 스크립트
"""

import uvicorn
import sys
import os

# 현재 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def main():
    """
    FastAPI 서버를 시작합니다.
    """
    print("=" * 50)
    print("🕐 가상 시계 착용 API 서버 시작")
    print("=" * 50)
    print(f"📁 작업 디렉토리: {current_dir}")
    print("🌐 서버 주소: http://localhost:8000")
    print("📖 API 문서: http://localhost:8000/docs")
    print("🔄 자동 재시작: 활성화")
    print("=" * 50)
    
    try:
        # 개발 모드로 서버 시작 (자동 재시작 포함)
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,  # 파일 변경 시 자동 재시작
            reload_dirs=[current_dir],  # 감시할 디렉토리
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 서버가 종료되었습니다.")
    except Exception as e:
        print(f"❌ 서버 시작 오류: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 