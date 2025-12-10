import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MarketDataSocketGateway } from './market-data-socket.gateway';

@Injectable()
export class MarketDataSocketService {
    constructor(
        @Inject(forwardRef(() => MarketDataSocketGateway))
        private readonly marketDataSocketGateway: MarketDataSocketGateway,
    ) {}

    async sendMarketUpdates(updates: any[]) {
        this.marketDataSocketGateway.sendMarketUpdates(updates);
    }
}
