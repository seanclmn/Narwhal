import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

interface SignalingMessage {
  type: 'identify' | 'offer' | 'answer' | 'candidate' | 'join' | 'peer-joined' | 'peer-left' | 'fx-change' | 'ping';
  target?: string;
  sender: string;
  roomId?: string;
  payload?: any;
}

interface ExtendedWebSocket extends WebSocket {
  id?: string;
  roomId?: string;
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

console.log(`WebRTC Signaling Server starting on port ${port}...`);

const clients = new Map<string, ExtendedWebSocket>();
const rooms = new Map<string, Set<string>>(); // roomId -> Set of clientIds

wss.on('connection', (ws: ExtendedWebSocket) => {
  console.log('New client connected');

  ws.on('message', (data: string) => {
    let message: SignalingMessage;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.error('Invalid JSON received:', data);
      return;
    }

    const { type, target, payload, sender, roomId } = message;

    switch (type) {
      case 'identify':
        clients.set(sender, ws);
        ws.id = sender;
        console.log(`Client identified as: ${sender}`);
        break;

      case 'join':
        if (!ws.id) {
          console.error('Client must identify before joining a room');
          return;
        }
        if (roomId) {
          ws.roomId = roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          const room = rooms.get(roomId)!;

          // Notify others in the room that a new peer has joined
          room.forEach(peerId => {
            const peerWs = clients.get(peerId);
            if (peerWs && peerWs.readyState === WebSocket.OPEN) {
              console.log(`Notifying existing peer ${peerId} that ${ws.id} joined`);
              peerWs.send(JSON.stringify({
                type: 'peer-joined',
                sender: ws.id,
                roomId: roomId // Include roomId
              }));
            }
          });

          room.add(ws.id);
          console.log(`Client ${ws.id} joined room: ${roomId}. Room size: ${room.size}`);
        }
        break;

      case 'offer':
      case 'answer':
      case 'candidate':
        if (roomId && rooms.has(roomId)) {
          console.log(`Broadcasting ${type} from ${sender} to room ${roomId}`);
          const room = rooms.get(roomId)!;
          room.forEach(peerId => {
            if (peerId !== sender) {
              const peerWs = clients.get(peerId);
              if (peerWs && peerWs.readyState === WebSocket.OPEN) {
                peerWs.send(JSON.stringify({
                  type,
                  sender,
                  payload
                }));
              }
            }
          });
        }
        break;

      case 'fx-change':
        // If roomId is provided, broadcast to everyone else in the room
        if (roomId && rooms.has(roomId)) {
          const room = rooms.get(roomId)!;
          room.forEach(peerId => {
            if (peerId !== sender) {
              const peerWs = clients.get(peerId);
              if (peerWs && peerWs.readyState === WebSocket.OPEN) {
                peerWs.send(JSON.stringify({
                  type: 'fx-change',
                  sender: sender,
                  payload: payload
                }));
              }
            }
          });
        }
        // Otherwise, if target is provided, forward to specific target
        else if (target && clients.has(target)) {
          console.log(`Forwarding fx-change from ${sender} to ${target}`);
          clients.get(target)?.send(JSON.stringify({
            type: 'fx-change',
            sender,
            payload
          }));
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        console.log('Unknown message type:', type);
    }
  });

  const handleLeave = () => {
    if (ws.id) {
      clients.delete(ws.id);
      if (ws.roomId && rooms.has(ws.roomId)) {
        const room = rooms.get(ws.roomId)!;
        room.delete(ws.id);

        // Notify others in the room that the peer has left
        room.forEach(peerId => {
          const peerWs = clients.get(peerId);
          if (peerWs && peerWs.readyState === WebSocket.OPEN) {
            peerWs.send(JSON.stringify({
              type: 'peer-left',
              sender: ws.id,
            }));
          }
        });

        if (room.size === 0) {
          rooms.delete(ws.roomId);
        }
        console.log(`Client ${ws.id} left room ${ws.roomId}`);
      }
      console.log(`Client ${ws.id} disconnected`);
    } else {
      console.log('Unidentified client disconnected');
    }
  };

  ws.on('close', handleLeave);

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
