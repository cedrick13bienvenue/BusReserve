import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Registration validation
const registerValidation = [
  body('full_name').notEmpty().withMessage('Full name is required').trim(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone_number')
    .matches(/^\+2507[0-9]{8}$/)
    .withMessage('Valid Rwandan phone number is required (+2507XXXXXXXX)'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

// Login validation
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Update profile validation
const updateProfileValidation = [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty').trim(),
  body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone_number')
    .optional()
    .matches(/^\+2507[0-9]{8}$/)
    .withMessage('Valid Rwandan phone number is required'),
];

// Routes
router.post('/register', validate(registerValidation), AuthController.register);
router.post('/login', validate(loginValidation), AuthController.login);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, validate(updateProfileValidation), AuthController.updateProfile);

export default router;