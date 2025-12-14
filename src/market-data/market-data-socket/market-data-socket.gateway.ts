import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite default port
        credentials: true,
    },
})
export class MarketDataSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(private readonly jwtService: JwtService) { }

    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        try {
            const token =
                (client.handshake.query.token as string) ||
                client.handshake.headers.cookie
                    ?.split('; ')
                    .find((c) => c.startsWith('access_token='))
                    ?.split('=')[1];

            if (!token) {
                console.log('Client rejected - no token provided', client.id);
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            });

            client.data.user = payload;
            console.log('Client connected', client.id, payload.email);
        } catch (error) {
            console.log('Client rejected - invalid token', client.id, error.message);
            client.disconnect();
        }
    }

    sendMarketUpdates(updates: any[]) {
        this.server.emit('market-updates', updates);
    }

    handleDisconnect(client: Socket) {
        console.log('Client disconnected', client.id);
    }
}
