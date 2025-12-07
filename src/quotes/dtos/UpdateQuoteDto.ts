import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateQuoteDto {
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
