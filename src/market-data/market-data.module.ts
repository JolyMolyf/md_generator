import { Module } from '@nestjs/common';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { MarketDataSimulatorModule } from './market-data-simulator/market-data-simulator.module';

@Module({
    imports: [MarketDataSimulatorModule],
    exports: [],
    controllers: [MarketDataController],
    providers: [MarketDataService],
})
export class MarketDataModule {
    
}
