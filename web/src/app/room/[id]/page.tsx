'use client';

import { useEffect, useRef, useState, use } from 'react';

interface SignalingMessage {
  type: 'identify' | 'offer' | 'answer' | 'candidate' | 'join' | 'peer-joined' | 'peer-left' | 'fx-change';
  target?: string;
  sender: string;
  roomId?: string;
  payload?: any;
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [clientId, setClientId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('none');
  const [remoteFilter, setRemoteFilter] = useState<string>('none');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    // Generate clientId only on the client once
    if (!clientId) {
      const id = Math.random().toString(36).substring(7);
      setClientId(id);
      return;
    }

    const initWebRTC = async () => {
      // 1. Get Local Stream with high quality audio constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          }
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }

      // 2. Setup Signaling
      const socket = new WebSocket('ws://localhost:8080');
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        // Identify and Join Room
        socket.send(JSON.stringify({ type: 'identify', sender: clientId }));
        socket.send(JSON.stringify({ type: 'join', sender: clientId, roomId }));
        console.log(`Joined room ${roomId} as ${clientId}`);
      };

      socket.onmessage = async (event) => {
        const message: SignalingMessage = JSON.parse(event.data);
        const { type, sender, payload } = message;

        switch (type) {
          case 'peer-joined':
            console.log(`Peer joined: ${sender}. Initiating call...`);
            await startCall(sender);
            break;
          case 'offer':
            console.log(`Received offer from ${sender}`);
            await handleOffer(sender, payload);
            break;
          case 'answer':
            console.log(`Received answer from ${sender}`);
            await handleAnswer(payload);
            break;
          case 'candidate':
            console.log(`Received candidate from ${sender}`);
            await handleCandidate(payload);
            break;
          case 'peer-left':
            console.log(`Peer left: ${sender}`);
            handlePeerLeft();
            break;
          case 'fx-change':
            console.log(`Remote FX change: ${payload}`);
            setRemoteFilter(payload);
            break;
        }
      };

      socket.onclose = () => setStatus('disconnected');
    };

    initWebRTC().catch(console.error);

    return () => {
      socketRef.current?.close();
      peerConnectionRef.current?.close();
    };
  }, [roomId, clientId]);

  const handlePeerLeft = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemoteFilter('none');
  };

  const createPeerConnection = (targetId: string) => {
    // Close existing connection if any
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(configuration);

    // Add local tracks to the connection
    const localStream = localVideoRef.current?.srcObject as MediaStream;
    localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        // Send our current FX to the new peer
        socketRef.current?.send(JSON.stringify({
          type: 'fx-change',
          target: targetId,
          sender: clientId!,
          payload: filter
        }));
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        handlePeerLeft();
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'candidate',
          target: targetId,
          sender: clientId!,
          payload: event.candidate,
        }));
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const handleOffer = async (senderId: string, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();

    // Improve audio quality in SDP
    if (answer.sdp) {
      answer.sdp = answer.sdp.replace('useinbandfec=1', 'useinbandfec=1;stereo=1;maxaveragebitrate=128000');
    }

    await pc.setLocalDescription(answer);

    socketRef.current?.send(JSON.stringify({
      type: 'answer',
      target: senderId,
      sender: clientId!,
      payload: answer,
    }));
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) {
      console.error('Error adding received ice candidate', e);
    }
  };

  const toggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const startCall = async (targetId: string) => {
    const pc = createPeerConnection(targetId);
    const offer = await pc.createOffer();

    // Improve audio quality in SDP
    if (offer.sdp) {
      offer.sdp = offer.sdp.replace('useinbandfec=1', 'useinbandfec=1;stereo=1;maxaveragebitrate=128000');
    }

    await pc.setLocalDescription(offer);

    socketRef.current?.send(JSON.stringify({
      type: 'offer',
      target: targetId,
      sender: clientId!,
      payload: offer,
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-black text-white">
      <h1 className="text-4xl font-bold mb-4">Chat Room: {roomId}</h1>
      <div className="flex items-center gap-2 mb-8">
        <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
        <span className="capitalize">{status}</span>
        <span className="text-zinc-500 text-sm ml-4">ID: {clientId}</span>
      </div>

      <div className="w-full max-w-5xl p-6 border border-zinc-800 rounded-xl bg-zinc-900/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <span className="text-sm text-zinc-400 font-medium">Local Stream</span>
            <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 shadow-2xl relative group">
              {isCameraOff ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
                  <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>
              ) : null}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: filter }}
                className="w-full h-full object-cover -scale-x-100 transition-all duration-300"
              />
              <div className="absolute inset-0 z-20 pointer-events-none">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 border border-zinc-700 pointer-events-auto"
                  title="Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button 
                  onClick={toggleMute}
                  className={`absolute bottom-2 right-2 p-2 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity border pointer-events-auto ${isMuted ? 'bg-red-500/80 border-red-400' : 'bg-black/60 border-zinc-700 hover:bg-black/80'}`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  )}
                </button>
                <button 
                  onClick={toggleCamera}
                  className={`absolute bottom-2 right-12 p-2 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity border pointer-events-auto ${isCameraOff ? 'bg-red-500/80 border-red-400' : 'bg-black/60 border-zinc-700 hover:bg-black/80'}`}
                  title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isCameraOff ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16-3.52-3.52M18.4 18.4l1.45 1.45a2 2 0 0 0 2.82-2.82l-1.45-1.45M2 2l20 20M13.22 8.47l.44.28A2 2 0 0 1 14.66 10c0 .7-.3 1.32-.77 1.76M7 2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-sm text-zinc-400 font-medium">Remote Stream</span>
            <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 shadow-2xl">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ filter: remoteFilter }}
                className="w-full h-full object-cover -scale-x-100 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg text-center">
          <p className="text-zinc-400 text-sm">
            Waiting for someone to join... <br />
            When a second person joins this URL, the call will start <span className="text-blue-400 font-semibold">automatically</span>.
          </p>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white">Room Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-300">Video Filter</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Normal', value: 'none' },
                    { name: 'B&W', value: 'grayscale(100%)' },
                    { name: 'Sepia', value: 'sepia(100%)' },
                    { name: 'Invert', value: 'invert(100%)' },
                    { name: 'Blur', value: 'blur(4px)' },
                    { name: 'Glass', value: 'blur(10px) brightness(1.2) saturate(150%)' },
                    { name: 'Warm', value: 'sepia(30%) saturate(150%) hue-rotate(-30deg)' },
                    { name: 'Cool', value: 'saturate(120%) hue-rotate(180deg) brightness(1.1)' },
                  ].map((fx) => (
                    <button
                      key={fx.name}
                      onClick={() => {
                        setFilter(fx.value);
                        // Broadcast FX change to peer
                        if (peerConnectionRef.current && socketRef.current) {
                          // In this simple 1:1 setup, we can find the target from the connection
                          // For now, we'll just broadcast to the room or use the last known peer
                          // A more robust way would be to track active peers in the room
                          socketRef.current.send(JSON.stringify({
                            type: 'fx-change',
                            roomId: roomId,
                            sender: clientId!,
                            payload: fx.value
                          }));
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-sm transition-all border ${filter === fx.value
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                        }`}
                    >
                      {fx.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Your Peer ID:</span>
                  <span className="font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-300">{clientId}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-950/50 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
