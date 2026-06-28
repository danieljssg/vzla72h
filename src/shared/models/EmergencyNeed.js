import { model, Schema } from 'mongoose';

export const URGENCY_LEVELS = ['baja', 'media', 'alta', 'critica'];

const emergencyNeedSchema = new Schema(
  {
    zone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['food', 'clothing', 'medicines', 'first_aid', 'tools', 'other'],
      default: 'other',
      index: true,
    },
    urgency: {
      type: String,
      required: true,
      enum: URGENCY_LEVELS,
      default: 'media',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000,
    },
    audioPath: {
      type: String,
      default: null,
    },
    reportedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

emergencyNeedSchema.index({ location: '2dsphere' });
emergencyNeedSchema.index({ zone: 'text', description: 'text' }, { name: 'need_search_text_idx' });
emergencyNeedSchema.index({ isResolved: 1, createdAt: -1 });
emergencyNeedSchema.index({ category: 1, isResolved: 1 });
emergencyNeedSchema.index({ urgency: 1, isResolved: 1 });

export default model('EmergencyNeed', emergencyNeedSchema);
