import { Module } from '@nestjs/common';
import { MarketDataInstrumentController } from './market-data-instrument.controller';
import { MarketDataIntrumentService } from './market-data-intrument.service';
import { PrismaService } from 'src/prisma.service';

@Module({
    imports: [],
    exports: [MarketDataIntrumentService],
    controllers: [MarketDataInstrumentController],
    providers: [MarketDataIntrumentService, PrismaService],
})

export class MarketDataIntrumentModule {}