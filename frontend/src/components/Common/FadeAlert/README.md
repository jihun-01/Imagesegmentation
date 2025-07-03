# FadeAlert 컴포넌트 & useFadeAlert 훅

재사용 가능한 페이드 인/아웃 애니메이션을 제공하는 알림 시스템입니다.

## 파일 구조
```
src/
├── components/
│   ├── Common/
│   │   └── FadeAlert/
│   │       ├── FadeAlert.js          # 알림 컴포넌트
│   │       └── README.md             # 사용법 가이드
│   └── Hooks/
│       └── useFadeAlert.js           # 알림 상태 관리 훅
```

## 주요 기능

**부드러운 페이드 애니메이션**: 500ms duration의 자연스러운 전환
**타입별 스타일링**: success(녹색), error(빨간색) 테마
**위치 커스터마이징**: top, bottom 위치 선택 가능
**자동 사라짐**: 3초 후 자동으로 페이드 아웃
**재사용 가능**: 여러 컴포넌트에서 동일한 인터페이스로 사용

## 🔧 사용법

### 1. 기본 사용법

```jsx
import React from 'react';
import useFadeAlert from '../Hooks/useFadeAlert';
import FadeAlert from '../Common/FadeAlert/FadeAlert';

const MyComponent = () => {
  const { alertMessage, alertType, showAlert, showFadeAlert } = useFadeAlert();

  const handleSuccess = () => {
    showFadeAlert('작업이 완료되었습니다!', 'success');
  };

  const handleError = () => {
    showFadeAlert('오류가 발생했습니다.', 'error');
  };

  return (
    <div>
      <button onClick={handleSuccess}>성공 알림</button>
      <button onClick={handleError}>오류 알림</button>
      
      <FadeAlert 
        show={showAlert}
        message={alertMessage}
        type={alertType}
        position="bottom"
      />
    </div>
  );
};
```

### 2. 고급 사용법 (커스텀 지속시간)

```jsx
const handleCustomDuration = () => {
  // 5초 동안 표시
  showFadeAlert('5초 동안 표시됩니다', 'success', 5000);
};
```

### 3. 수동 닫기

```jsx
const { hideAlert } = useFadeAlert();

const handleManualClose = () => {
  hideAlert();
};

// 닫기 버튼이 있는 알림
<FadeAlert 
  show={showAlert}
  message={alertMessage}
  type={alertType}
  position="top"
  onClose={hideAlert}
/>
```

## 📋 API 레퍼런스

### useFadeAlert 훅

| 반환값 | 타입 | 설명 |
|-------|------|------|
| `alertMessage` | string | 현재 표시중인 메시지 |
| `alertType` | 'success' \| 'error' | 알림 타입 |
| `showAlert` | boolean | 알림 표시 여부 |
| `showFadeAlert` | function | 알림 표시 함수 |
| `hideAlert` | function | 알림 수동 닫기 함수 |

#### showFadeAlert(message, type, duration)

| 매개변수 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `message` | string | - | 표시할 메시지 |
| `type` | 'success' \| 'error' | 'success' | 알림 타입 |
| `duration` | number | 3000 | 표시 시간(ms) |

### FadeAlert 컴포넌트

| Props | 타입 | 기본값 | 설명 |
|-------|------|--------|------|
| `show` | boolean | - | 알림 표시 여부 |
| `message` | string | - | 표시할 메시지 |
| `type` | 'success' \| 'error' | 'success' | 알림 타입 |
| `position` | 'top' \| 'bottom' | 'bottom' | 알림 위치 |
| `onClose` | function | - | 닫기 버튼 클릭 핸들러 |

## 스타일 커스터마이징

타입별 기본 스타일:

### Success 타입
- 배경: `bg-green-50`
- 아이콘: `text-black`
- 제목: `text-black font-bold`
- 메시지: `text-gray-600`

### Error 타입
- 배경: `bg-red-50`
- 아이콘: `text-red-500`
- 제목: `text-red-500`
- 메시지: `text-red-500`

## 사용 팁

1. **위치 선택**: 사용자 액션에 가까운 위치에 표시하는 것이 좋습니다
2. **메시지 길이**: 한 줄에 표시 가능한 길이로 작성하세요
3. **타입 선택**: 성공적인 액션에는 'success', 오류나 경고에는 'error' 사용
4. **지속시간**: 중요한 메시지는 더 오래, 일반적인 확인 메시지는 기본 시간 사용

## 마이그레이션 가이드

기존 alert() 사용을 FadeAlert로 변경:

```jsx
// 변경 전
alert('장바구니에 추가되었습니다!');

// 변경 후
showFadeAlert('장바구니에 추가되었습니다!', 'success');
``` 