import { model, Schema } from 'mongoose';

const DriverSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    idNumber: { type: String, required: true, trim: true, maxlength: 20 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { _id: false },
);

const carrierSchema = new Schema(
  {
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ['motorcycle', 'car', 'pickup', 'truck', 'trailer', 'heavy_machinery'],
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    driver: { type: DriverSchema, required: true },
    status: {
      type: String,
      enum: ['available', 'assigned', 'inactive'],
      default: 'available',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

carrierSchema.index({ status: 1, vehicleType: 1 });

export default model('Carrier', carrierSchema);
