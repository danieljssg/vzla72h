import { model, Schema } from 'mongoose';

const CandidateDataSchema = new Schema(
  {
    fullName: { type: String, default: 'N/A' },
    profession: { type: String, default: 'N/A' },
    age: { type: String, default: 'N/A' },
    email: { type: String, default: 'N/A' },
    phone: { type: String, default: 'N/A' },
    dni: { type: String, default: 'N/A' },
  },
  { _id: false },
);

const SkillsSchema = new Schema(
  {
    technical: { type: [String], default: [] },
    soft: { type: [String], default: [] },
  },
  { _id: false },
);

const RadarStatsSchema = new Schema(
  {
    adaptability: { type: Number, min: 0, max: 100, default: 0 },
    technicalPrecision: { type: Number, min: 0, max: 100, default: 0 },
    appliedCreativity: { type: Number, min: 0, max: 100, default: 0 },
    resilience: { type: Number, min: 0, max: 100, default: 0 },
    impactCommunication: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false },
);

const SummarySchema = new Schema(
  {
    profile: { type: String, default: 'N/A' },
    experience: { type: String, default: 'N/A' },
    education: { type: String, default: 'N/A' },
    skills: { type: SkillsSchema },
    justify: { type: String, default: 'N/A' },
  },
  { _id: false },
);

const analysisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hobby: { type: String, default: '' },
    candidateData: { type: CandidateDataSchema },
    functionalArea: {
      area: { type: String, default: 'N/A' },
      score: { type: Number, min: 0, max: 100, default: 0 },
    },
    occupation: { type: String, default: 'N/A' },
    ai_insight: { type: String, default: 'N/A' },

    radarStats: { type: RadarStatsSchema },

    summary: { type: SummarySchema },
    expiresAt: { type: Date, expires: 3600, default: Date.now }, // expira en 1 hora
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

analysisSchema.index({ userId: 1, createdAt: -1 });

export default model('Analysis', analysisSchema);
