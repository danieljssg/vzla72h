import { model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
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
    supplyCenter: {
      type: Schema.Types.ObjectId,
      ref: 'SupplyCenter',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    versionKey: false,
  },
);

userSchema.index({ email: 1, isActive: 1, tagId: 1, path: 1 });

userSchema.statics.checkUniqueFields = async function (data, currentUserId = null) {
  const { email } = data;

  const queryConditions = [];

  if (email !== undefined && email !== null) {
    queryConditions.push({ email });
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
    if (email !== undefined && email !== null && existingUser.email === email) {
      errors.push('Ya existe un usuario con este correo electrónico.');
    }
    if (errors.length === 0) {
      errors.push('Ya existe un usuario con datos duplicados.');
    }
    throw new Error(errors.join(' '));
  }

  return null;
};

export default model('User', userSchema);
