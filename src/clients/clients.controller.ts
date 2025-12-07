import { Controller, Get } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private clientService: ClientsService) {}

  @Get('/all')
  async getAllClients() {
    try {
        const clients = await this.clientService.getAllClients();
        return clients;
    }
    catch (error) {
        throw error;
    }
  }
}
