# Narwhal Signaling Server

A lightweight WebRTC signaling server built with Node.js, TypeScript, and WebSockets (`ws`).

## Features
- **Room Management**: Clients can join specific rooms via `roomId`.
- **Handshake Forwarding**: Efficiently broadcasts WebRTC offers, answers, and ICE candidates to room participants.
- **Heartbeat/Ping**: Keeps connections alive, especially important for serverless environments like Google Cloud Run.
- **Health Checks**: Includes a `/health` endpoint for deployment health monitoring.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Yarn

### Installation
```bash
yarn install
```

### Development
```bash
yarn dev
```

### Build
```bash
yarn build
```

## Deployment

### Docker
The server includes a `Dockerfile` optimized for Google Cloud Run.

```bash
docker build -t narwhal-server .
```

### Environment Variables
- `PORT`: The port the server listens on (default: `8080`).

## Signaling Protocol

Messages are sent as JSON strings.

### Identify
```json
{ "type": "identify", "sender": "unique-client-id" }
```

### Join Room
```json
{ "type": "join", "sender": "unique-client-id", "roomId": "room-name" }
```

### WebRTC Handshake (Offer/Answer/Candidate)
```json
{ 
  "type": "offer", 
  "sender": "unique-client-id", 
  "roomId": "room-name", 
  "payload": { ...SDP/Candidate... } 
}
```
