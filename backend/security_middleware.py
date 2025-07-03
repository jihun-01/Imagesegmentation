"""
보안 미들웨어
- Rate Limiting
- 보안 헤더 추가
- 로깅 및 모니터링
"""

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import time
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    보안 미들웨어
    - Rate Limiting
    - 보안 헤더 추가
    - 요청 로깅
    """
    
    def __init__(self, app, max_requests: int = 1000, time_window: int = 60):
        super().__init__(app)
        self.max_requests = max_requests  # 시간 창당 최대 요청 수 (1000개/분으로 증가)
        self.time_window = time_window    # 시간 창 (60초로 단축)
        self.request_counts = defaultdict(list)  # IP별 요청 기록
        
    async def dispatch(self, request: Request, call_next):
        # 클라이언트 IP 가져오기
        client_ip = self._get_client_ip(request)
        
        # Rate Limiting 검사
        if self._is_rate_limited(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            raise HTTPException(
                status_code=429,
                detail="너무 많은 요청입니다. 잠시 후 다시 시도해주세요."
            )
        
        # 요청 기록
        self._record_request(client_ip)
        
        # 요청 로깅
        start_time = time.time()
        self._log_request(request, client_ip)
        
        # 실제 요청 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        process_time = time.time() - start_time
        
        # 보안 헤더 추가
        self._add_security_headers(response)
        
        # 응답 로깅
        self._log_response(response, process_time)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """클라이언트 IP 주소 추출"""
        # X-Forwarded-For 헤더 확인 (프록시 뒤에 있는 경우)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # X-Real-IP 헤더 확인
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # 직접 연결인 경우
        return request.client.host if request.client else "unknown"
    
    def _is_rate_limited(self, client_ip: str) -> bool:
        """Rate Limiting 검사"""
        now = datetime.now()
        cutoff_time = now - timedelta(seconds=self.time_window)
        
        # 시간 창 밖의 요청 기록 제거
        self.request_counts[client_ip] = [
            req_time for req_time in self.request_counts[client_ip]
            if req_time > cutoff_time
        ]
        
        # 현재 요청 수 확인
        return len(self.request_counts[client_ip]) >= self.max_requests
    
    def _record_request(self, client_ip: str):
        """요청 기록"""
        self.request_counts[client_ip].append(datetime.now())
    
    def _log_request(self, request: Request, client_ip: str):
        """요청 로깅"""
        user_agent = request.headers.get("User-Agent", "Unknown")
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {client_ip} [{user_agent}]"
        )
    
    def _log_response(self, response: Response, process_time: float):
        """응답 로깅"""
        logger.info(
            f"Response: {response.status_code} "
            f"({process_time:.3f}s)"
        )
    
    def _add_security_headers(self, response: Response):
        """보안 헤더 추가"""
        # XSS 방지
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # HTTPS 강제 (운영환경에서)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy (Swagger UI 지원)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https:; "
            "font-src 'self' https:;"
        )
        
        # 정보 노출 방지
        response.headers["Server"] = "WatchStore API"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

class RequestSizeMiddleware(BaseHTTPMiddleware):
    """
    요청 크기 제한 미들웨어
    - 대용량 요청 방지
    - DoS 공격 방어
    """
    
    def __init__(self, app, max_size: int = 10 * 1024 * 1024):  # 10MB
        super().__init__(app)
        self.max_size = max_size
        
    async def dispatch(self, request: Request, call_next):
        # Content-Length 헤더 확인
        content_length = request.headers.get("Content-Length")
        if content_length and int(content_length) > self.max_size:
            raise HTTPException(
                status_code=413,
                detail=f"요청 크기가 너무 큽니다. 최대 {self.max_size // (1024*1024)}MB까지 허용됩니다."
            )
        
        return await call_next(request) 