import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { sendSuccess, sendError, sendCreated } from '../utils/responseUtils';
import { logAuth, logError } from '../utils/loggerUtils';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { full_name, email, phone_number, password } = req.body;
      
      const result = await AuthService.registerUser({
        full_name,
        email,
        phone_number,
        password,
      });

      logAuth('User registered', result.user.id, true);

      sendCreated(res, result, 'Registration successful');
    } catch (error: any) {
      logError('Registration error', error, { context: 'AuthController.register' });
      
      const statusCode = error.message.includes('already') ? 400 : 500;
      sendError(res, error.message || 'Registration failed', statusCode);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await AuthService.loginUser(email, password);

      logAuth('User logged in', result.user.id, true);

      sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      logError('Login error', error, { context: 'AuthController.login' });
      
      const statusCode = error.message.includes('Invalid') ? 401 : 500;
      sendError(res, error.message || 'Login failed', statusCode);
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      
      const user = await AuthService.getUserProfile(userId);

      sendSuccess(res, { user });
    } catch (error: any) {
      logError('Get profile error', error, { 
        context: 'AuthController.getProfile',
        userId: (req as any).user?.id 
      });
      
      const statusCode = error.message === 'User not found' ? 404 : 500;
      sendError(res, error.message || 'Failed to fetch profile', statusCode);
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { full_name, email, phone_number } = req.body;

      const user = await AuthService.updateUserProfile(userId, {
        full_name,
        email,
        phone_number,
      });

      logAuth('Profile updated', userId, true);

      sendSuccess(res, { user }, 'Profile updated successfully');
    } catch (error: any) {
      logError('Update profile error', error, { 
        context: 'AuthController.updateProfile',
        userId: (req as any).user?.id 
      });
      
      const statusCode = error.message === 'User not found' ? 404 : 500;
      sendError(res, error.message || 'Failed to update profile', statusCode);
    }
  }
}