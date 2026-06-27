import User from '../../shared/models/User.js';
import { createLogEntry, saveAuditLog } from '../../utils/audit.logger.js';
import { getNextTagId } from '../../utils/counter.helper.js';

export const createNewUser = async (userData, modifierId = null) => {
  const {
    name,
    lastName,
    email,
    role = 'USER',
    zone = 'n/a',
    parentTagId,
    profilePicture,
    oAuthId,
    oAuthProvider,
  } = userData;

  // Verificar campos únicos
  await User.checkUniqueFields({ email, oAuthId });

  // Prefijo genérico USR para todos los usuarios — el rol no define el tagId
  const tagId = await getNextTagId('user_tags', 'USR');

  let path = tagId;

  if (parentTagId) {
    const parent = await User.findOne({ tagId: parentTagId });
    if (parent) {
      path = `${parent.path}/${tagId}`;
    } else {
      throw new Error(`Parent user with tagId ${parentTagId} not found`);
    }
  }

  if (userData.password) {
    userData.password = await User.encryptPassword(userData.password);
  }

  const user = await User.create({
    name,
    lastName,
    email,
    password: userData.password,
    role,
    zone,
    tagId,
    parentTagId,
    path,
    profilePicture,
    oAuthId,
    oAuthProvider,
  });

  if (modifierId) {
    const logEntry = createLogEntry(
      'User',
      null,
      { name, lastName, email, role, zone, tagId, parentTagId, path },
      modifierId,
      'create',
      user._id,
    );
    await saveAuditLog(logEntry);
  }

  return user;
};

export const getUserByTagId = async (tagId) => {
  const user = await User.findOne({ tagId, isActive: true });
  if (!user) {
    throw new Error(`User with tagId ${tagId} not found`);
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

export const getUserByEmail = async (email) => {
  const user = await User.findOne({ email, isActive: true });
  if (!user) {
    throw new Error(`User with email ${email} not found`);
  }
  return user;
};

export const updateUser = async (tagId, updateData, modifierId = null) => {
  const user = await User.findOne({ tagId });
  if (!user) {
    throw new Error(`User with tagId ${tagId} not found`);
  }

  const originalUser = user.toObject();
  const { parentTagId } = updateData;

  if (parentTagId !== undefined && parentTagId !== user.parentTagId) {
    if (parentTagId) {
      const newParent = await User.findOne({ tagId: parentTagId });
      if (!newParent) {
        throw new Error(`Parent user with tagId ${parentTagId} not found`);
      }

      if (newParent.path.includes(user.tagId)) {
        throw new Error('Cannot assign user as parent of themselves or their descendants');
      }

      updateData.path = `${newParent.path}/${user.tagId}`;
    } else {
      updateData.path = user.tagId;
    }

    await User.updateMany(
      { path: new RegExp(`^${user.path}/`) },
      [
        {
          $set: {
            path: {
              $concat: [
                updateData.path,
                {
                  $substrCP: [
                    '$path',
                    { $strLenCP: user.path },
                    { $subtract: [{ $strLenCP: '$path' }, { $strLenCP: user.path }] },
                  ],
                },
              ],
            },
          },
        },
      ],
      { updatePipeline: true },
    );
  }

  if (updateData.password) {
    updateData.password = await User.encryptPassword(updateData.password);
  }

  const updatedUser = await User.findOneAndUpdate({ tagId }, updateData, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (modifierId) {
    const logEntry = createLogEntry(
      'User',
      originalUser,
      updateData,
      modifierId,
      'update',
      user._id,
    );
    await saveAuditLog(logEntry);
  }

  return updatedUser;
};

export const getTeamMembers = async (tagId) => {
  const members = await User.getTeamMembers(tagId);
  return members;
};

export const getAllDescendants = async (tagId) => {
  const user = await User.findOne({ tagId });
  if (!user) {
    throw new Error(`User with tagId ${tagId} not found`);
  }

  const descendants = await User.findByPath(user.path);
  return descendants.filter((member) => member.tagId !== tagId);
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

  await User.updateMany({ parentTagId: tagId }, { parentTagId: user.parentTagId });

  if (modifierId) {
    const logEntry = createLogEntry('User', originalUser, null, modifierId, 'delete', user._id);
    await saveAuditLog(logEntry);
  }

  return deletedUser;
};

export const moveUserToNewHierarchy = async (tagId, newParentTagId, modifierId = null) => {
  const user = await User.findOne({ tagId });
  if (!user) {
    throw new Error(`User with tagId ${tagId} not found`);
  }

  const originalUser = user.toObject();
  const oldPath = user.path;
  let newPath = tagId;

  if (newParentTagId) {
    if (newParentTagId === tagId) {
      throw new Error('Un usuario no puede ser su propio jefe');
    }

    const newParent = await User.findOne({ tagId: newParentTagId });
    if (!newParent) {
      throw new Error(`New parent user with tagId ${newParentTagId} not found`);
    }

    if (newParent.path.startsWith(oldPath)) {
      throw new Error(
        'Operación inválida: No puedes mover un nodo superior dentro de su propia descendencia.',
      );
    }

    newPath = `${newParent.path}/${tagId}`;
  }

  await User.updateMany(
    { path: new RegExp(`^${oldPath}/`) },
    [
      {
        $set: {
          path: {
            $concat: [
              newPath,
              {
                $substrCP: [
                  '$path',
                  { $strLenCP: oldPath },
                  { $subtract: [{ $strLenCP: '$path' }, { $strLenCP: oldPath }] },
                ],
              },
            ],
          },
        },
      },
    ],
    { updatePipeline: true },
  );

  const updatedUser = await User.findOneAndUpdate(
    { tagId },
    { parentTagId: newParentTagId || null, path: newPath },
    { returnDocument: 'after' },
  );

  if (modifierId) {
    const logEntry = createLogEntry(
      'User',
      originalUser,
      { parentTagId: newParentTagId, path: newPath },
      modifierId,
      'update',
      user._id,
    );
    await saveAuditLog(logEntry);
  }

  return updatedUser;
};

export const createUsersInBatch = async (usersArray, modifierId = null) => {
  const createdUsers = [];
  const userMap = new Map();

  for (const userData of usersArray) {
    try {
      if (userData.parentTagId && userMap.has(userData.parentTagId)) {
        userData.parentTagId = userMap.get(userData.parentTagId);
      }

      const user = await createNewUser(userData, modifierId);

      if (userData.tempId) {
        userMap.set(userData.tempId, user.tagId);
      }

      createdUsers.push(user);
    } catch (error) {
      throw new Error(`Failed to create user ${userData.email}: ${error.message}`);
    }
  }

  return createdUsers;
};
