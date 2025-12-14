import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dtos/LoginDto';
import { ClientsService } from 'src/clients/clients.service';
import { JwtService } from '@nestjs/jwt';

export interface LoginResponse {
    message: string;
    id: string;
    email: string;
    username: string | null;
    token: string;
}

@Injectable()
export class AuthService {
    constructor(private clientsService: ClientsService, private jwtService: JwtService) { }

    async login(loginDto: LoginDto): Promise<LoginResponse> {
        const client = await this.clientsService.getValidatedClient(loginDto.email, loginDto.password);

        if (!client) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.jwtService.sign({ email: client.email, id: client.id });

        return {
            message: 'Login successful',
            id: client.id,
            email: client.email,
            username: client.name || null,
            token,
        };
    }
}
