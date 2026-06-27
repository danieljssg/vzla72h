import { model, Schema } from 'mongoose';

const itemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      required: true,
      enum: ['food', 'health', 'hygiene', 'tools', 'clothing', 'others'],
      default: 'others',
      index: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: 'boxes',
      maxlength: 30,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

itemSchema.index({ name: 1, category: 1 });

export default model('Item', itemSchema);
