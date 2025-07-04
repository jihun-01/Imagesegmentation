from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image, ImageEnhance
import mediapipe as mp  # type: ignore
from scipy import ndimage
import os
from torchvision.ops import nms
import torch
import io
import signal
import time

class HandWatchSegmentation:
    def __init__(self):
        """손과 손목시계 세그멘테이션을 위한 클래스 초기화"""
        self.model = YOLO("best.pt")
        
        self.mp_hands = mp.solutions.hands  # type: ignore
        self.hands = self.mp_hands.Hands(  # type: ignore
            static_image_mode=True,
            max_num_hands=2,
            min_detection_confidence=0.5
        )
        self.mp_draw = mp.solutions.drawing_utils  # type: ignore
        
    def extract_hand_region_from_bytes(self, image_bytes):
        """바이트 데이터에서 손 영역을 추출하고 손목 위치와 각도를 찾습니다."""
        # 바이트 데이터를 numpy 배열로 변환
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("이미지 데이터를 읽을 수 없습니다.")
            
        return self._process_hand_region(image)
    
    def extract_hand_region(self, image_path):
        """이미지에서 손 영역을 추출하고 손목 위치와 각도를 찾습니다."""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"이미지를 불러올 수 없습니다: {image_path}")
            
        return self._process_hand_region(image)
    
    def _process_hand_region(self, image):
        """공통 손 영역 처리 로직"""
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image_rgb)
        
        hand_mask = np.zeros(image.shape[:2], dtype=np.uint8)
        wrist_info = []
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                wrist = hand_landmarks.landmark[0]
                thumb_cmc = hand_landmarks.landmark[1]
                index_mcp = hand_landmarks.landmark[5]
                middle_mcp = hand_landmarks.landmark[9]
                
                wrist_x = int(wrist.x * image.shape[1])
                wrist_y = int(wrist.y * image.shape[0])
                
                thumb_x = int(thumb_cmc.x * image.shape[1])
                thumb_y = int(thumb_cmc.y * image.shape[0])
                
                index_x = int(index_mcp.x * image.shape[1])
                index_y = int(index_mcp.y * image.shape[0])
                
                middle_x = int(middle_mcp.x * image.shape[1])
                middle_y = int(middle_mcp.y * image.shape[0])
                
                adjusted_wrist_x, adjusted_wrist_y = self._adjust_wrist_position(
                    (wrist_x, wrist_y), (thumb_x, thumb_y), 
                    (index_x, index_y), (middle_x, middle_y)
                )
                
                wrist_angle = self._calculate_wrist_angle(
                    (adjusted_wrist_x, adjusted_wrist_y), 
                    (thumb_x, thumb_y),
                    (index_x, index_y), 
                    (middle_x, middle_y)
                )
                
                wrist_info.append((adjusted_wrist_x, adjusted_wrist_y, wrist_angle))
                
                print(f"원본 손목 위치: ({wrist_x}, {wrist_y})")
                print(f"조정된 손목 위치: ({adjusted_wrist_x}, {adjusted_wrist_y}), 각도: {wrist_angle:.1f}도")
                
                hand_points = []
                for landmark in hand_landmarks.landmark:
                    x = int(landmark.x * image.shape[1])
                    y = int(landmark.y * image.shape[0])
                    hand_points.append([x, y])
                
                hand_points = np.array(hand_points)
                hull = cv2.convexHull(hand_points)
                cv2.fillPoly(hand_mask, [hull], (255,))
        
        # 손 마스크에 GrabCut 후처리 적용 (선택적)
        if np.sum(hand_mask) > 0:
            try:
                hand_mask = self._apply_grabcut_to_hand(image, hand_mask)
            except Exception as e:
                print(f"손 GrabCut 적용 실패, 기본 마스크 사용: {e}")
        
        return image, hand_mask, wrist_info
    
    def _adjust_wrist_position(self, wrist_pos, thumb_pos, index_pos, middle_pos):
        """손목 위치를 실제 손목시계 착용 위치로 조정합니다."""
        import math
        
        dx = middle_pos[0] - wrist_pos[0]
        dy = middle_pos[1] - wrist_pos[1]
        
        vector_length = math.sqrt(dx*dx + dy*dy)
        
        if vector_length == 0:
            return wrist_pos
        
        move_ratio = 0.35
        
        unit_dx = -dx / vector_length
        unit_dy = -dy / vector_length
        
        move_distance = vector_length * move_ratio
        
        new_wrist_x = int(wrist_pos[0] + unit_dx * move_distance)
        new_wrist_y = int(wrist_pos[1] + unit_dy * move_distance)
        
        return new_wrist_x, new_wrist_y
    
    def _calculate_wrist_angle(self, wrist_pos, thumb_pos, index_pos, middle_pos):
        """손목의 회전 각도를 계산합니다."""
        import math
        
        dx1 = middle_pos[0] - wrist_pos[0]
        dy1 = middle_pos[1] - wrist_pos[1]
        angle1 = math.degrees(math.atan2(dy1, dx1))
        
        dx2 = middle_pos[0] - index_pos[0]
        dy2 = middle_pos[1] - index_pos[1]
        angle2 = math.degrees(math.atan2(dy2, dx2)) + 90
        
        def normalize_angle(angle):
            while angle > 180:
                angle -= 360
            while angle < -180:
                angle += 360
            return angle
        
        angle1 = normalize_angle(angle1)
        angle2 = normalize_angle(angle2)
        
        final_angle = angle1
        final_angle = normalize_angle(final_angle + 90)
        
        return final_angle
    
    def extract_watch_from_bytes(self, image_bytes):
        """바이트 데이터에서 손목시계를 추출합니다."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("이미지 데이터를 읽을 수 없습니다.")
            
        return self._process_watch_extraction(image)
        
    def extract_watch_from_image(self, image_path):
        """이미지에서 손목시계를 추출합니다."""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"이미지를 불러올 수 없습니다: {image_path}")
        
        return self._process_watch_extraction(image)
    
    def _process_watch_extraction(self, image):
        """공통 시계 추출 처리 로직"""
        print(f"이미지 정보: {image.shape}")
        
        watch_mask = self._try_yolo_segmentation(image)
        
        if np.sum(watch_mask) == 0:
            print("YOLO 세그멘테이션 실패. 전체 이미지를 시계로 간주합니다.")
            watch_mask = self._create_full_image_mask(image)
        
        watch_mask = self._improve_watch_mask(image, watch_mask)
        
        return image, watch_mask
    
    def _try_yolo_segmentation(self, image):
        """YOLO를 이용한 세그멘테이션 시도"""
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
                        
                        if result.masks is not None and i < len(result.masks.data):
                            mask = result.masks.data[i]
                            mask_resized = cv2.resize(
                                mask.cpu().numpy(), 
                                (image.shape[1], image.shape[0])
                            )
                            mask_binary = (mask_resized > 0.5).astype(np.uint8) * 255
                            
                            is_watch_related = any(keyword in class_name.lower() for keyword in 
                                                 ['watch', 'clock', 'bracelet', 'jewelry', 'accessory'])
                            
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
        """전체 이미지를 시계로 간주하는 마스크 생성"""
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        h, w = image.shape[:2]
        
        margin_h = int(h * 0.1)
        margin_w = int(w * 0.1)
        
        mask[margin_h:h-margin_h, margin_w:w-margin_w] = 255
        
        return mask
    
    def _improve_watch_mask(self, image, mask):
        """시계 마스크를 개선합니다."""
        if np.sum(mask) == 0:
            return mask
        
        # 기본 모폴로지 연산
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            
            improved_mask = np.zeros(mask.shape, dtype=np.uint8)
            cv2.fillPoly(improved_mask, [largest_contour], (255,))
            
            mask_area = cv2.contourArea(largest_contour)
            total_area = image.shape[0] * image.shape[1]
            
            if mask_area / total_area < 0.1:
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20))
                improved_mask = cv2.dilate(improved_mask, kernel, iterations=1)
            
            # GrabCut 후처리 적용 (선택적)
            try:
                improved_mask = self._apply_grabcut_refinement(image, improved_mask)
            except Exception as e:
                print(f"GrabCut 적용 실패, 기본 마스크 사용: {e}")
            
            return improved_mask
        
        return mask
    
    def _apply_grabcut_refinement(self, image, initial_mask):
        """GrabCut을 사용하여 마스크를 정교하게 개선합니다."""
        try:
            print("GrabCut 시계 마스크 개선 시작...")
            
            # 이미지 크기가 너무 크면 리사이즈
            max_size = 800
            h, w = image.shape[:2]
            if max(h, w) > max_size:
                scale = max_size / max(h, w)
                new_h, new_w = int(h * scale), int(w * scale)
                resized_image = cv2.resize(image, (new_w, new_h))
                resized_mask = cv2.resize(initial_mask, (new_w, new_h))
                print(f"이미지 리사이즈: {w}x{h} -> {new_w}x{new_h}")
            else:
                resized_image = image
                resized_mask = initial_mask
            
            # 초기 마스크를 GrabCut 형식으로 변환
            # 0: 배경, 1: 전경, 2: 확실한 배경, 3: 확실한 전경
            grabcut_mask = np.zeros(resized_image.shape[:2], dtype=np.uint8)
            
            # 초기 마스크에서 확실한 전경 설정
            grabcut_mask[resized_mask > 0] = cv2.GC_PR_FGD
            
            # 마스크 경계 주변을 확실한 전경으로 설정
            kernel = np.ones((3, 3), np.uint8)
            dilated_mask = cv2.dilate(resized_mask, kernel, iterations=2)
            eroded_mask = cv2.erode(resized_mask, kernel, iterations=2)
            
            # 확실한 전경 (eroded 영역)
            grabcut_mask[eroded_mask > 0] = cv2.GC_FGD
            
            # 확실한 배경 (dilated 영역 밖)
            grabcut_mask[dilated_mask == 0] = cv2.GC_BGD
            
            # 배경 모델과 전경 모델 초기화
            bgd_model = np.zeros((1, 65), dtype=np.float64)
            fgd_model = np.zeros((1, 65), dtype=np.float64)
            
            print("GrabCut 실행 중...")
            # GrabCut 실행 (반복 횟수 줄임, 타임아웃 적용)
            start_time = time.time()
            rect = self._get_bounding_rect_from_mask(resized_mask)
            
            try:
                if rect is not None:
                    cv2.grabCut(resized_image, grabcut_mask, rect, bgd_model, fgd_model, iterCount=3, mode=cv2.GC_INIT_WITH_RECT)
                else:
                    # rect가 None인 경우 마스크 모드로 실행
                    cv2.grabCut(resized_image, grabcut_mask, (0, 0, resized_image.shape[1], resized_image.shape[0]), bgd_model, fgd_model, iterCount=3, mode=cv2.GC_INIT_WITH_MASK)
                
                elapsed_time = time.time() - start_time
                print(f"GrabCut 실행 시간: {elapsed_time:.2f}초")
                
            except Exception as e:
                print(f"GrabCut 실행 중 오류: {e}")
                return initial_mask
            
            print("GrabCut 완료, 결과 마스크 생성 중...")
            # 결과 마스크 생성
            refined_mask = np.where((grabcut_mask == cv2.GC_FGD) | (grabcut_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
            
            # 원본 크기로 복원
            if max(h, w) > max_size:
                refined_mask = cv2.resize(refined_mask, (w, h))
            
            # 결과가 너무 작으면 원본 마스크 반환
            if np.sum(refined_mask) < np.sum(initial_mask) * 0.3:
                print("GrabCut 결과가 너무 작아 원본 마스크를 사용합니다.")
                return initial_mask
            
            print("GrabCut 시계 마스크 개선 완료")
            return refined_mask
            
        except Exception as e:
            print(f"GrabCut 처리 중 오류 발생: {e}")
            return initial_mask
    
    def _get_bounding_rect_from_mask(self, mask):
        """마스크에서 바운딩 박스를 추출합니다."""
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # 바운딩 박스를 약간 확장
            margin = 10
            x = max(0, x - margin)
            y = max(0, y - margin)
            w = min(mask.shape[1] - x, w + 2 * margin)
            h = min(mask.shape[0] - y, h + 2 * margin)
            
            return (x, y, w, h)
        return None
    
    def _apply_grabcut_to_hand(self, image, initial_hand_mask):
        """손 마스크에 GrabCut을 적용하여 더 정교한 손 영역을 추출합니다."""
        try:
            print("GrabCut 손 마스크 개선 시작...")
            
            # 이미지 크기가 너무 크면 리사이즈
            max_size = 800
            h, w = image.shape[:2]
            if max(h, w) > max_size:
                scale = max_size / max(h, w)
                new_h, new_w = int(h * scale), int(w * scale)
                resized_image = cv2.resize(image, (new_w, new_h))
                resized_mask = cv2.resize(initial_hand_mask, (new_w, new_h))
                print(f"손 이미지 리사이즈: {w}x{h} -> {new_w}x{new_h}")
            else:
                resized_image = image
                resized_mask = initial_hand_mask
            
            # 초기 마스크를 GrabCut 형식으로 변환
            grabcut_mask = np.zeros(resized_image.shape[:2], dtype=np.uint8)
            
            # 초기 손 마스크에서 확실한 전경 설정
            grabcut_mask[resized_mask > 0] = cv2.GC_PR_FGD
            
            # 손 마스크 경계 주변을 확실한 전경으로 설정
            kernel = np.ones((5, 5), np.uint8)
            dilated_mask = cv2.dilate(resized_mask, kernel, iterations=3)
            eroded_mask = cv2.erode(resized_mask, kernel, iterations=3)
            
            # 확실한 전경 (eroded 영역)
            grabcut_mask[eroded_mask > 0] = cv2.GC_FGD
            
            # 확실한 배경 (dilated 영역 밖)
            grabcut_mask[dilated_mask == 0] = cv2.GC_BGD
            
            # 배경 모델과 전경 모델 초기화
            bgd_model = np.zeros((1, 65), dtype=np.float64)
            fgd_model = np.zeros((1, 65), dtype=np.float64)
            
            print("손 GrabCut 실행 중...")
            # GrabCut 실행 (반복 횟수 줄임, 타임아웃 적용)
            start_time = time.time()
            rect = self._get_bounding_rect_from_mask(resized_mask)
            
            try:
                if rect is not None:
                    cv2.grabCut(resized_image, grabcut_mask, rect, bgd_model, fgd_model, iterCount=5, mode=cv2.GC_INIT_WITH_RECT)
                else:
                    cv2.grabCut(resized_image, grabcut_mask, (0, 0, resized_image.shape[1], resized_image.shape[0]), bgd_model, fgd_model, iterCount=5, mode=cv2.GC_INIT_WITH_MASK)
                
                elapsed_time = time.time() - start_time
                print(f"손 GrabCut 실행 시간: {elapsed_time:.2f}초")
                
            except Exception as e:
                print(f"손 GrabCut 실행 중 오류: {e}")
                return initial_hand_mask
            
            print("손 GrabCut 완료, 결과 마스크 생성 중...")
            # 결과 마스크 생성
            refined_mask = np.where((grabcut_mask == cv2.GC_FGD) | (grabcut_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
            
            # 원본 크기로 복원
            if max(h, w) > max_size:
                refined_mask = cv2.resize(refined_mask, (w, h))
            
            # 결과가 너무 작으면 원본 마스크 반환
            if np.sum(refined_mask) < np.sum(initial_hand_mask) * 0.5:
                print("손 GrabCut 결과가 너무 작아 원본 마스크를 사용합니다.")
                return initial_hand_mask
            
            # 손 마스크 후처리 (노이즈 제거)
            kernel = np.ones((3, 3), np.uint8)
            refined_mask = cv2.morphologyEx(refined_mask, cv2.MORPH_CLOSE, kernel, iterations=1)
            refined_mask = cv2.morphologyEx(refined_mask, cv2.MORPH_OPEN, kernel, iterations=1)
            
            print("GrabCut 손 마스크 개선 완료")
            return refined_mask
            
        except Exception as e:
            print(f"손 GrabCut 처리 중 오류 발생: {e}")
            return initial_hand_mask
    
    def _is_incomplete_watch_mask(self, mask):
        """간단한 마스크 완전성 검사"""
        if np.sum(mask) == 0:
            return True
            
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return True
            
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        aspect_ratio = w / h if h > 0 else 1
        return 0.85 <= aspect_ratio <= 1.15

    def _enhanced_watch_segmentation(self, image):
        """간단한 보완 세그멘테이션"""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        lower = np.array([0, 0, 30])
        upper = np.array([180, 255, 255])
        mask = cv2.inRange(hsv, lower, upper)
        
        h, w = mask.shape
        border = 20
        mask[:border, :] = 0
        mask[-border:, :] = 0
        mask[:, :border] = 0
        mask[:, -border:] = 0
        
        return mask
    
    def resize_and_position_watch(self, watch_image, watch_mask, wrist_info, hand_image, target_size=None):
        """시계를 손목 크기와 각도에 맞게 리사이즈하고 회전시킵니다."""
        if len(wrist_info) == 3:
            wrist_x, wrist_y, wrist_angle = wrist_info
        else:
            wrist_x, wrist_y = wrist_info
            wrist_angle = 0
        
        watch_only = cv2.bitwise_and(watch_image, watch_image, mask=watch_mask)
        
        contours, _ = cv2.findContours(watch_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None, None, None
            
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        watch_cropped = watch_only[y:y+h, x:x+w]
        mask_cropped = watch_mask[y:y+h, x:x+w]
        
        if target_size is None:
            target_size = self.get_auto_target_size_with_ratio(hand_image, watch_cropped)
        
        watch_resized = cv2.resize(watch_cropped, target_size)
        mask_resized = cv2.resize(mask_cropped, target_size)
        
        if len(wrist_info) == 3 and abs(wrist_angle) > 5:
            watch_rotated, mask_rotated = self._rotate_watch(
                watch_resized, mask_resized, wrist_angle
            )
            
            rotated_h, rotated_w = watch_rotated.shape[:2]
            
            new_x = wrist_x - rotated_w // 2
            new_y = wrist_y - rotated_h // 2
            
            return watch_rotated, mask_rotated, (new_x, new_y)
        else:
            new_x = wrist_x - target_size[0] // 2
            new_y = wrist_y - target_size[1] // 2
            
            return watch_resized, mask_resized, (new_x, new_y)
    
    def _rotate_watch(self, watch_image, watch_mask, angle):
        """시계 이미지와 마스크를 지정된 각도로 회전시킵니다."""
        h, w = watch_image.shape[:2]
        center = (w // 2, h // 2)
        
        rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        cos_angle = abs(rotation_matrix[0, 0])
        sin_angle = abs(rotation_matrix[0, 1])
        
        new_w = int((h * sin_angle) + (w * cos_angle))
        new_h = int((h * cos_angle) + (w * sin_angle))
        
        rotation_matrix[0, 2] += (new_w / 2) - center[0]
        rotation_matrix[1, 2] += (new_h / 2) - center[1]
        
        rotated_watch = cv2.warpAffine(
            watch_image, rotation_matrix, (new_w, new_h),
            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0)
        )
        
        rotated_mask = cv2.warpAffine(
            watch_mask, rotation_matrix, (new_w, new_h),
            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0,)
        )
        
        return rotated_watch, rotated_mask
    
    def blend_watch_on_hand(self, hand_image, watch_image, watch_mask, position):
        """손목에 시계를 자연스럽게 합성합니다."""
        result = hand_image.copy()
        h, w = hand_image.shape[:2]
        watch_h, watch_w = watch_image.shape[:2]
        
        x, y = position
        
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
        
        watch_mask_norm = watch_mask.astype(float) / 255.0
        
        if len(watch_mask_norm.shape) == 2:
            watch_mask_norm = np.stack([watch_mask_norm] * 3, axis=-1)
        
        roi = result[y:y+watch_h, x:x+watch_w]
        
        blended = watch_image * watch_mask_norm + roi * (1 - watch_mask_norm)
        result[y:y+watch_h, x:x+watch_w] = blended.astype(np.uint8)
        
        return result
    
    def get_auto_target_size(self, hand_image, watch_image, 비율=0.18):
        """손목 크기에 맞게 시계 크기를 계산합니다."""
        h, w = hand_image.shape[:2]
        watch_h, watch_w = watch_image.shape[:2]
        
        wrist_size = min(h, w) * 비율
        
        watch_aspect_ratio = watch_w / watch_h
        
        if watch_aspect_ratio >= 1:
            new_width = int(wrist_size)
            new_height = int(wrist_size / watch_aspect_ratio)
        else:
            new_height = int(wrist_size)
            new_width = int(wrist_size * watch_aspect_ratio)
        
        return (new_width, new_height)
    
    def get_auto_target_size_with_ratio(self, hand_image, watch_image, 비율=0.29):
        """손 이미지 크기를 기준으로 시계 이미지의 원본 비율을 유지하며 크기를 조정합니다."""
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
    
    def process_virtual_try_on_from_bytes(self, hand_image_bytes, watch_image_bytes):
        """바이트 데이터로부터 가상 시계 착용 전체 프로세스를 수행합니다."""
        try:
            print("손 영역과 손목 각도를 추출하는 중...")
            hand_image, hand_mask, wrist_info_list = self.extract_hand_region_from_bytes(hand_image_bytes)
            
            if not wrist_info_list:
                raise ValueError("손목을 찾을 수 없습니다.")
            
            print("시계 영역을 추출하는 중...")
            watch_image, watch_mask = self.extract_watch_from_bytes(watch_image_bytes)
            
            result = hand_image.copy()
            
            for i, wrist_info in enumerate(wrist_info_list):
                if len(wrist_info) == 3:
                    wrist_x, wrist_y, wrist_angle = wrist_info
                    print(f"{i+1}번째 손목에 시계를 적용하는 중... (각도: {wrist_angle:.1f}도)")
                else:
                    wrist_x, wrist_y = wrist_info
                    print(f"{i+1}번째 손목에 시계를 적용하는 중...")
                
                watch_processed, mask_processed, new_position = self.resize_and_position_watch(
                    watch_image, watch_mask, wrist_info, hand_image, target_size=None
                )
                
                if watch_processed is not None:
                    result = self.blend_watch_on_hand(
                        result, watch_processed, mask_processed, new_position
                    )
            
            return hand_image, result
            
        except Exception as e:
            print(f"오류 발생: {str(e)}")
            return None, None

    def process_virtual_try_on(self, hand_image_path, watch_image_path, output_path=None):
        """가상 시계 착용 전체 프로세스를 수행합니다."""
        try:
            print("손 영역과 손목 각도를 추출하는 중...")
            hand_image, hand_mask, wrist_info_list = self.extract_hand_region(hand_image_path)
            
            if not wrist_info_list:
                raise ValueError("손목을 찾을 수 없습니다.")
            
            print("시계 영역을 추출하는 중...")
            watch_image, watch_mask = self.extract_watch_from_image(watch_image_path)
            
            result = hand_image.copy()
            
            for i, wrist_info in enumerate(wrist_info_list):
                if len(wrist_info) == 3:
                    wrist_x, wrist_y, wrist_angle = wrist_info
                    print(f"{i+1}번째 손목에 시계를 적용하는 중... (각도: {wrist_angle:.1f}도)")
                else:
                    wrist_x, wrist_y = wrist_info
                    print(f"{i+1}번째 손목에 시계를 적용하는 중...")
                
                watch_processed, mask_processed, new_position = self.resize_and_position_watch(
                    watch_image, watch_mask, wrist_info, hand_image, target_size=None
                )
                
                if watch_processed is not None:
                    result = self.blend_watch_on_hand(
                        result, watch_processed, mask_processed, new_position
                    )
            
            if output_path:
                cv2.imwrite(output_path, result)
                print(f"결과가 저장되었습니다: {output_path}")
            
            return hand_image, result
            
        except Exception as e:
            print(f"오류 발생: {str(e)}")
            return None, None 