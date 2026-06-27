import { model, Schema } from 'mongoose';

const auditLogSchema = new Schema(
  {
    modelName: {
      type: String,
      required: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    modifiedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    changes: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

auditLogSchema.index({ documentId: 1, action: 1 });

export default model('AuditLog', auditLogSchema);
