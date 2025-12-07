import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from './clients/clients.module';
import { AuthModule } from './auth/auth.module';
import { MarketDataModule } from './market-data/market-data.module';
import { MarketDataIntrumentModule } from './market-data/market-data-intrument/market-data-intrument.module';
import { QuotesModule } from './quotes/quotes.module';

@Module({
  imports: [ClientsModule, AuthModule, MarketDataModule, MarketDataIntrumentModule, QuotesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
