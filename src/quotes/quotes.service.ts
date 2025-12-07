import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateQuoteDto } from './dtos/CreateQuoteDto';
import { UpdateQuoteDto } from './dtos/UpdateQuoteDto';
import { UpdateOverrideQuoteDto } from './dtos/UpdateOverrideQuoteDto';

@Injectable()
export class QuotesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getQuotes(userId: string) {
    const quotes = await this.prismaService.quote.findMany({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return quotes;
  }

  async createQuote(userId: string, createQuoteDto: CreateQuoteDto) {
    // Check if instrument exists
    const instrument = await this.prismaService.marketInstrument.findUnique({
      where: {
        id: createQuoteDto.instrumentId,
      },
    });

    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }

    // Check for duplicate quote (same user + instrument)
    const existingQuote = await this.prismaService.quote.findUnique({
      where: {
        userId_instrumentId: {
          userId,
          instrumentId: createQuoteDto.instrumentId,
        },
      },
    });

    if (existingQuote) {
      throw new BadRequestException('Quote already exists for this instrument');
    }

    const quote = await this.prismaService.quote.create({
      data: {
        userId,
        instrumentId: createQuoteDto.instrumentId,
        optionType: createQuoteDto.optionType,
        userBid: createQuoteDto.userBid,
        userAsk: createQuoteDto.userAsk,
        notes: createQuoteDto.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return quote;
  }

  async updateQuote(userId: string, quoteId: string, updateQuoteDto: UpdateQuoteDto) {
    // Verify quote exists and belongs to user
    const quote = await this.prismaService.quote.findUnique({
      where: {
        id: quoteId,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.userId !== userId) {
      throw new BadRequestException('Quote does not belong to this user');
    }

    const updatedQuote = await this.prismaService.quote.update({
      where: {
        id: quoteId,
      },
      data: {
        userBid: updateQuoteDto.userBid,
        userAsk: updateQuoteDto.userAsk,
        notes: updateQuoteDto.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return updatedQuote;
  }

  async updateOverrideQuote(userId: string, quoteId: string, updateOverrideQuoteDto: UpdateOverrideQuoteDto) {
    // Verify quote exists and belongs to user
    const quote = await this.prismaService.quote.findUnique({
      where: {
        id: quoteId,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.userId !== userId) {
      throw new BadRequestException('Quote does not belong to this user');
    }

    const updatedQuote = await this.prismaService.quote.update({
      where: {
        id: quoteId,
      },
      data: {
        overrides: updateOverrideQuoteDto.overrides || undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return updatedQuote;
  }

  async deleteQuote(userId: string, quoteId: string) {
    // Verify quote exists and belongs to user
    const quote = await this.prismaService.quote.findUnique({
      where: {
        id: quoteId,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.userId !== userId) {
      throw new BadRequestException('Quote does not belong to this user');
    }

    await this.prismaService.quote.delete({
      where: {
        id: quoteId,
      },
    });

    return { message: 'Quote deleted successfully' };
  }
}
