import {
  Controller,
  Post,
  Body,
  Res,
  Logger,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Response } from 'express';
import axios from 'axios';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../dto/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../services/users.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(
    @Body() loginDto: { identifier: string; password: string },
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.authService.validateUser(
      loginDto.identifier,
      loginDto.password,
    );
    if (user) {
      const token = this.authService.generateJwtToken(user);
      res.status(200).json({ message: 'Login successful', token, user });
    } else {
      res.status(401).json({ message: 'Login failed' });
    }
  }

  @Post('facebook')
  async facebookLogin(
    @Body() body: { accessToken: string },
    @Res() res: Response,
  ): Promise<void> {
    const appSecret = this.configService.get<string>('FACEBOOK_CLIENT_SECRET');
    if (!appSecret) {
      this.logger.error('FACEBOOK_CLIENT_SECRET is not defined');
      res.status(500).json({ message: 'Internal server error' });
      return;
    }

    const appSecretProof = crypto
      .createHmac('sha256', appSecret)
      .update(body.accessToken)
      .digest('hex');

    try {
      const facebookResponse = await axios.get(
        `https://graph.facebook.com/me?access_token=${body.accessToken}&appsecret_proof=${appSecretProof}&fields=id,name,email`,
      );

      const { id, email, name } = facebookResponse.data;
      const user = await this.authService.findOrCreateFacebookUser(
        id,
        email,
        name,
      );
      const token = this.authService.generateJwtToken(user);
      res
        .status(200)
        .json({ message: 'Facebook login successful', token, user });
    } catch (error) {
      this.logger.error(`Error with Facebook login: ${error.message}`);
      if (axios.isAxiosError(error)) {
        const axiosError = error.response?.data;
        this.logger.error(`Axios error: ${JSON.stringify(axiosError)}`);
      }
      res.status(401).json({ message: 'Facebook login failed' });
    }
  }

  @Post('check-user')
  async checkUser(
    @Body() body: { email?: string; user?: string },
    @Res() res: Response,
  ) {
    try {
      if (body.email) {
        const existingUser = await this.usersService.findByEmail(body.email);
        if (existingUser) {
          return res.status(409).json({ message: 'Email already in use' });
        }
      }

      if (body.user) {
        const existingUsername = await this.usersService.findByUsername(
          body.user,
        );
        if (existingUsername) {
          return res.status(409).json({ message: 'Username already in use' });
        }
      }

      res.status(200).json({ message: 'User is available' });
    } catch (error) {
      this.logger.error(`Error checking user: ${error.message}`);
      res.status(500).json({ message: 'Failed to check user' });
    }
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() body: { email: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.authService.sendForgotPasswordEmail(body.email);
      res
        .status(200)
        .json({ message: 'Password reset email sent successfully' });
    } catch (error) {
      this.logger.error(`Error sending password reset email: ${error.message}`);
      res.status(500).json({ message: 'Failed to send password reset email' });
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { email: string; code: string; newPassword: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const isVerified = await this.authService.verifyCode(
        body.email,
        body.code,
      );
      if (!isVerified) {
        res.status(400).json({ message: 'Invalid verification code' });
        return;
      }
      await this.authService.updatePassword(body.email, body.newPassword);
      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      this.logger.error(`Error resetting password: ${error.message}`);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  }

  @Post('register')
  async register(
    @Body() registerDto: CreateUserDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const isVerified = await this.authService.verifyCode(
        registerDto.email,
        registerDto.verificationCode,
      );
      if (!isVerified) {
        res.status(400).json({ message: 'Invalid verification code' });
        return;
      }
      const userDto = await this.authService.registerUser(
        registerDto,
        'email/password',
      );
      this.authService.deleteVerificationCode(registerDto.email);
      res
        .status(200)
        .json({ message: 'Registration successful', user: userDto });
    } catch (error) {
      this.logger.error(`Error registering user: ${error.message}`);
      res.status(500).json({ message: 'Failed to register user' });
    }
  }

  @Post('send-verification-code')
  async sendVerificationCode(
    @Body() body: { email: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.authService.sendVerificationCode(body.email);
      res.status(200).json({ message: 'Verification code sent successfully' });
    } catch (error) {
      this.logger.error(`Error sending verification code: ${error.message}`);
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  }

  @Post('verify-code')
  async verifyCode(
    @Body() body: { email: string; code: string },
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Verifying code for email: ${body.email}`);

    try {
      const isVerified = await this.authService.verifyCode(
        body.email,
        body.code,
      );

      if (isVerified) {
        this.logger.log(
          `Code verification successful for email: ${body.email}`,
        );
        res.status(200).json({ message: 'Code verification successful' });
      } else {
        this.logger.warn(`Invalid verification code for email: ${body.email}`);
        res.status(400).json({ message: 'Invalid verification code' });
      }
    } catch (error) {
      this.logger.error(
        `Error verifying code for email: ${body.email} - ${error.message}`,
      );
      res.status(500).json({ message: 'Failed to verify code' });
    }
  }

  @Post('google')
  async googleLogin(
    @Body() body: { token: string },
    @Res() res: Response,
  ): Promise<void> {
    //this.logger.log(`Received Google token: ${body.token}`);
    try {
      const token = body.token;
      if (!token || typeof token !== 'string') {
        this.logger.error('Invalid token format');
        res.status(400).json({ message: 'Invalid token format' });
        return;
      }

      const userDto = await this.authService.validateGoogleToken(token);
      const jwtToken = this.authService.generateJwtToken(userDto);

      res.status(200).json({
        message: 'Google login successful',
        token: jwtToken,
        user: userDto,
      });
    } catch (error) {
      this.logger.error(`Error with Google login: ${error.message}`);
      res.status(401).json({ message: 'Google login failed' });
    }
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await this.authService.googleLogin(req);
    if (result.token) {
      res.cookie('jwt', result.token, { httpOnly: true });
      res.redirect('/');
    } else {
      res.redirect('/login');
    }
  }
}
