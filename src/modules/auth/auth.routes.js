import { Router } from 'express';
import { validateLogin, validateRegister } from '../../api/middlewares/validationMiddleware.js';
import {
  googleAuth,
  googleCallback,
  googleLogin,
  purgeUserData,
  refreshToken,
  signIn,
  signUp,
  validateUser,
} from './auth.controller.js';
import { validateSign } from './auth.middleware.js';

const router = Router();

// Basic Auth
router.post('/signup', validateRegister, signUp);
router.post('/signin', validateLogin, signIn);
router.post('/logout', validateSign, purgeUserData);

router.get('/validate', validateSign, validateUser);
router.post('/refresh', validateSign, refreshToken);

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google', googleLogin);

// // Google OAuth Passport
// router.get('/google', setFrontendRedirectUrl, signinGooglePassport);
// router.get('/google/callback', signinGooglePassportCallback);
// router.get('/google/logout', signoutGooglePassport);

export default router;
