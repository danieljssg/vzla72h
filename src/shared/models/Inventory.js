import { model, Schema } from 'mongoose';

const StockSchema = new Schema(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const inventorySchema = new Schema(
  {
    supplyCenter: {
      type: Schema.Types.ObjectId,
      ref: 'SupplyCenter',
      required: true,
      unique: true,
      index: true,
    },
    stocks: {
      type: [StockSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

inventorySchema.index({ supplyCenter: 1, 'stocks.item': 1 });

export default model('Inventory', inventorySchema);
