import React, { useEffect, useRef, useState } from 'react';
import { 
  Plus, RotateCcw, 
  Code, Globe, ExternalLink, Activity, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIGURAÇÕES ---
const PHASE_TIME = 7;
type Phase = 'WELCOME' | 'PHASE_1' | 'PHASE_2' | 'RESULT';
const GITHUB_URL = "https://github.com/Assad-Lz/Reconhecimento-e-Soma-de-Digitos-com-Vis-o-Computacional";

// --- ÍCONES OFICIAIS DAS TECNOLOGIAS (SVG) ---
const TechIcons = {
  OpenCV: () => (
    <svg viewBox="0 0 100 100" className="w-5 h-5">
      <circle cx="50" cy="25" r="20" fill="none" stroke="#ff0000" strokeWidth="10" />
      <circle cx="25" cy="70" r="20" fill="none" stroke="#00ff00" strokeWidth="10" />
      <circle cx="75" cy="70" r="20" fill="none" stroke="#0000ff" strokeWidth="10" />
    </svg>
  ),
  HuggingFace: () => (
    <span className="text-xl">🤗</span>
  ),
  Python: () => (
    <svg viewBox="0 0 448 512" className="w-5 h-5 fill-blue-500">
      <path d="M439.4 153.1c0-28.5-23.2-51.7-51.7-51.7h-77.5c-14.3 0-25.8 11.6-25.8 25.8v77.5c0 14.3 11.6 25.8 25.8 25.8h77.5c28.5 0 51.7-23.2 51.7-51.7v-25.7zM206.6 358.9c0 28.5 23.2 51.7 51.7 51.7h77.5c14.3 0 25.8-11.6 25.8-25.8v-77.5c0-14.3-11.6-25.8-25.8-25.8h-77.5c-28.5 0-51.7 23.2-51.7 51.7v25.7zM206.6 153.1c0-28.5-23.2-51.7-51.7-51.7h-77.5C63.1 101.4 51.6 113 51.6 127.3v77.5c0 14.3 11.6 25.8 25.8 25.8h77.5c28.5 0 51.7-23.2 51.7-51.7v-25.8zM439.4 358.9c0-28.5-23.2-51.7-51.7-51.7h-77.5c-14.3 0-25.8 11.6-25.8 25.8v77.5c0 14.3 11.6 25.8 25.8 25.8h77.5c28.5 0 51.7-23.2 51.7-51.7v-25.7z"/>
    </svg>
  ),
  PyTorch: () => (
    <svg viewBox="0 0 100 100" className="w-5 h-5">
        <path d="M50 0 L100 50 L50 100 L0 50 Z" fill="#EE4C2C" />
    </svg>
  ),
  React: () => (
    <svg viewBox="-11.5 -10.23174 23 20.46348" className="w-5 h-5 fill-blue-300">
      <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
      <g stroke="#61dafb" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2"/>
        <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
        <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
      </g>
    </svg>
  ),
  Vite: () => (
    <svg viewBox="0 0 32 32" className="w-5 h-5">
      <path d="M30 4.4l-14 26-14-26h28z" fill="#646CFF" />
      <path d="M16 30.4l8-22h-16l8 22z" fill="#FFD62E" />
    </svg>
  ),
};

// --- COMPONENTE DE FUNDO (MESH PARTICLES) ---
const BackgroundMesh: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let particles: { x: number; y: number; vx: number; vy: number }[] = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const create = () => {
      particles = Array.from({ length: 70 }, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4
      }));
    };
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 255, 127, 0.4)'; 
      ctx.strokeStyle = 'rgba(0, 255, 127, 0.12)'; 
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 180) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
        }
      });
      requestAnimationFrame(animate);
    };
    resize(); create(); animate();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-60" />;
};

