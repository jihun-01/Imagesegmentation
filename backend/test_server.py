from fastapi import FastAPI
import uvicorn

# 간단한 테스트용 FastAPI 앱
app = FastAPI(title="테스트 서버")

@app.get("/")
def read_root():
    return {"message": "FastAPI 서버가 정상 작동 중입니다!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    print("테스트 서버를 시작합니다...")
    print("서버 주소: http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info") 