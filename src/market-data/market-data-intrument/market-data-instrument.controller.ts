import { Controller, Get, Param, Post, Body, UsePipes, ValidationPipe, Query } from "@nestjs/common";
import { CreateMarketDataInstrumentDto } from "./dtos/CreateMarketDataInstrumentDto";
import { MarketDataIntrumentService } from "./market-data-intrument.service";

@Controller('md-instrument')
export class MarketDataInstrumentController {
    constructor(private readonly marketDataIntrumentService: MarketDataIntrumentService) {}   

    @Get('/')
    async findAll() {
        const marketDataInstruments = await this.marketDataIntrumentService.findAllMarketDataInstruments();
        return marketDataInstruments;
    }

    @Get('/find-by-symbol')
    async findBySymbol(@Query() query: { symbol: string }) {
        const marketDataInstrument = await this.marketDataIntrumentService.findMarketDataInstrumentBySymbol(query.symbol);
        return marketDataInstrument;
    }
    
    @Get('/:id')
    async getMarketDataInstrumentById(@Param('id') id: string) {

    }

    @Post()
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        }
    }))
    async createMarketDataInstrument(@Body() createMarketDataInstrumentDto: CreateMarketDataInstrumentDto) {
        const marketDataInstrument = await this.marketDataIntrumentService.createMarketDataInstrument(createMarketDataInstrumentDto);
        return marketDataInstrument;
    }
}