// --- APP PRINCIPAL ---
const App: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('WELCOME');
  const [timer, setTimer] = useState(PHASE_TIME);
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [currentFingers, setCurrentFingers] = useState(0);
  const [streamActive, setStreamActive] = useState(false);
  const [errorPrompt, setErrorPrompt] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fingersRef = useRef(0);

  useEffect(() => { fingersRef.current = currentFingers; }, [currentFingers]);

  const processFingers = (landmarks: any[]) => {
    let count = 0;
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const getDist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
    tips.forEach((tip, i) => { if (getDist(wrist, landmarks[tip]) > getDist(wrist, landmarks[pips[i]]) * 1.15) count += 1; });
    if (getDist(landmarks[4], landmarks[5]) > getDist(wrist, middleMcp) * 0.48) count += 1;
    return count;
  };

  useEffect(() => {
    if (!streamActive || phase === 'WELCOME') return;
    let hands: any = null;
    let localStream: MediaStream | null = null;
    let active = true;
    const setup = async () => {
      try {
        const HandsClass = (window as any).Hands;
        if (!HandsClass) throw new Error("Aguardando motor IA...");
        hands = new HandsClass({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.65, minTrackingConfidence: 0.75 });
        hands.onResults((res: any) => {
          if (!active || !canvasRef.current || !videoRef.current) return;
          const cvs = canvasRef.current, ctx = cvs.getContext('2d')!;
          if (cvs.width !== videoRef.current.clientWidth || cvs.height !== videoRef.current.clientHeight) {
            cvs.width = videoRef.current.clientWidth; cvs.height = videoRef.current.clientHeight;
          }
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          let total = 0;
          if (res.multiHandLandmarks) {
            const drawingUtils = (window as any);
            res.multiHandLandmarks.forEach((lms: any) => {
              total += processFingers(lms);
              if (drawingUtils.drawConnectors) {
                drawingUtils.drawConnectors(ctx, lms, drawingUtils.HAND_CONNECTIONS, {color: '#00ff7f', lineWidth: 2});
                drawingUtils.drawLandmarks(ctx, lms, {color: '#ffffff', lineWidth: 1, radius: 2});
              }
            });
          }
          setCurrentFingers(total);
        });
        localStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
          await videoRef.current.play();
          const loop = async () => { if (active && videoRef.current && hands) { await hands.send({ image: videoRef.current }); requestAnimationFrame(loop); } };
          loop();
        }
      } catch (err: any) { setErrorPrompt(err.message); }
    };
    setup();
    return () => { active = false; localStream?.getTracks().forEach(t => t.stop()); hands?.close(); };
  }, [streamActive, phase]);

  useEffect(() => {
    if (phase !== 'PHASE_1' && phase !== 'PHASE_2') return;
    const itv = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          if (phase === 'PHASE_1') { setNum1(fingersRef.current); setPhase('PHASE_2'); return PHASE_TIME; }
          setNum2(fingersRef.current); setPhase('RESULT'); return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(itv);
  }, [phase]);

  const handleRestart = () => { setNum1(0); setNum2(0); setTimer(PHASE_TIME); setPhase('PHASE_1'); };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 relative font-sans overflow-hidden">
      <BackgroundMesh />

      {/* Social Navbar */}
      <nav className="fixed top-0 inset-x-0 h-24 flex items-center justify-between px-8 md:px-16 z-50">
        <div className="flex items-center gap-3">
          <Activity className="text-[#00ff7f] w-6 h-6 animate-pulse" />
          <p className="font-black tracking-[0.3em] text-xs uppercase italic drop-shadow-[0_0_10px_#00ff7f44]">Assad-Lz <span className="text-[#00ff7f]">Compute</span></p>
        </div>
        <div className="flex gap-8 items-center">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-500 hover:text-white transition-all text-[10px] font-black tracking-widest uppercase hover:scale-105 active:scale-95"><Code className="w-3 h-3"/> Project Repo</a>
            <a href="https://www.linkedin.com/in/yssaky-assad-luz-4562b6236/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-[10px] font-black tracking-widest uppercase hover:scale-105 active:scale-95"><Globe className="w-3 h-3"/> Professional</a>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {phase === 'WELCOME' ? (
          <motion.div 
            key="w" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            className="z-10 bg-[#080808]/60 backdrop-blur-3xl p-12 md:p-24 rounded-[70px] border border-white/5 text-center max-w-4xl w-full border-b-[#00ff7f22] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)]"
          >
            <div className="w-24 h-24 bg-[#00ff7f]/10 rounded-full border border-[#00ff7f]/20 flex items-center justify-center mx-auto mb-10">
              <Plus className="w-12 h-12 text-[#00ff7f]" />
            </div>
            <h1 className="text-7xl md:text-[9rem] font-black mb-8 tracking-tighter leading-none">NEURAL<br/><span className="text-[#00ff7f]">MATH.</span></h1>
            <p className="text-gray-400 text-lg md:text-2xl mb-14 max-w-2xl mx-auto font-medium leading-relaxed opacity-60">
                Processamento matemático por visão computacional sênior. 
                Tecnologia espacial aplicada à precisão gestual.
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <button 
                onClick={() => { setStreamActive(true); setPhase('PHASE_1'); }}
                className="px-20 py-8 bg-[#00ff7f] text-black font-black text-2xl rounded-3xl hover:brightness-110 active:scale-95 transition-all shadow-[0_20px_50px_-5px_#00ff7f33] hover:-translate-y-1"
              >
                ATIVAR ENGINE 
              </button>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="px-14 py-8 bg-white/5 border border-white/5 font-bold rounded-3xl hover:bg-white/10 transition-all uppercase text-sm flex items-center justify-center gap-3 tracking-widest active:scale-95">REPOSITÓRIO <ExternalLink className="w-4 h-4 opacity-30"/></a>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            className="z-10 w-full max-w-[1550px] h-full lg:h-[800px] grid grid-cols-12 gap-8"
          >
            {/* Monitor Principal */}
            <div className="col-span-12 lg:col-span-9 bg-black rounded-[70px] border border-white/5 relative overflow-hidden shadow-2xl flex flex-col h-[600px] lg:h-full">
              {errorPrompt && <div className="absolute inset-0 z-50 bg-black flex items-center justify-center text-red-500 font-bold p-12 text-center">{errorPrompt}</div>}
              <div className="flex-1 relative bg-[#010101]">
                <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} autoPlay playsInline muted />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'scaleX(-1)' }} />
                
                <div className="absolute top-10 inset-x-10 flex justify-between">
                  <div className="bg-black/70 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-3xl flex items-center gap-4">
                    <div className="w-3 h-3 bg-[#00ff7f] rounded-full animate-pulse shadow-[0_0_15px_#00ff7f]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Precision Pipeline v2.6</span>
                  </div>
                  {phase !== 'RESULT' && <div className="bg-[#00ff7f] text-black px-14 py-6 rounded-[30px] font-black text-6xl shadow-2xl shadow-[#00ff7f]/40 transition-transform active:scale-95 cursor-default">{timer}s</div>}
                </div>

                <div className="absolute bottom-10 inset-x-10">
                  <div className="bg-black/60 backdrop-blur-3xl border border-white/10 p-12 rounded-[55px] flex items-center justify-between shadow-2xl border-b-[#00ff7f33]">
                    <div className="space-y-2">
                       <p className="text-[10px] uppercase font-black text-[#00ff7f] tracking-[0.7em] mb-2 drop-shadow-sm">{phase === 'PHASE_1' ? 'Coleta Primária' : phase === 'PHASE_2' ? 'Coleta Secundária' : 'Resumo de Dados'}</p>
                       <p className="text-4xl font-black italic tracking-tighter opacity-90">{phase === 'RESULT' ? 'Sincronização Finalizada' : 'Sincronizando com Gesto Ativo'}</p>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="text-[10px] uppercase font-black tracking-widest text-gray-600 mb-2">Dedos</span>
                       <div className="text-9xl font-mono font-black text-[#00ff7f] drop-shadow-[0_0_40px_#00ff7f33] leading-none">{currentFingers}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAIXA DE TECNOLOGIAS COM ÍCONES OFICIAIS */}
              <div className="bg-black/90 backdrop-blur-3xl border-t border-white/5 py-6 px-12 flex justify-between items-center bg-[linear-gradient(90deg,_transparent_0%,_rgba(0,255,127,0.02)_50%,_transparent_100%)]">
                 <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all group">
                       <TechIcons.OpenCV />
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white">OpenCV</span>
                    </div>
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all group">
                       <TechIcons.HuggingFace />
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white">HuggingFace</span>
                    </div>
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all group">
                       <TechIcons.Python />
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white">Python 3</span>
                    </div>
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all group">
                       <TechIcons.PyTorch />
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white">PyTorch</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-10 text-right">
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all group">
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white">React Suite</span>
                       <TechIcons.React />
                    </div>
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all group">
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white">Vite Next</span>
                       <TechIcons.Vite />
                    </div>
                 </div>
              </div>
            </div>

            {/* Sidebar Dash */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
              <div className="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-[70px] p-12 flex-1 flex flex-col items-center justify-center relative shadow-2xl group overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-[#00ff7f05] to-transparent pointer-events-none" />
                 <div className="w-full space-y-20 relative z-10">
                   <div className="text-center group transition-transform hover:scale-110 duration-500">
                      <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-600 mb-6 block group-hover:text-[#00ff7f]">Operando A</p>
                      <div className={`text-9xl font-mono font-black ${num1 ? 'text-[#00ff7f]' : 'text-white/5'} transition-all duration-700`}>{num1 || '-'}</div>
                   </div>
                   <div className="text-center group transition-transform hover:scale-110 duration-500">
                      <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-600 mb-6 block group-hover:text-[#00ff7f]">Operando B</p>
                      <div className={`text-9xl font-mono font-black ${num2 ? 'text-[#00ff7f]' : 'text-white/5'} transition-all duration-700`}>{num2 || '-'}</div>
                   </div>
                 </div>
                 <AnimatePresence>
                    {phase === 'RESULT' && (
                      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-[#060606]/98 backdrop-blur-[50px] rounded-[70px] border border-[#00ff7f]/20 p-12 flex flex-col items-center justify-center z-20 shadow-[0_0_100px_rgba(0,255,127,0.1)]">
                         <span className="text-xs font-black text-[#00ff7f] tracking-[0.7em] mb-12 uppercase drop-shadow-[0_0_10px_#00ff7f33]">Log de Resultado</span>
                         <div className="text-[12rem] font-mono font-black leading-none mb-16 drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]">{num1 + num2}</div>
                         <button onClick={handleRestart} className="w-full py-8 bg-[#00ff7f] text-black rounded-[35px] font-black text-2xl hover:brightness-110 active:scale-95 transition-all shadow-[0_20px_40px_-10px_#00ff7f44] flex items-center justify-center gap-4 group">
                            <RotateCcw className="w-7 h-7 group-hover:rotate-180 transition-transform duration-700" /> REINICIAR
                         </button>
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>
              <div className="bg-[#00ff7f]/5 rounded-[45px] border border-[#00ff7f]/10 p-10 flex items-center justify-center gap-5 hover:bg-[#00ff7f]/10 transition-colors cursor-pointer group active:scale-95">
                 <User className="w-6 h-6 text-[#00ff7f] opacity-40 group-hover:opacity-100 transition-opacity" />
                 <div className="flex flex-col">
                   <p className="text-[11px] text-gray-500 uppercase tracking-widest font-black italic transition-colors group-hover:text-[#00ff7f]">Assad-Lz Design</p>
                   <p className="text-[8px] text-[#00ff7f] font-black uppercase tracking-tighter opacity-40">System Architect</p>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
