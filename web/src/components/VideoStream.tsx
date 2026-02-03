'use client';

import { RefObject } from 'react';

interface VideoStreamProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  label: string;
  filter?: string;
  isMirrored?: boolean;
  isCameraOff?: boolean;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
  onOpenSettings?: () => void;
  isMuted?: boolean;
  showControls?: boolean;
}

export const VideoStream = ({
  videoRef,
  label,
  filter = 'none',
  isMirrored = true,
  isCameraOff = false,
  onToggleMute,
  onToggleCamera,
  onOpenSettings,
  isMuted = false,
  showControls = false,
}: VideoStreamProps) => {
  return (
    <div className="space-y-2">
      <span className="text-sm text-zinc-400 font-medium">{label}</span>
      <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 shadow-2xl relative group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={label.toLowerCase().includes('local')} // Always mute local to prevent feedback
          style={{ filter }}
          className={`w-full h-full object-cover transition-all duration-300 ${isMirrored ? '-scale-x-100' : ''}`}
        />

        {isCameraOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
        )}

        {showControls && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 border border-zinc-700 pointer-events-auto"
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>
            )}

            {onToggleMute && (
              <button
                onClick={onToggleMute}
                className={`absolute bottom-2 right-2 p-2 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity border pointer-events-auto ${isMuted ? 'bg-red-500/80 border-red-400' : 'bg-black/60 border-zinc-700 hover:bg-black/80'}`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                )}
              </button>
            )}

            {onToggleCamera && (
              <button
                onClick={onToggleCamera}
                className={`absolute bottom-2 right-12 p-2 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity border pointer-events-auto ${isCameraOff ? 'bg-red-500/80 border-red-400' : 'bg-black/60 border-zinc-700 hover:bg-black/80'}`}
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isCameraOff ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16-3.52-3.52M18.4 18.4l1.45 1.45a2 2 0 0 0 2.82-2.82l-1.45-1.45M2 2l20 20M13.22 8.47l.44.28A2 2 0 0 1 14.66 10c0 .7-.3 1.32-.77 1.76M7 2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
