import { IsOptional, IsObject } from 'class-validator';

export class UpdateOverrideQuoteDto {
  @IsObject()
  @IsOptional()
  overrides?: Record<string, any>;
}
