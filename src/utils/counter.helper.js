import Counter from '../shared/models/Counter.js';

export const getNextTagId = async (counterName, prefix, padding = 3) => {
  try {
    const tagId = await Counter.getNextSequence(counterName, prefix, padding);
    return tagId;
  } catch (error) {
    throw new Error(`Error generating tag ID: ${error.message}`);
  }
};

export const resetCounter = async (counterName) => {
  try {
    await Counter.resetSequence(counterName);
    return true;
  } catch (error) {
    throw new Error(`Error resetting counter: ${error.message}`);
  }
};

export const getCounterValue = async (counterName) => {
  try {
    const counter = await Counter.findOne({ name: counterName });
    return counter ? counter.sequence : 0;
  } catch (error) {
    throw new Error(`Error getting counter value: ${error.message}`);
  }
};
