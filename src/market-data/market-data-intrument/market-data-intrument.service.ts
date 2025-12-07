import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { CreateMarketDataInstrumentDto } from "./dtos/CreateMarketDataInstrumentDto";

@Injectable()
export class MarketDataIntrumentService {
    constructor(private readonly prismaService: PrismaService) {}

    async createMarketDataInstrument(createMarketDataInstrumentDto: CreateMarketDataInstrumentDto) {
        const existingInstrument = await this.prismaService.marketInstrument.findUnique({
            where: {
                symbol: createMarketDataInstrumentDto.symbol,
            },
        });
        
        if (existingInstrument) {
            throw new BadRequestException('Instrument already exists');
        }

        const marketDataInstrument = await this.prismaService.marketInstrument.create({
            data: {
                symbol: createMarketDataInstrumentDto.symbol,
                name: createMarketDataInstrumentDto.name,
                spotPrice: createMarketDataInstrumentDto.spotPrice,
                mktBid: createMarketDataInstrumentDto.mktBid,
                mktAsk: createMarketDataInstrumentDto.mktAsk,
                delta: createMarketDataInstrumentDto.delta,
                premium: createMarketDataInstrumentDto.premium,
                lastUpdate: createMarketDataInstrumentDto.lastUpdate,
            },
        });
        return marketDataInstrument;
    }

    async findMarketDataInstrumentBySymbol(symbol: string) {
        const formattedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9.]/g, '');
        const marketDataInstrument = await this.prismaService.marketInstrument.findUnique({
            where: {
                symbol: formattedSymbol,
            },
        });
        return marketDataInstrument;
    }
}