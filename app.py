import streamlit as st
import cv2
import av
import numpy as np
import time
import math
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from streamlit_webrtc import webrtc_streamer, VideoProcessorBase, WebRtcMode
import queue

# --- CONFIGURAÇÕES DE INTERFACE ---
st.set_page_config(page_title="Calculadora Senior AI", page_icon="🧮", layout="wide")

# CSS Customizado para Visual Premium
st.markdown("""
    <style>
    .main {
        background: #0e1117;
        color: #ffffff;
    }
    .stMetric {
        background: #1e2229;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 4px 15px rgba(0,255,127,0.1);
        border: 1px solid #00ff7f;
    }
    h1, h2, h3 {
        color: #00ff7f !important;
        font-family: 'Space Grotesk', sans-serif;
    }
    .info-panel {
        background: rgba(0, 255, 127, 0.05);
        border-left: 5px solid #00ff7f;
        padding: 20px;
        border-radius: 0 10px 10px 0;
        margin-bottom: 20px;
    }
    </style>
    """, unsafe_allow_html=True)

# --- LÓGICA DE VISÃO COMPUTACIONAL ---
MODEL_PATH = "gesture_recognizer.task"

class GestureProcessor(VideoProcessorBase):
    def __init__(self):
        # Inicializando o MediaPipe dentro do thread do processador
        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.GestureRecognizerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_hands=2,
            min_hand_detection_confidence=0.7,
            min_tracking_confidence=0.7
        )
        self.recognizer = vision.GestureRecognizer.create_from_options(options)
        self.result_queue = queue.Queue()

    def _get_distance(self, p1, p2):
        return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

    def count_fingers(self, landmarks):
        # Lógica Sênior
        count = 0
        tips, pips = [8, 12, 16, 20], [6, 10, 14, 18]
        wrist = landmarks[0]
        # Dedos normais
        for tip, pip in zip(tips, pips):
            if self._get_distance(wrist, landmarks[tip]) > self._get_distance(wrist, landmarks[pip]) * 1.1:
                count += 1
        # Polegar
        if self._get_distance(landmarks[4], landmarks[5]) > self._get_distance(wrist, landmarks[9]) * 0.45:
            count += 1
        return count

    def recv(self, frame):
        img = frame.to_ndarray(format="bgr24")
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_img)
        
        timestamp_ms = int(time.time() * 1000)
        res = self.recognizer.recognize_for_video(mp_image, timestamp_ms)
        
        total_fingers = 0
        if res.hand_landmarks:
            for landmarks in res.hand_landmarks:
                total_fingers += self.count_fingers(landmarks)
                # Drawing esqueleto resumido
                h, w, _ = img.shape
                for lm in landmarks:
                    cv2.circle(img, (int(lm.x*w), int(lm.y*h)), 3, (0, 255, 127), -1)
        
        # Enviando o resultado para a interface Streamlit
        self.result_queue.put(total_fingers)
        
        return av.VideoFrame.from_ndarray(img, format="bgr24")

# --- INTERFACE PRINCIPAL ---

# 1. Pop-up de Boas Vindas e Instruções (Simulado via Modal do Streamlit)
if "tutorial_finished" not in st.session_state:
    st.session_state.tutorial_finished = False

if not st.session_state.tutorial_finished:
    st.balloons()
    st.title("🚀 Bem-vindo à Calculadora Sênior AI!")
    
    with st.container():
        st.write("""
        ### Como funciona?
        1. **Permissão de Câmera**: Por segurança, sua câmera não é acessada automaticamente. Você precisará confirmar no navegador.
        2. **Fase 1 (Soma em Duas Etapas)**: O sistema identificará os dedos levantados nas suas mãos.
        3. **Privacidade**: Todo o processamento ocorre localmente. Nenhuma imagem é enviada para servidores externos.
        """)
        if st.button("Tudo pronto! Entendido ✅"):
            st.session_state.tutorial_finished = True
            st.rerun()
    st.stop()

# --- APP RUNNING ---
st.title("🧮 Calculadora de Visão Computacional Sênior")
st.markdown("<div class='info-panel'><b>Status:</b> Sistema aguardando ativação da câmera.</div>", unsafe_allow_html=True)

col1, col2 = st.columns([2, 1])

with col1:
    st.write("### 📹 Fluxo de Vídeo em Tempo Real")
    # Camada de Segurança: WEBRTC gerencia as permissões nativas do navegador
    ctx = webrtc_streamer(
        key="vision-calculator",
        mode=WebRtcMode.SENDRECV,
        video_processor_factory=GestureProcessor,
        rtc_configuration={
            "iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]
        },
        media_stream_constraints={"video": True, "audio": False},
        async_processing=True,
    )

with col2:
    st.write("### 📊 Resultados da Visão")
    placeholder_sum = st.empty()
    placeholder_sum.metric("DEDOS DETECTADOS", 0)
    
    st.markdown("---")
    st.write("#### 🛡️ Segurança e Privacidade")
    st.info("A câmera só é ativada após você clicar em 'Start'. O navegador perguntará sua permissão explicitamente.")

# --- ATUALIZAÇÃO DA UI EM REAL TIME ---
if ctx.video_processor:
    while ctx.state.playing:
        try:
            val = ctx.video_processor.result_queue.get(timeout=1.0)
            placeholder_sum.metric("DEDOS DETECTADOS", val)
        except queue.Empty:
            continue
else:
    st.warning("Clique no botão 'Start' acima para iniciar a câmera.")
