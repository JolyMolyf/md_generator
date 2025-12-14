import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MarketDataSocketService } from './market-data-socket.service';
import { MarketDataSocketGateway } from './market-data-socket.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    }),
  ],
  providers: [MarketDataSocketGateway, MarketDataSocketService],
  exports: [MarketDataSocketGateway, MarketDataSocketService]
})
export class MarketDataSocketModule { }
