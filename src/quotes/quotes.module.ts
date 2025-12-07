import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, PrismaService],
  exports: [QuotesService],
})
export class QuotesModule {}
