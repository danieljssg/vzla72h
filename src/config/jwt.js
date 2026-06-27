export * from './oauth.js';

import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  try {
    const payload = {
      id: user._id,
      tagId: user.tagId,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      zone: user.zone,
      path: user.path,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    return {
      token,
      user: {
        id: user._id,
        tagId: user.tagId,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        role: user.role,
        zone: user.zone,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
      },
    };
  } catch (_error) {
    return null;
  }
};

export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (_error) {
    return null;
  }
};
