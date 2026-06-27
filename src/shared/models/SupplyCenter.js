import { model, Schema } from 'mongoose';

const CoordinatesSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const LocationSchema = new Schema(
  {
    state: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    parish: { type: String, required: true, trim: true, maxlength: 80 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    coordinates: { type: CoordinatesSchema, required: true },
  },
  { _id: false },
);

const supplyCenterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    location: { type: LocationSchema, required: true },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

supplyCenterSchema.index({ 'location.state': 1, 'location.city': 1 });

export default model('SupplyCenter', supplyCenterSchema);
