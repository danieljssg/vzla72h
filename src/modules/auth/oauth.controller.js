import { generateToken, getAuthUrl, getTokens, verifyGoogleToken } from '../../config/jwt.js';
import logger from '../../config/logger.js';
import User from '../../shared/models/User.js';
import { createNewUser } from '../users/user.service.js';

export const googleAuth = async (_req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
};

export const googleCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Código de autorización no proporcionado',
    });
  }

  try {
    const tokens = await getTokens(code);
    const payload = await verifyGoogleToken(tokens.id_token);
    const { sub: googleId, email, name, given_name, family_name, picture } = payload;

    let user = await User.findOne({
      $or: [{ oAuthId: googleId }, { email: email.toLowerCase() }],
    });

    if (!user) {
      user = await createNewUser({
        oAuthId: googleId,
        oAuthProvider: 'google',
        email: email,
        name: given_name || name,
        lastName: family_name || '',
        profilePicture: picture || 'https://i.imgur.com/jNNT4LE.png',
        role: 'USER',
        zone: 'n/a',
      });
    } else {
      user.lastLogin = new Date();

      if (!user.oAuthId) {
        user.oAuthId = googleId;
        user.oAuthProvider = 'google';
      }

      if (picture && user.profilePicture !== picture) {
        const { addJob } = await import('../../jobs/queues/main.queue.js');

        await addJob('UPDATE_OAUTH_DATA', {
          userId: user._id,
          oAuthId: googleId,
          oAuthProvider: 'google',
          newProfilePicture: picture,
          updatedAt: new Date(),
        });
      }

      await user.save();
    }

    const sessionToken = generateToken(user);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/google/callback?token=${sessionToken.token}`);
  } catch (error) {
    logger.error('Error en Google Auth Callback:', error);
    res.status(500).json({ success: false, message: error.message || 'Error en la autenticación' });
  }
};

export const googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    const payload = await verifyGoogleToken(idToken);
    const { sub: googleId, email, name, given_name, family_name, picture } = payload;

    let user = await User.findOne({
      $or: [{ oAuthId: googleId }, { email: email.toLowerCase() }],
    });

    if (!user) {
      user = await createNewUser({
        oAuthId: googleId,
        oAuthProvider: 'google',
        email: email,
        name: given_name || name,
        lastName: family_name || '',
        profilePicture: picture || 'https://i.imgur.com/jNNT4LE.png',
        role: 'USER',
        zone: 'n/a',
      });
    } else {
      user.lastLogin = new Date();

      if (!user.oAuthId) {
        user.oAuthId = googleId;
        user.oAuthProvider = 'google';
      }

      if (picture && user.profilePicture !== picture) {
        const { addJob } = await import('../../jobs/queues/main.queue.js');

        await addJob('UPDATE_OAUTH_DATA', {
          userId: user._id,
          oAuthId: googleId,
          oAuthProvider: 'google',
          newProfilePicture: picture,
          updatedAt: new Date(),
        });
      }

      await user.save();
    }

    const sessionToken = generateToken(user);

    res.status(200).json({
      success: true,
      token: sessionToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        path: user.path,
      },
    });
  } catch (error) {
    logger.error('Error en Google Auth:', error);
    res.status(401).json({ success: false, message: error.message || 'Token inválido' });
  }
};
