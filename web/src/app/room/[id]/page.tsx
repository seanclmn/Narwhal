import RoomClient from '@/components/RoomClient';

export const dynamic = 'force-dynamic';

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // No fallback to localhost.
  const signalingServerUrl = process.env.SIGNALING_SERVER_URL ||
    process.env.NEXT_PUBLIC_SIGNALING_SERVER;

  console.log('DEBUG - SIGNALING_SERVER_URL:', process.env.SIGNALING_SERVER_URL);
  console.log('DEBUG - NEXT_PUBLIC_SIGNALING_SERVER:', process.env.NEXT_PUBLIC_SIGNALING_SERVER);

  if (!signalingServerUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-8 text-center">
        <div className="max-w-md p-6 border border-red-900/50 bg-red-950/20 rounded-xl">
          <h1 className="text-xl font-bold text-red-500 mb-2">Configuration Error</h1>
          <p className="text-zinc-400 text-sm">
            Signaling server URL is not configured. Please set <code className="bg-zinc-800 px-1 rounded text-zinc-200">SIGNALING_SERVER_URL</code> in your environment.
          </p>
          <div className="mt-4 text-xs text-zinc-600 text-left bg-black p-2 rounded">
            <p>Debug Info:</p>
            <p>SIGNALING_SERVER_URL: {process.env.SIGNALING_SERVER_URL || 'undefined'}</p>
            <p>NEXT_PUBLIC_SIGNALING_SERVER: {process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'undefined'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoomClient
      roomId={id}
      signalingServerUrl={signalingServerUrl}
    />
  );
}
