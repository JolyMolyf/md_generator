import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from 'src/prisma.service';
import { Worker } from 'worker_threads';
import { MarketDataSocketService } from '../market-data-socket/market-data-socket.service';

interface Instrument {
    id: string;
    symbol: string;
    spotPrice: number;
    mktBid: number;
    mktAsk: number;
}

@Injectable()
export class MarketDataSimulatorService implements OnModuleInit, OnModuleDestroy {
    private worker: Worker;
    public isRunning = false;
    private instruments: Instrument[] = [];
    private readonly UPDATE_INTERVAL_MS = 500;
    constructor(private readonly prisma: PrismaService, private readonly marketDataSocketService: MarketDataSocketService) {}
    
    async onModuleInit() {
        const workerPath = join(__dirname, 'market-simulator.worker.js');
        this.worker = new Worker(workerPath);
        this.instruments = await this.loadInstruments();

        this.worker.on('message', (message) => {
            if (message.type === 'market-updates') {
                this.marketDataSocketService.sendMarketUpdates(message.updates);
            }
        });
    }

    async startWorker() {
        this.isRunning = true;
        this.worker.postMessage({
            type: 'start',
            instruments: this.instruments,
            interval: this.UPDATE_INTERVAL_MS,
        });
    }

    async stopWorker() {
        this.isRunning = false;
        this.worker.postMessage({
            type: 'stop',
        });
    }

    async onModuleDestroy() {
        this.isRunning = false;
        this.worker.terminate();
    }

    private async loadInstruments() {
        return this.prisma.marketInstrument.findMany();
    }
}
