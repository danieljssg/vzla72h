// models/File.js
import { model, Schema } from 'mongoose';

const fileSchema = new Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    versionKey: false,
  },
);

fileSchema.index({ category: 1, createdAt: -1 });

export default model('File', fileSchema);
