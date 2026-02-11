# Narwhal Web Client

A modern WebRTC video chat frontend built with Next.js, TypeScript, and Tailwind CSS.

## Features
- **Real-time Video/Audio**: Peer-to-peer communication using WebRTC.
- **Dynamic Rooms**: Join any room via the URL path `/room/[id]`.
- **Media Controls**: Toggle camera and microphone.
- **Video Filters**: Apply real-time CSS filters to your video stream.
- **Responsive UI**: Optimized for different screen sizes.
- **Debug Mode**: Toggleable logging for troubleshooting signaling and connection states.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Yarn

### Installation
```bash
yarn install
```

### Configuration
Create a `.env.local` file in the `web/` directory:
```env
NEXT_PUBLIC_SIGNALING_SERVER=wss://your-signaling-server.com
NEXT_PUBLIC_DEBUG_MODE=true
```

### Development
```bash
yarn dev
```

### Build
```bash
yarn build
yarn start
```

## Architecture

- **App Router**: Uses Next.js App Router for routing.
- **Server Components**: The room page is a Server Component to handle runtime environment variable injection.
- **Client Components**: `RoomClient.tsx` manages the WebRTC lifecycle and WebSocket signaling.

## Environment Variables

- `SIGNALING_SERVER_URL`: (Runtime) The WebSocket URL of the signaling server.
- `NEXT_PUBLIC_SIGNALING_SERVER`: (Build-time fallback) The WebSocket URL.
- `DEBUG_MODE`: Set to `true` to enable detailed console logs in production.
