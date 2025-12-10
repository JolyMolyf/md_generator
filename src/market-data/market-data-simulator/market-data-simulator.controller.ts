import { Controller, Get } from '@nestjs/common';
import { MarketDataSimulatorService } from './market-data-simulator.service';

@Controller('md-simulator')
export class MarketDataSimulatorController {
    constructor(private readonly marketDataSimulatorService: MarketDataSimulatorService) {}

    @Get('/start')
    async start() {
        await this.marketDataSimulatorService.startWorker();
    }

    @Get('/stop')
    async stop() {
        await this.marketDataSimulatorService.stopWorker();
    }

    @Get('/status')
    async status() {
        return this.marketDataSimulatorService.isRunning;
    }
}
