import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config/app';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { full_name, email, phone_number, password } = req.body;

      // Check if user already exists
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      const existingPhone = await User.findOne({ where: { phone_number } });
      if (existingPhone) {
        res.status(400).json({ error: 'Phone number already registered' });
        return;
      }

      // Create new user
      const user = await User.create({
        full_name,
        email,
        phone_number,
        password_hash: password,
        role: 'passenger',
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      res.status(201).json({
        message: 'Registration successful',
        user: user.toJSON(),
        token,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Verify password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        token,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      
      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user: user.toJSON() });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { full_name, email, phone_number } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await user.update({
        full_name,
        email,
        phone_number,
      });

      res.json({
        message: 'Profile updated successfully',
        user: user.toJSON(),
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}