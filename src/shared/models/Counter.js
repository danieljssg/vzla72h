import { model, Schema } from 'mongoose';

const counterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prefix: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
    },
    padding: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

counterSchema.statics.getNextSequence = async function (name, prefix, padding = 3) {
  const counter = await this.findOneAndUpdate(
    { name },
    {
      $inc: { sequence: 1 },
      $set: { prefix, padding },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  const paddedNumber = counter.sequence.toString().padStart(counter.padding || padding, '0');

  return `${counter.prefix}-${paddedNumber}`;
};

counterSchema.statics.resetSequence = async function (name) {
  return this.updateOne({ name }, { $set: { sequence: 0 } }, { upsert: true });
};

export default model('Counter', counterSchema);
