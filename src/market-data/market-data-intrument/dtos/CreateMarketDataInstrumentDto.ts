import { IsString, IsNotEmpty, IsDate, IsNumber } from 'class-validator';
export class CreateMarketDataInstrumentDto {
    @IsString()
    @IsNotEmpty()
    symbol: string;
    @IsString()
    @IsNotEmpty()
    name: string;
    @IsNumber()
    @IsNotEmpty()
    spotPrice: number;
    @IsNumber()
    @IsNotEmpty()
    mktBid: number;
    @IsNumber()
    @IsNotEmpty()
    mktAsk: number;
    @IsNumber()
    @IsNotEmpty()
    delta: number;
    @IsNumber()
    @IsNotEmpty()
    premium: number;
    @IsDate()
    @IsNotEmpty()
    lastUpdate: Date;
}