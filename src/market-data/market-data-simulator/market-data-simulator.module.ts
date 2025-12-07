import { Module } from '@nestjs/common';
import { MarketDataSimulatorService } from './market-data-simulator.service';
import { MarketDataSimulatorController } from './market-data-simulator.controller';

@Module({
    imports: [],
    exports: [],
    controllers: [MarketDataSimulatorController],
    providers: [MarketDataSimulatorService],
})
export class MarketDataSimulatorModule {}