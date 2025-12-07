import { IsString, IsOptional, IsNumber, IsUUID, IsEnum } from 'class-validator';
import { QuoteOptionType } from 'src/generated/prisma/enums';

export class CreateQuoteDto {
  @IsUUID()
  instrumentId: string;

  @IsEnum(QuoteOptionType)
  optionType: QuoteOptionType;

  @IsNumber()
  @IsOptional()
  userBid?: number;

  @IsNumber()
  @IsOptional()
  userAsk?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
