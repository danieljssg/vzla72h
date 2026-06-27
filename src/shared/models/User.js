import bcryptjs from 'bcryptjs';
import { model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
    oAuthId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    oAuthProvider: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },

    profilePicture: {
      type: String,
      default: 'https://i.imgur.com/jNNT4LE.png',
    },
    name: {
      type: String,
      lowercase: true,
      trim: true,
    },
    lastName: {
      type: String,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Invalid email',
      ],
    },
    password: {
      type: String,
      required: function () {
        return !this.oAuthId;
      },
      minlength: 6,
    },

    tagId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
    versionKey: false,
  },
);

userSchema.index({ email: 1, isActive: 1, role: 1, zone: 1, parentTagId: 1, tagId: 1, path: 1 });

userSchema.statics.encryptPassword = async (password) => {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
};

userSchema.statics.comparePassword = async (password, receivedPassword) => {
  return await bcryptjs.compare(password, receivedPassword);
};

userSchema.statics.checkUniqueFields = async function (data, currentUserId = null) {
  const { username, email, oAuthId } = data;

  const queryConditions = [];

  if (username !== undefined && username !== null) {
    queryConditions.push({ username: username });
  }

  if (email !== undefined && email !== null) {
    queryConditions.push({ email: email });
  }

  if (oAuthId !== undefined && oAuthId !== null) {
    queryConditions.push({ oAuthId: oAuthId });
  }

  if (queryConditions.length === 0) {
    return null;
  }

  let finalQuery = { $or: queryConditions };

  if (currentUserId) {
    finalQuery = {
      $and: [finalQuery, { _id: { $ne: currentUserId } }],
    };
  }

  const existingUser = await this.findOne(finalQuery);

  if (existingUser) {
    const errors = [];

    if (username !== undefined && username !== null && existingUser.username === username) {
      errors.push('Ya existe un usuario con este nombre de usuario.');
    }
    if (email !== undefined && email !== null && existingUser.email === email) {
      errors.push('Ya existe un usuario con este correo electrónico.');
    }
    if (oAuthId !== undefined && oAuthId !== null && existingUser.oAuthId === oAuthId) {
      errors.push('Esta cuenta de OAuth ya está vinculada a otro usuario.');
    }

    if (errors.length === 0) {
      errors.push('Ya existe un usuario con datos duplicados.');
    }

    throw new Error(errors.join(' '));
  }

  return null;
};

export default model('User', userSchema);
