import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class MarketDataSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor() {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected', client.id);
  }

  sendMarketUpdates(updates: any[]) {
    this.server.emit('market-updates', updates);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected', client.id);
  }
}
