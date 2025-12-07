import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientsService } from 'src/clients/clients.service';
import { PrismaService } from 'src/prisma.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not set');
        }
        return {
          secret,
          signOptions: { expiresIn: '1h' }, // Match cookie expiration
        };
      },
    }),
  ],
  providers: [AuthService, ClientsService, PrismaService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule], // Export for use in other modules
})
export class AuthModule {}
