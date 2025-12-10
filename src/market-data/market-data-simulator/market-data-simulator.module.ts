import { Module } from '@nestjs/common';
import { MarketDataSimulatorService } from './market-data-simulator.service';
import { MarketDataSimulatorController } from './market-data-simulator.controller';
import { PrismaService } from 'src/prisma.service';
import { MarketDataSocketModule } from '../market-data-socket/market-data-socket.module';

@Module({
    imports: [MarketDataSocketModule], // Import the module instead of providing service directly
    exports: [],
    controllers: [MarketDataSimulatorController],
    providers: [MarketDataSimulatorService, PrismaService],
})
export class MarketDataSimulatorModule {}