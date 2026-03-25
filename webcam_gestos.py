import cv2
import mediapipe as mp
import os
import requests
import time
import math
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- CONFIGURAÇÕES ---
MODEL_PATH = "gesture_recognizer.task"
PHASE_DURATION = 7  # Segundos por fase

# Landmarks e Conexões (Padrão MediaPipe)
WRIST = 0
MIDDLE_MCP = 9
HAND_CONNECTIONS = [(0,1),(1,2),(2,3),(3,4),(0,5),(5,6),(6,7),(7,8),(5,9),(9,10),(10,11),(11,12),(9,13),(13,14),(14,15),(15,16),(13,17),(0,17),(17,18),(18,19),(19,20)]

def get_distance(p1, p2):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

def senior_count_fingers(landmarks):
    """Lógica avançada para contar dedos levantados."""
    count = 0
    # Dedos (Indicador ao Mínimo)
    tips = [8, 12, 16, 20]
    pips = [6, 10, 14, 18]
    for tip, pip in zip(tips, pips):
        if get_distance(landmarks[WRIST], landmarks[tip]) > get_distance(landmarks[WRIST], landmarks[pip]) * 1.1:
            count += 1
    # Polegar
    if get_distance(landmarks[4], landmarks[5]) > get_distance(landmarks[WRIST], landmarks[9]) * 0.45:
        count += 1
    return count

def run_gesture_calculator():
    if not os.path.exists(MODEL_PATH):
        print(f"Erro: Arquivo '{MODEL_PATH}' não encontrado.")
        return

    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.GestureRecognizerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=2,
        min_hand_detection_confidence=0.6,
        min_tracking_confidence=0.7
    )
    recognizer = vision.GestureRecognizer.create_from_options(options)

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    # Variáveis de Estado
    # Fases: 0 = Aguardando Num 1, 1 = Aguardando Num 2, 2 = Exibindo Resultado
    stage = 0
    num1, num2 = 0, 0
    start_time = time.time()
    
    print("\n--- CALCULADORA HUMANA POR GESTOS ---")
    print("Fase 1: Escolha o primeiro número (15 segundos)")

    while cap.isOpened():
        success, frame = cap.read()
        if not success: break

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Inferência
        timestamp_ms = int(time.time() * 1000)
        result = recognizer.recognize_for_video(mp_image, timestamp_ms)

        current_fingers = 0
        if result.hand_landmarks:
            for landmarks in result.hand_landmarks:
                current_fingers += senior_count_fingers(landmarks)
                # Renderiza esqueleto
                for conn in HAND_CONNECTIONS:
                    p1, p2 = landmarks[conn[0]], landmarks[conn[1]]
                    cv2.line(frame, (int(p1.x*w), int(p1.y*h)), (int(p2.x*w), int(p2.y*h)), (0, 255, 0), 2)
                for lm in landmarks:
                    cv2.circle(frame, (int(lm.x*w), int(lm.y*h)), 3, (0, 0, 255), -1)

        # Lógica de Tempo e Fases
        elapsed = time.time() - start_time
        remaining = max(0, PHASE_DURATION - elapsed)

        # --- INTERFACE E CONTROLE ---
        if stage == 0: # FASE 1
            cv2.putText(frame, f"FASE 1: Mostre o numero 1", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            cv2.putText(frame, f"Tempo: {int(remaining)}s", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 255), 3)
            num1 = current_fingers # Vai atualizando até o tempo acabar
            if remaining <= 0:
                print(f"Número 1 selecionado: {num1}")
                stage = 1
                start_time = time.time()
        
        elif stage == 1: # FASE 2
            cv2.putText(frame, f"NUM 1 FIXO: {num1}", (w-300, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, f"FASE 2: Mostre o numero 2", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            cv2.putText(frame, f"Tempo: {int(remaining)}s", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 255), 3)
            num2 = current_fingers
            if remaining <= 0:
                print(f"Número 2 selecionado: {num2}")
                stage = 2
                start_time = time.time()
        
        elif stage == 2: # RESULTADO
            # Banner de Resultado Central
            overlay = frame.copy()
            cv2.rectangle(overlay, (w//2-300, h//2-100), (w//2+300, h//2+100), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
            
            total = num1 + num2
            texto = f"{num1} + {num2} = {total}"
            cv2.putText(frame, "RESULTADO SOMA", (w//2-150, h//2-50), cv2.FONT_HERSHEY_SIMPLEX, 1, (200, 200, 200), 2)
            cv2.putText(frame, texto, (w//2-220, h//2+40), cv2.FONT_HERSHEY_TRIPLEX, 2.5, (0, 255, 0), 4)
            cv2.putText(frame, "Pressione 'r' para reiniciar", (w//2-150, h//2+80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        # Reiniciar com 'r'
        key = cv2.waitKey(1) & 0xFF
        if key == ord('r'):
            stage = 0
            start_time = time.time()
            num1, num2 = 0, 0
        elif key == ord('q'):
            break

        cv2.imshow('Gesture Math Quiz - 15s Timer', frame)

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_gesture_calculator()
