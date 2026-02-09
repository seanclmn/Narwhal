import RoomClient from '@/components/RoomClient';

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // This runs on the server, so it can access runtime environment variables in GCP
  const signalingServerUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'ws://localhost:8080';

  return (
    <RoomClient 
      roomId={id} 
      signalingServerUrl={signalingServerUrl} 
    />
  );
}
