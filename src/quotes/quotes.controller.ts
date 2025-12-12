import { Controller, Get, Post, UseGuards, Body, Param, Put, Delete, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dtos/CreateQuoteDto';
import { UpdateQuoteDto } from './dtos/UpdateQuoteDto';
import { UpdateOverrideQuoteDto } from './dtos/UpdateOverrideQuoteDto';

@Controller('quotes')
// @UseGuards(JwtAuthGuard)
export class QuotesController {
    constructor(private readonly quotesService: QuotesService) {}

    @Get()
    async getQuotes(@Request() req) {
        const userId = req.user?.id ?? '088d5851-0d62-461c-83fc-25f38b22d332';
        return await this.quotesService.getQuotes(userId);
    }

    @Post()
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }))
    async createQuote(@Request() req, @Body() createQuoteDto: CreateQuoteDto) {
        const userId = req?.user?.id ?? '088d5851-0d62-461c-83fc-25f38b22d332';
        console.log('userId', userId);
        return await this.quotesService.createQuote(userId, createQuoteDto);
    }

    @Put('/override/:id')
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }))
    async updateOverrideQuote(@Request() req, @Param('id') id: string, @Body() updateOverrideQuoteDto: UpdateOverrideQuoteDto) {
        const userId = req.user.id;
        return await this.quotesService.updateOverrideQuote(userId, id, updateOverrideQuoteDto);
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }))
    async updateQuote(@Request() req, @Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto) {
        const userId = req.user.id;
        return await this.quotesService.updateQuote(userId, id, updateQuoteDto);
    }

    @Delete(':id')
    async deleteQuote(@Request() req, @Param('id') id: string) {
        const userId = req.user.id;
        return await this.quotesService.deleteQuote(userId, id);
    }
}
