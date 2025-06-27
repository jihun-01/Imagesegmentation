from ultralytics import YOLO
import cv2
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image, ImageEnhance
import mediapipe as mp
from scipy import ndimage
import os
from torchvision.ops import nms
import torch

class HandWatchSegmentation:
    def __init__(self):
        """
        손과 손목시계 세그멘테이션을 위한 클래스 초기화
        """
        # YOLO 세그멘테이션 모델 로드 (YOLOv8 segmentation)
        self.model = YOLO("best.pt")
        
        # MediaPipe 손 검출 모델 초기화
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=2,
            min_detection_confidence=0.5
        )
        self.mp_draw = mp.solutions.drawing_utils
        
    def extract_hand_region(self, image_path):
        """
        이미지에서 손 영역을 추출하고 손목 위치와 각도를 찾습니다.
        
        Args:
            image_path (str): 손이 포함된 이미지 경로
            
        Returns:
            tuple: (원본이미지, 손영역마스크, 손목정보리스트)
                   손목정보: [(x, y, angle), ...] - 좌표와 각도 포함
        """
        # 이미지 로드
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"이미지를 불러올 수 없습니다: {image_path}")
            
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # MediaPipe로 손 랜드마크 검출
        results = self.hands.process(image_rgb)
        
        hand_mask = np.zeros(image.shape[:2], dtype=np.uint8)
        wrist_info = []  # (x, y, angle) 정보를 담을 리스트
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # 손목 관련 랜드마크 추출
                wrist = hand_landmarks.landmark[0]  # 손목
                thumb_cmc = hand_landmarks.landmark[1]  # 엄지 CMC 관절
                index_mcp = hand_landmarks.landmark[5]  # 검지 MCP 관절
                middle_mcp = hand_landmarks.landmark[9]  # 중지 MCP 관절
                
                # 좌표 변환
                wrist_x = int(wrist.x * image.shape[1])
                wrist_y = int(wrist.y * image.shape[0])
                
                thumb_x = int(thumb_cmc.x * image.shape[1])
                thumb_y = int(thumb_cmc.y * image.shape[0])
                
                index_x = int(index_mcp.x * image.shape[1])
                index_y = int(index_mcp.y * image.shape[0])
                
                middle_x = int(middle_mcp.x * image.shape[1])
                middle_y = int(middle_mcp.y * image.shape[0])
                
                # 손목 위치 조정 - 실제 손목시계 착용 위치로 이동
                adjusted_wrist_x, adjusted_wrist_y = self._adjust_wrist_position(
                    (wrist_x, wrist_y), (thumb_x, thumb_y), 
                    (index_x, index_y), (middle_x, middle_y)
                )
                
                # 손목 각도 계산
                wrist_angle = self._calculate_wrist_angle(
                    (adjusted_wrist_x, adjusted_wrist_y), 
                    (thumb_x, thumb_y),
                    (index_x, index_y), 
                    (middle_x, middle_y)
                )
                
                wrist_info.append((adjusted_wrist_x, adjusted_wrist_y, wrist_angle))
                
                print(f"원본 손목 위치: ({wrist_x}, {wrist_y})")
                print(f"조정된 손목 위치: ({adjusted_wrist_x}, {adjusted_wrist_y}), 각도: {wrist_angle:.1f}도")
                
                # 손 영역 마스크 생성
                hand_points = []
                for landmark in hand_landmarks.landmark:
                    x = int(landmark.x * image.shape[1])
                    y = int(landmark.y * image.shape[0])
                    hand_points.append([x, y])
                
                # 손 윤곽선으로 마스크 생성
                hand_points = np.array(hand_points)
                hull = cv2.convexHull(hand_points)
                cv2.fillPoly(hand_mask, [hull], 255)
        
        return image, hand_mask, wrist_info
    
    def _adjust_wrist_position(self, wrist_pos, thumb_pos, index_pos, middle_pos):
        """
        손목 위치를 실제 손목시계 착용 위치로 조정합니다.
        
        Args:
            wrist_pos: 원본 손목 좌표 (x, y)
            thumb_pos: 엄지 CMC 관절 좌표
            index_pos: 검지 MCP 관절 좌표  
            middle_pos: 중지 MCP 관절 좌표
            
        Returns:
            tuple: 조정된 손목 좌표 (x, y)
        """
        import math
        
        # 손목에서 손가락 방향으로의 벡터 계산
        # 중지 MCP를 기준으로 손목 방향 계산
        dx = middle_pos[0] - wrist_pos[0]
        dy = middle_pos[1] - wrist_pos[1]
        
        # 벡터 길이 계산
        vector_length = math.sqrt(dx*dx + dy*dy)
        
        if vector_length == 0:
            return wrist_pos
        
        # 손목시계 착용 위치로 이동할 거리 (벡터 길이의 30-40% 정도)
        # 이 값은 실제 손목시계 착용 위치에 맞게 조정 가능
        move_ratio = 0.35  # 35% 만큼 팔 방향으로 이동
        
        # 정규화된 방향 벡터 (팔 방향으로 반전)
        unit_dx = -dx / vector_length  # 방향 반전
        unit_dy = -dy / vector_length  # 방향 반전
        
        # 이동 거리 계산
        move_distance = vector_length * move_ratio
        
        # 새로운 손목 위치 계산 (팔 방향으로 이동)
        new_wrist_x = int(wrist_pos[0] + unit_dx * move_distance)
        new_wrist_y = int(wrist_pos[1] + unit_dy * move_distance)
        
        return new_wrist_x, new_wrist_y
    
    def _calculate_wrist_angle(self, wrist_pos, thumb_pos, index_pos, middle_pos):
        """
        손목의 회전 각도를 계산합니다.
        
        Args:
            wrist_pos: 손목 좌표 (x, y)
            thumb_pos: 엄지 CMC 관절 좌표
            index_pos: 검지 MCP 관절 좌표  
            middle_pos: 중지 MCP 관절 좌표
            
        Returns:
            float: 손목 회전 각도 (도 단위, -180 ~ 180)
        """
        import math
        
        # 방법 1: 손목에서 중지 MCP까지의 벡터 각도
        dx1 = middle_pos[0] - wrist_pos[0]
        dy1 = middle_pos[1] - wrist_pos[1]
        angle1 = math.degrees(math.atan2(dy1, dx1))
        
        # 방법 2: 검지와 중지 MCP를 잇는 선의 수직 방향
        dx2 = middle_pos[0] - index_pos[0]
        dy2 = middle_pos[1] - index_pos[1]
        angle2 = math.degrees(math.atan2(dy2, dx2)) + 90  # 수직 방향
        
        # 각도 정규화 (-180 ~ 180)
        def normalize_angle(angle):
            while angle > 180:
                angle -= 360
            while angle < -180:
                angle += 360
            return angle
        
        angle1 = normalize_angle(angle1)
        angle2 = normalize_angle(angle2)
        
        # 주요 각도 사용 (손목-중지 방향이 가장 안정적)
        final_angle = angle1
        
        # 각도 보정 (손목시계가 자연스럽게 보이도록)
        final_angle = normalize_angle(final_angle + 90)  # 시계 방향 보정
        
        return final_angle
    
    def extract_watch_from_image(self, image_path):
        """
        이미지에서 손목시계를 추출합니다. (단순화된 버전)
        
        Args:
            image_path (str): 손목시계가 포함된 이미지 경로
            
        Returns:
            tuple: (시계이미지, 시계마스크)
        """
        # 이미지 로드
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"이미지를 불러올 수 없습니다: {image_path}")
        
        print(f"이미지 정보: {image.shape}")
        
        # 1단계: YOLO 세그멘테이션 시도
        watch_mask = self._try_yolo_segmentation(image)
        
        # 2단계: YOLO가 실패하면 전체 이미지 사용 (임시 방법)
        if np.sum(watch_mask) == 0:
            print("YOLO 세그멘테이션 실패. 전체 이미지를 시계로 간주합니다.")
            watch_mask = self._create_full_image_mask(image)
        
        # 3단계: 마스크 품질 확인 및 개선
        watch_mask = self._improve_watch_mask(image, watch_mask)
        
        return image, watch_mask
    
    def _try_yolo_segmentation(self, image):
        """
        YOLO를 이용한 세그멘테이션 시도
        """
        try:
            results = self.model(image)
            watch_mask = np.zeros(image.shape[:2], dtype=np.uint8)
            
            print("YOLO 검출된 객체들:")
            for result in results:
                if result.boxes is not None:
                    for i, box in enumerate(result.boxes):
                        cls_id = int(box.cls[0])
                        class_name = self.model.names[cls_id]
                        conf = float(box.conf[0])
                        print(f"  - {class_name}: {conf:.2f}")
                        
                        # 모든 객체에 대해 마스크 생성 시도 (시계가 다른 이름으로 검출될 수 있음)
                        if result.masks is not None and i < len(result.masks.data):
                            mask = result.masks.data[i]
                            mask_resized = cv2.resize(
                                mask.cpu().numpy(), 
                                (image.shape[1], image.shape[0])
                            )
                            mask_binary = (mask_resized > 0.5).astype(np.uint8) * 255
                            
                            # 시계 관련 키워드 또는 적당한 크기의 객체
                            is_watch_related = any(keyword in class_name.lower() for keyword in 
                                                 ['watch', 'clock', 'bracelet', 'jewelry', 'accessory'])
                            
                            # 객체 크기 확인 (너무 크거나 작지 않은)
                            mask_area = np.sum(mask_binary > 0)
                            total_area = image.shape[0] * image.shape[1]
                            area_ratio = mask_area / total_area
                            
                            if is_watch_related or (0.05 < area_ratio < 0.8):
                                print(f"  -> 시계 후보로 선택: {class_name} (면적비: {area_ratio:.3f})")
                                watch_mask = np.maximum(watch_mask, mask_binary)
            
            return watch_mask
            
        except Exception as e:
            print(f"YOLO 세그멘테이션 오류: {e}")
            return np.zeros(image.shape[:2], dtype=np.uint8)
    
    def _create_full_image_mask(self, image):
        """
        전체 이미지를 시계로 간주하는 마스크 생성 (백업 방법)
        """
        # 이미지 가장자리에서 약간 안쪽 영역을 시계로 간주
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        h, w = image.shape[:2]
        
        # 가장자리 10% 제외하고 내부 영역을 시계로 간주
        margin_h = int(h * 0.1)
        margin_w = int(w * 0.1)
        
        mask[margin_h:h-margin_h, margin_w:w-margin_w] = 255
        
        return mask
    
    def _improve_watch_mask(self, image, mask):
        """
        시계 마스크를 개선합니다.
        """
        if np.sum(mask) == 0:
            return mask
        
        # 기본적인 노이즈 제거
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # 가장 큰 연결된 영역만 유지
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            # 가장 큰 컨투어 선택
            largest_contour = max(contours, key=cv2.contourArea)
            
            # 새로운 마스크 생성
            improved_mask = np.zeros(mask.shape, dtype=np.uint8)
            cv2.fillPoly(improved_mask, [largest_contour], 255)
            
            # 너무 작은 마스크인 경우 약간 확장
            mask_area = cv2.contourArea(largest_contour)
            total_area = image.shape[0] * image.shape[1]
            
            if mask_area / total_area < 0.1:  # 전체 이미지의 10% 미만이면 확장
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20))
                improved_mask = cv2.dilate(improved_mask, kernel, iterations=1)
            
            return improved_mask
        
        return mask

    def _is_incomplete_watch_mask(self, mask):
        """
        간단한 마스크 완전성 검사
        """
        if np.sum(mask) == 0:
            return True
            
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return True
            
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # 너무 정사각형이면 시계 페이스만 있는 것으로 판단
        aspect_ratio = w / h if h > 0 else 1
        return 0.85 <= aspect_ratio <= 1.15

    def _enhanced_watch_segmentation(self, image):
        """
        간단한 보완 세그멘테이션
        """
        # HSV 기반 간단한 세그멘테이션
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # 넓은 범위의 색상 마스크
        lower = np.array([0, 0, 30])
        upper = np.array([180, 255, 255])
        mask = cv2.inRange(hsv, lower, upper)
        
        # 가장자리 제거 (배경 제거)
        h, w = mask.shape
        border = 20
        mask[:border, :] = 0
        mask[-border:, :] = 0
        mask[:, :border] = 0
        mask[:, -border:] = 0
        
        return mask
    
    def resize_and_position_watch(self, watch_image, watch_mask, wrist_info, hand_image, target_size=None):
        """
        시계를 손목 크기와 각도에 맞게 리사이즈하고 회전시킵니다.
        
        Args:
            watch_image: 시계 이미지
            watch_mask: 시계 마스크
            wrist_info: 손목 정보 (x, y, angle) 또는 (x, y)
            hand_image: 손 이미지
            target_size: 목표 크기 (None이면 자동 계산)
            
        Returns:
            tuple: (리사이즈된 시계이미지, 리사이즈된 마스크, 새로운 위치)
        """
        # 손목 정보 파싱 (각도 정보가 있는지 확인)
        if len(wrist_info) == 3:
            wrist_x, wrist_y, wrist_angle = wrist_info
        else:
            wrist_x, wrist_y = wrist_info
            wrist_angle = 0  # 기본 각도
        
        # 시계 영역만 추출
        watch_only = cv2.bitwise_and(watch_image, watch_image, mask=watch_mask)
        
        # 시계 바운딩 박스 찾기
        contours, _ = cv2.findContours(watch_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None, None, None
            
        # 가장 큰 컨투어 선택
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # 시계 영역 크롭
        watch_cropped = watch_only[y:y+h, x:x+w]
        mask_cropped = watch_mask[y:y+h, x:x+w]
        
        # 목표 크기 계산 (원본 비율 유지)
        if target_size is None:
            target_size = self.get_auto_target_size_with_ratio(hand_image, watch_cropped)
        
        # 목표 크기로 리사이즈
        watch_resized = cv2.resize(watch_cropped, target_size)
        mask_resized = cv2.resize(mask_cropped, target_size)
        
        # 손목 각도에 맞춰 시계 회전 (각도 정보가 있을 때만)
        if len(wrist_info) == 3 and abs(wrist_angle) > 5:  # 5도 이상일 때만 회전
            watch_rotated, mask_rotated = self._rotate_watch(
                watch_resized, mask_resized, wrist_angle
            )
            
            # 회전 후 크기가 변할 수 있으므로 새로운 크기 확인
            rotated_h, rotated_w = watch_rotated.shape[:2]
            
            # 손목 위치에 맞게 새로운 위치 계산 (회전된 크기 고려)
            new_x = wrist_x - rotated_w // 2
            new_y = wrist_y - rotated_h // 2
            
            return watch_rotated, mask_rotated, (new_x, new_y)
        else:
            # 회전하지 않는 경우
            new_x = wrist_x - target_size[0] // 2
            new_y = wrist_y - target_size[1] // 2
            
            return watch_resized, mask_resized, (new_x, new_y)
    
    def _rotate_watch(self, watch_image, watch_mask, angle):
        """
        시계 이미지와 마스크를 지정된 각도로 회전시킵니다.
        
        Args:
            watch_image: 시계 이미지
            watch_mask: 시계 마스크
            angle: 회전 각도 (도 단위)
            
        Returns:
            tuple: (회전된 시계이미지, 회전된 마스크)
        """
        h, w = watch_image.shape[:2]
        center = (w // 2, h // 2)
        
        # 회전 매트릭스 생성
        rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # 회전 후 이미지 크기 계산 (잘리지 않도록)
        cos_angle = abs(rotation_matrix[0, 0])
        sin_angle = abs(rotation_matrix[0, 1])
        
        new_w = int((h * sin_angle) + (w * cos_angle))
        new_h = int((h * cos_angle) + (w * sin_angle))
        
        # 회전 중심 조정
        rotation_matrix[0, 2] += (new_w / 2) - center[0]
        rotation_matrix[1, 2] += (new_h / 2) - center[1]
        
        # 이미지 회전
        rotated_watch = cv2.warpAffine(
            watch_image, rotation_matrix, (new_w, new_h),
            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0)
        )
        
        # 마스크 회전
        rotated_mask = cv2.warpAffine(
            watch_mask, rotation_matrix, (new_w, new_h),
            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
            borderValue=0
        )
        
        return rotated_watch, rotated_mask
    
    def blend_watch_on_hand(self, hand_image, watch_image, watch_mask, position):
        """
        손목에 시계를 자연스럽게 합성합니다.
        
        Args:
            hand_image: 손 이미지
            watch_image: 시계 이미지
            watch_mask: 시계 마스크
            position: 시계를 배치할 위치 (x, y)
            
        Returns:
            np.ndarray: 합성된 이미지
        """
        result = hand_image.copy()
        h, w = hand_image.shape[:2]
        watch_h, watch_w = watch_image.shape[:2]
        
        x, y = position
        
        # 이미지 경계 확인 및 조정
        if x < 0:
            watch_image = watch_image[:, -x:]
            watch_mask = watch_mask[:, -x:]
            watch_w += x
            x = 0
        if y < 0:
            watch_image = watch_image[-y:, :]
            watch_mask = watch_mask[-y:, :]
            watch_h += y
            y = 0
        if x + watch_w > w:
            watch_w = w - x
            watch_image = watch_image[:, :watch_w]
            watch_mask = watch_mask[:, :watch_w]
        if y + watch_h > h:
            watch_h = h - y
            watch_image = watch_image[:watch_h, :]
            watch_mask = watch_mask[:watch_h, :]
        
        if watch_w <= 0 or watch_h <= 0:
            return result
        
        # 알파 블렌딩을 위한 마스크 정규화
        watch_mask_norm = watch_mask.astype(float) / 255.0
        
        # 3채널로 확장
        if len(watch_mask_norm.shape) == 2:
            watch_mask_norm = np.stack([watch_mask_norm] * 3, axis=-1)
        
        # 관심 영역 추출
        roi = result[y:y+watch_h, x:x+watch_w]
        
        # 알파 블렌딩
        blended = watch_image * watch_mask_norm + roi * (1 - watch_mask_norm)
        result[y:y+watch_h, x:x+watch_w] = blended.astype(np.uint8)
        
        return result
    
    def get_auto_target_size(self, hand_image, watch_image, 비율=0.18):
        """
        손목 크기에 맞게 시계 크기를 계산합니다. (원본 비율 유지)
        
        Args:
            hand_image: 손 이미지
            watch_image: 시계 이미지
            비율: 손목 대비 시계 크기 비율 (기본값: 0.18)
            
        Returns:
            tuple: (width, height) - 시계의 새로운 크기
        """
        h, w = hand_image.shape[:2]
        watch_h, watch_w = watch_image.shape[:2]
        
        # 손목 크기 추정 (손 이미지의 작은 쪽을 기준)
        wrist_size = min(h, w) * 비율
        
        # 시계의 원본 비율 계산
        watch_aspect_ratio = watch_w / watch_h
        
        # 비율을 유지하면서 손목 크기에 맞게 조정
        if watch_aspect_ratio >= 1:  # 가로가 더 긴 경우
            new_width = int(wrist_size)
            new_height = int(wrist_size / watch_aspect_ratio)
        else:  # 세로가 더 긴 경우
            new_height = int(wrist_size)
            new_width = int(wrist_size * watch_aspect_ratio)
        
        return (new_width, new_height)
    
    def get_auto_target_size_with_ratio(self, hand_image, watch_image, 비율=0.29):
        """
        손 이미지 크기를 기준으로 시계 이미지의 원본 비율을 유지하며 크기를 조정합니다.
        
        Args:
            hand_image: 손 이미지
            watch_image: 시계 이미지
            비율: 손목 대비 시계 크기 비율 (기본값: 0.29)
            
        Returns:
            tuple: (width, height) - 시계의 새로운 크기
        """
        h_hand, w_hand = hand_image.shape[:2]
        h_watch, w_watch = watch_image.shape[:2]
        wrist_size = min(h_hand, w_hand) * 비율
        aspect_ratio = w_watch / h_watch
        if aspect_ratio >= 1:
            new_width = int(wrist_size)
            new_height = int(wrist_size / aspect_ratio)
        else:
            new_height = int(wrist_size)
            new_width = int(wrist_size * aspect_ratio)
        return (new_width, new_height)
    
    def process_virtual_try_on(self, hand_image_path, watch_image_path, output_path=None):
        """
        가상 시계 착용 전체 프로세스를 수행합니다. (각도 지원 버전)
        
        Args:
            hand_image_path: 손 이미지 경로
            watch_image_path: 시계 이미지 경로
            output_path: 결과 저장 경로 (선택사항)
            
        Returns:
            tuple: (원본 손 이미지, 합성 결과 이미지)
        """
        try:
            # 1. 손 영역과 손목 위치/각도 추출
            print("손 영역과 손목 각도를 추출하는 중...")
            hand_image, hand_mask, wrist_info_list = self.extract_hand_region(hand_image_path)
            
            if not wrist_info_list:
                raise ValueError("손목을 찾을 수 없습니다.")
            
            # 2. 시계 추출
            print("시계 영역을 추출하는 중...")
            watch_image, watch_mask = self.extract_watch_from_image(watch_image_path)
            
            # 3. 각 손목에 시계 적용 (각도 고려)
            result = hand_image.copy()
            
            for i, wrist_info in enumerate(wrist_info_list):
                if len(wrist_info) == 3:
                    wrist_x, wrist_y, wrist_angle = wrist_info
                    print(f"{i+1}번째 손목에 시계를 적용하는 중... (각도: {wrist_angle:.1f}도)")
                else:
                    wrist_x, wrist_y = wrist_info
                    print(f"{i+1}번째 손목에 시계를 적용하는 중...")
                
                # 시계 크기 조정, 회전 및 위치 계산 (원본 비율 유지)
                watch_processed, mask_processed, new_position = self.resize_and_position_watch(
                    watch_image, watch_mask, wrist_info, hand_image, target_size=None
                )
                
                if watch_processed is not None:
                    # 시계 합성
                    result = self.blend_watch_on_hand(
                        result, watch_processed, mask_processed, new_position
                    )
            
            # 4. 결과 저장
            if output_path:
                cv2.imwrite(output_path, result)
                print(f"결과가 저장되었습니다: {output_path}")
            
            return hand_image, result
            
        except Exception as e:
            print(f"오류 발생: {str(e)}")
            return None, None
    
    def visualize_results(self, original_hand, original_watch, result, hand_mask, watch_mask):
        """
        결과를 시각화합니다.
        
        Args:
            original_hand: 원본 손 이미지
            original_watch: 원본 시계 이미지  
            result: 합성 결과
            hand_mask: 손 마스크
            watch_mask: 시계 마스크
        """
        plt.rcParams['font.family'] = 'Malgun Gothic'
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        
        # 원본 손 이미지
        axes[0, 0].imshow(cv2.cvtColor(original_hand, cv2.COLOR_BGR2RGB))
        axes[0, 0].set_title('원본 손 이미지')
        axes[0, 0].axis('off')
        
        # 손 마스크
        axes[0, 1].imshow(hand_mask, cmap='gray')
        axes[0, 1].set_title('손 영역 마스크')
        axes[0, 1].axis('off')
        
        # 원본 시계 이미지
        axes[0, 2].imshow(cv2.cvtColor(original_watch, cv2.COLOR_BGR2RGB))
        axes[0, 2].set_title('원본 시계 이미지')
        axes[0, 2].axis('off')
        
        # 시계 마스크
        axes[1, 0].imshow(watch_mask, cmap='gray')
        axes[1, 0].set_title('시계 영역 마스크')
        axes[1, 0].axis('off')
        
        # 합성 결과
        axes[1, 1].imshow(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))
        axes[1, 1].set_title('가상 착용 결과')
        axes[1, 1].axis('off')
        
        # 비교 (원본 vs 결과)
        comparison = np.hstack([
            cv2.cvtColor(original_hand, cv2.COLOR_BGR2RGB),
            cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
        ])
        axes[1, 2].imshow(comparison)
        axes[1, 2].set_title('착용 전 vs 착용 후')
        axes[1, 2].axis('off')
        
        plt.tight_layout()
        plt.show()

    def visualize_hand_landmarks(self, image_path):
        """
        손 랜드마크와 각도를 시각화합니다. (디버깅용)
        """
        image = cv2.imread(image_path)
        if image is None:
            return
            
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image_rgb)
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # 랜드마크 그리기
                self.mp_draw.draw_landmarks(
                    image, hand_landmarks, self.mp_hands.HAND_CONNECTIONS
                )
                
                # 손목 관련 랜드마크 추출
                wrist = hand_landmarks.landmark[0]
                thumb_cmc = hand_landmarks.landmark[1]
                index_mcp = hand_landmarks.landmark[5]
                middle_mcp = hand_landmarks.landmark[9]
                
                # 좌표 변환
                wrist_x = int(wrist.x * image.shape[1])
                wrist_y = int(wrist.y * image.shape[0])
                
                thumb_x = int(thumb_cmc.x * image.shape[1])
                thumb_y = int(thumb_cmc.y * image.shape[0])
                index_x = int(index_mcp.x * image.shape[1])
                index_y = int(index_mcp.y * image.shape[0])
                middle_x = int(middle_mcp.x * image.shape[1])
                middle_y = int(middle_mcp.y * image.shape[0])
                
                # 조정된 손목 위치 계산
                adjusted_wrist_x, adjusted_wrist_y = self._adjust_wrist_position(
                    (wrist_x, wrist_y), (thumb_x, thumb_y),
                    (index_x, index_y), (middle_x, middle_y)
                )
                
                # 각도 계산
                angle = self._calculate_wrist_angle(
                    (adjusted_wrist_x, adjusted_wrist_y), (thumb_x, thumb_y),
                    (index_x, index_y), (middle_x, middle_y)
                )
                
                # 원본 손목 위치 표시 (빨간색)
                cv2.circle(image, (wrist_x, wrist_y), 8, (0, 0, 255), -1)
                cv2.putText(image, "원본", (wrist_x + 10, wrist_y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                
                # 조정된 손목 위치 표시 (녹색)
                cv2.circle(image, (adjusted_wrist_x, adjusted_wrist_y), 8, (0, 255, 0), -1)
                cv2.putText(image, f"조정됨 {angle:.1f}°", 
                           (adjusted_wrist_x + 10, adjusted_wrist_y + 20),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                # 방향 화살표 그리기 (조정된 위치에서)
                import math
                arrow_length = 50
                end_x = int(adjusted_wrist_x + arrow_length * math.cos(math.radians(angle)))
                end_y = int(adjusted_wrist_y + arrow_length * math.sin(math.radians(angle)))
                cv2.arrowedLine(image, (adjusted_wrist_x, adjusted_wrist_y), (end_x, end_y), 
                               (0, 255, 0), 3, tipLength=0.3)
        
        # 결과 표시
        plt.figure(figsize=(10, 8))
        plt.rcParams['font.family'] = 'Malgun Gothic'
        plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        plt.title('손목 위치 조정 시각화 (빨간색: 원본, 녹색: 조정됨)')
        plt.axis('off')
        plt.show()

def debug_watch_extraction(image_path):
    """
    시계 추출 과정을 단계별로 시각화하여 디버깅합니다.
    """
    segmenter = HandWatchSegmentation()
    
    # 이미지 로드
    image = cv2.imread(image_path)
    if image is None:
        print(f"이미지를 불러올 수 없습니다: {image_path}")
        return
    
    print(f"이미지 정보: {image.shape}")
    
    # 시계 추출
    _, watch_mask = segmenter.extract_watch_from_image(image_path)
    
    # 결과 시각화
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    plt.rcParams['font.family'] = 'Malgun Gothic'
    
    # 원본 이미지
    axes[0].imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    axes[0].set_title('원본 이미지')
    axes[0].axis('off')
    
    # 추출된 마스크
    axes[1].imshow(watch_mask, cmap='gray')
    axes[1].set_title('추출된 마스크')
    axes[1].axis('off')
    
    # 마스크 적용 결과
    masked_image = cv2.bitwise_and(image, image, mask=watch_mask)
    axes[2].imshow(cv2.cvtColor(masked_image, cv2.COLOR_BGR2RGB))
    axes[2].set_title('마스크 적용 결과')
    axes[2].axis('off')
    
    plt.tight_layout()
    plt.show()
    
    # 마스크 통계
    mask_area = np.sum(watch_mask > 0)
    total_area = watch_mask.shape[0] * watch_mask.shape[1]
    print(f"마스크 면적: {mask_area} 픽셀 ({mask_area/total_area*100:.1f}%)")

def main():
    """
    메인 실행 함수 - 테스트용
    """
    # 세그멘테이션 시스템 초기화
    segmenter = HandWatchSegmentation()
    
    # 테스트 이미지 경로
    hand_image_path = "hand_test.jpg"
    watch_image_path = "watch_test.jpg"
    
    # 테스트 이미지가 존재하는지 확인
    if not os.path.exists(hand_image_path):
        print(f"손 이미지를 찾을 수 없습니다: {hand_image_path}")
        return
    
    if not os.path.exists(watch_image_path):
        print(f"시계 이미지를 찾을 수 없습니다: {watch_image_path}")
        return
    
    # 1. 손목 각도 시각화 테스트
    print("=== 손목 각도 시각화 ===")
    segmenter.visualize_hand_landmarks(hand_image_path)
    
    # 2. 시계 추출 디버깅
    print("\n=== 시계 추출 디버깅 ===")
    debug_watch_extraction(watch_image_path)
    
    # 3. 가상 착용 처리
    print("\n=== 가상 시계 착용 ===")
    original_hand, result = segmenter.process_virtual_try_on(
        hand_image_path, 
        watch_image_path, 
        "virtual_try_on_result.jpg"
    )
    
    if original_hand is not None and result is not None:
        # 결과 시각화
        _, hand_mask, _ = segmenter.extract_hand_region(hand_image_path)
        original_watch, watch_mask = segmenter.extract_watch_from_image(watch_image_path)
        
        segmenter.visualize_results(
            original_hand, original_watch, result, 
            hand_mask, watch_mask
        )
        
        print("가상 착용이 완료되었습니다!")
    else:
        print("가상 착용 처리 중 오류가 발생했습니다.")

if __name__ == "__main__":
    main() 