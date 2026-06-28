import { model, Schema } from 'mongoose';

// GeoJSON Point stored in the standard MongoDB geospatial format.
// shape: { type: 'Point', coordinates: [lng, lat] }
const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2,
        message: 'coordinates must be [lng, lat]',
      },
    },
  },
  { _id: false },
);

const LocationSchema = new Schema(
  {
    state: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    parish: { type: String, required: true, trim: true, maxlength: 80 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    coordinates: { type: GeoPointSchema, required: true },
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
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },
    location: { type: LocationSchema, required: true },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Optional photo stored as a base64-encoded string.
    photo: {
      type: String,
      default: null,
    },
    photoMimeType: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Geospatial index on `location.coordinates` — required for
// $geoNear / $near queries. The whole `location` sub-document is NOT a
// valid GeoJSON object (it also contains state/city/parish/address),
// so the 2dsphere index must point at the embedded GeoJSON Point
// `location.coordinates` (i.e. { type: 'Point', coordinates: [lng, lat] }).
supplyCenterSchema.index({ 'location.coordinates': '2dsphere' });
supplyCenterSchema.index({ 'location.state': 1, 'location.city': 1 });

export default model('SupplyCenter', supplyCenterSchema);
