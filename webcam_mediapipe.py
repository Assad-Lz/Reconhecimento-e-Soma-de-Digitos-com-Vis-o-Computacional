import cv2
import mediapipe as mp
import os
import requests
import time
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- CONFIGURAÇÕES ---
# URL do modelo EfficientDet-Lite0 (leve e otimizado para CPU)
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite"
MODEL_PATH = "efficientdet_lite0.tflite"
THRESHOLD = 0.4  # Sensibilidade (0 a 1)

def download_model(url, save_path):
    """Baixa o modelo .tflite se ele ainda não estiver presente localmente."""
    if not os.path.exists(save_path):
        print(f"Baixando modelo de detecção ({save_path})... aguarde.")
        response = requests.get(url)
        with open(save_path, "wb") as f:
            f.write(response.content)
        print("Download concluído!")

def run_webcam_detection():
    # Garante que o modelo existe
    download_model(MODEL_URL, MODEL_PATH)

    # Inicialização do MediaPipe Object Detector
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.ObjectDetectorOptions(
        base_options=base_options,
        score_threshold=THRESHOLD,
        running_mode=vision.RunningMode.VIDEO
    )
    detector = vision.ObjectDetector.create_from_options(options)

    # Inicialização da Webcam (0 é o índice padrão da câmera)
    cap = cv2.VideoCapture(0)

    print("\n--- INICIANDO WEBCAM ---")
    print("Pressione 'q' para sair do script.\n")

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            print("Não foi possível acessar a webcam.")
            break

        # O MediaPipe requer o formato RGB (OpenCV usa BGR por padrão)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Realiza a detecção por frame (Timestamp em ms)
        timestamp_ms = int(time.time() * 1000)
        detection_result = detector.detect_for_video(mp_image, timestamp_ms)

        # Desenhar os resultados no frame
        for detection in detection_result.detections:
            # Pegando as coordenadas da caixa delimitadora
            bbox = detection.bounding_box
            start_point = (int(bbox.origin_x), int(bbox.origin_y))
            end_point = (int(bbox.origin_x + bbox.width), int(bbox.origin_y + bbox.height))

            # Desenha retângulo
            cv2.rectangle(frame, start_point, end_point, (0, 255, 0), 2)

            # Legenda (Categoria e Score)
            category = detection.categories[0]
            label = f"{category.category_name} ({category.score:.0%})"
            cv2.putText(frame, label, (start_point[0], start_point[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Mostra o resultado na janela
        cv2.imshow('Detecção de Objetos - MediaPipe', frame)

        # Pressione 'q' para sair
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Finalização
    cap.release()
    cv2.destroyAllWindows()
    print("Script encerrado.")

if __name__ == "__main__":
    run_webcam_detection()
