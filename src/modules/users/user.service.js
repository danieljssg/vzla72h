import User from '../../shared/models/User.js';
import { createLogEntry, saveAuditLog } from '../../utils/audit.logger.js';
import { getNextTagId } from '../../utils/counter.helper.js';

/**
 * Lista usuarios activos con paginación opcional y filtro por supplyCenter.
 * La estructura jerárquica se removió: ahora los usuarios tienen un
 * supplyCenter opcional pero no un path/parentTagId.
 */
export const getAllUsers = async (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 200);
  const skip = (page - 1) * limit;

  const filter = { isActive: true };
  if (typeof query.supplyCenter === 'string' && query.supplyCenter.length > 0) {
    filter.supplyCenter = query.supplyCenter;
  }
  if (typeof query.q === 'string' && query.q.trim().length > 0) {
    const safe = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { lastName: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
      { tagId: { $regex: safe, $options: 'i' } },
    ];
  }

  return User.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
};

export const createNewUser = async (userData, modifierId = null) => {
  const { name, lastName, email, profilePicture, supplyCenter = null, role = 'USER' } = userData;

  await User.checkUniqueFields({ email });

  const tagId = await getNextTagId('user_tags', 'USR');

  const user = await User.create({
    name,
    lastName,
    email,
    role,
    tagId,
    profilePicture,
    supplyCenter: supplyCenter || null,
  });

  if (modifierId) {
    const logEntry = createLogEntry(
      'User',
      null,
      { name, lastName, email, role, tagId, supplyCenter },
      modifierId,
      'create',
      user._id,
    );
    await saveAuditLog(logEntry);
  }

  return user;
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User with id ${userId} not found`);
  }
  return user;
};

export const deleteUser = async (tagId, modifierId = null) => {
  const user = await User.findOne({ tagId });
  if (!user) {
    throw new Error(`User with tagId ${tagId} not found`);
  }

  const originalUser = user.toObject();

  const deletedUser = await User.findOneAndUpdate(
    { tagId },
    { isActive: false },
    { returnDocument: 'after' },
  );

  if (modifierId) {
    const logEntry = createLogEntry('User', originalUser, null, modifierId, 'delete', user._id);
    await saveAuditLog(logEntry);
  }

  return deletedUser;
};
