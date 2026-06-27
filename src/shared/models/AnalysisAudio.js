import { model, Schema } from 'mongoose';

const analysisAudioSchema = new Schema(
  {
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'Analysis',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: { type: Date, expires: 3600, default: Date.now }, // expira en 1 hora
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

analysisAudioSchema.index({ analysisId: 1, createdAt: -1 });

export default model('AnalysisAudio', analysisAudioSchema);
