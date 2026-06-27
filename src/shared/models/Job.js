import { model, Schema } from 'mongoose';

const jobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    analysisId: { type: Schema.Types.ObjectId, ref: 'Analysis', default: null },
    candidateName: { type: String, default: 'N/A' },
    hobby: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    progress: {
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      step: { type: String, default: 'En cola' },
    },
    error: { type: String },
    attempts: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    expiresAt: { type: Date, expires: 3600, default: Date.now }, // expira en 1 hora
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

jobSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default model('Job', jobSchema);
