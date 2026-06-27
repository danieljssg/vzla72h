import { model, Schema } from 'mongoose';

const CarrierEmbedSchema = new Schema(
  {
    licensePlate: { type: String, required: true, uppercase: true, trim: true, maxlength: 20 },
    driverName: { type: String, required: true, trim: true, maxlength: 120 },
    driverPhone: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { _id: false },
);

const DestinationSchema = new Schema(
  {
    state: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    parish: { type: String, required: true, trim: true, maxlength: 80 },
    specificLocation: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const LoadedItemSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { _id: false },
);

const dispatchSchema = new Schema(
  {
    tripCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 6,
      index: true,
    },
    carrier: { type: CarrierEmbedSchema, required: true },
    origin: {
      type: Schema.Types.ObjectId,
      ref: 'SupplyCenter',
      required: true,
      index: true,
    },
    originName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    destination: { type: DestinationSchema, required: true },
    loadedItems: {
      type: [LoadedItemSchema],
      default: [],
      validate: [(arr) => Array.isArray(arr) && arr.length > 0, 'loadedItems must not be empty'],
    },
    emptyPhotoUrl: { type: String, default: null },
    loadedPhotoUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ['preparing', 'in_transit', 'delivered', 'incident'],
      default: 'in_transit',
      index: true,
    },
    dispatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

dispatchSchema.index({ 'carrier.licensePlate': 1, dispatchedAt: -1 });
dispatchSchema.index(
  { 'carrier.licensePlate': 'text', tripCode: 'text' },
  { name: 'dispatch_search_text_idx' },
);

dispatchSchema.pre('validate', function deriveTripCode(next) {
  if (this.tripCode) {
    return next();
  }

  const originPrefixRaw = (this.originName || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const originPrefix = (originPrefixRaw.slice(0, 2) || 'XX').padEnd(2, 'X');

  const idTail = (this._id ? this._id.toString() : '').slice(-4).toUpperCase();
  const idPadded = idTail.padEnd(4, 'X');

  this.tripCode = `${originPrefix}${idPadded}`;
  next();
});

export default model('Dispatch', dispatchSchema);
