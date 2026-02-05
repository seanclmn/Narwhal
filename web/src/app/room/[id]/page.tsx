'use client';

import { useEffect, useRef, useState, use } from 'react';
import { SettingsModal } from '@/components/SettingsModal';
import { VideoStream } from '@/components/VideoStream';

interface SignalingMessage {
  type: 'identify' | 'offer' | 'answer' | 'candidate' | 'join' | 'peer-joined' | 'peer-left' | 'fx-change' | 'ping';
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
    if (!clientId) {
      const id = Math.random().toString(36).substring(7);
      setClientId(id);
      return;
    }

    const initWebRTC = async () => {
      // ... (media capture logic)

      const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'ws://localhost:8080';
      const socket = new WebSocket(signalingUrl);
      socketRef.current = socket;


      socket.onopen = () => {
        setStatus('connected');
        socket.send(JSON.stringify({ type: 'identify', sender: clientId }));
        socket.send(JSON.stringify({ type: 'join', sender: clientId, roomId }));
      };

      socket.onmessage = async (event) => {
        const message: SignalingMessage = JSON.parse(event.data);
        const { type, sender, payload } = message;

        switch (type) {
          case 'peer-joined':
            await startCall(sender);
            break;
          case 'offer':
            await handleOffer(sender, payload);
            break;
          case 'answer':
            await handleAnswer(payload);
            break;
          case 'candidate':
            await handleCandidate(payload);
            break;
          case 'peer-left':
            handlePeerLeft();
            break;
          case 'fx-change':
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
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(configuration);

    const localStream = localVideoRef.current?.srcObject as MediaStream;
    localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        socketRef.current?.send(JSON.stringify({
          type: 'fx-change',
          target: targetId,
          sender: clientId!,
          payload: filter
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        handlePeerLeft();
      }
    };

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

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'fx-change',
        roomId: roomId,
        sender: clientId!,
        payload: newFilter
      }));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-black text-white">
      <h1 className="text-4xl font-bold mb-4">Chat Room: {roomId}</h1>
      <div className="flex items-center gap-2 mb-8">
        <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
        <span className="capitalize">{status}</span>
        {clientId && <span className="text-zinc-500 text-sm ml-4">ID: {clientId}</span>}
      </div>

      <div className="w-full max-w-5xl p-6 border border-zinc-800 rounded-xl bg-zinc-900/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VideoStream
            videoRef={localVideoRef}
            label="Local Stream"
            filter={filter}
            isCameraOff={isCameraOff}
            isMuted={isMuted}
            showControls={true}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          <VideoStream
            videoRef={remoteVideoRef}
            label="Remote Stream"
            filter={remoteFilter}
          />
        </div>

        <div className="mt-8 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg text-center">
          <p className="text-zinc-400 text-sm">
            Waiting for someone to join... <br />
            When a second person joins this URL, the call will start <span className="text-blue-400 font-semibold">automatically</span>.
          </p>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        filter={filter}
        setFilter={handleFilterChange}
        clientId={clientId}
      />
    </div>
  );
}
