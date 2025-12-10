import { Module } from '@nestjs/common';
import { MarketDataSocketService } from './market-data-socket.service';
import { MarketDataSocketGateway } from './market-data-socket.gateway';

@Module({
  providers: [MarketDataSocketGateway, MarketDataSocketService],
  exports: [MarketDataSocketGateway, MarketDataSocketService], // Export so other modules can use them
})
export class MarketDataSocketModule {}
