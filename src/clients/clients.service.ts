import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { User } from 'src/generated/prisma/client';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  getAllClients(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  getClientByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  }

  async validateClient(email: string, password: string): Promise<boolean> {
    const client = await this.getClientByEmail(email);
    if (!client) {
      return false;
    }
    return client.password === password;
  }

  async getValidatedClient(email: string, password: string) {
    const client = await this.getClientByEmail(email);
    if (!client || client.password !== password) {
      return null;
    }
    return client;
  }
}
