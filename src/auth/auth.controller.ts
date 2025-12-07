import { Controller, Post, Body, UsePipes, ValidationPipe, HttpCode, Res, Get, UseGuards, Request } from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/LoginDto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}
    
    @Post('login')
    @HttpCode(200)      // Return 200 OK for successful login
    @UsePipes(new ValidationPipe({
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
        transform: true, // Automatically transform payloads to DTO instances
        transformOptions: {
            enableImplicitConversion: true, // Enable implicit type conversion
        },
    }))
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: false }) res: express.Response) {
        const result = await this.authService.login(loginDto);
        
        // Set HTTP-only cookie with JWT token
        res.cookie('access_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000, // 1 hour (matches JWT expiration)
        });

        // Return response without token (token is in cookie)
        res.json({
            message: result.message,
            email: result.email,
            username: result.username,
        });
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard) // Protect this route with JWT authentication
    getProfile(@Request() req) {
        // req.user is populated by JwtStrategy.validate()
        return req.user;
    }
}
