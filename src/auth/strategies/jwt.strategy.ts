import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ClientsService } from 'src/clients/clients.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private clientsService: ClientsService) {
    super({
      // Extract JWT from cookie first, fallback to Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from cookie
        (request: Request) => {
          return request?.cookies?.['access_token'] || null;
        },
        // Fallback to Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    // Payload contains the data we signed in the token (email, id)
    const user = await this.clientsService.getClientByEmail(payload.email);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user object - this will be available in @Request() as req.user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
