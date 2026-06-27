import { addJob } from '../jobs/queues/main.queue.js';
import AuditLog from '../shared/models/AuditLog.js';

export const getDiff = (originalDoc, updatedData) => {
  const changes = {};

  const original = originalDoc ? (originalDoc.toObject ? originalDoc.toObject() : originalDoc) : {};

  for (const key in updatedData) {
    if (Object.hasOwn(updatedData, key)) {
      const originalValue = original[key];
      const newValue = updatedData[key];

      const originalValueString = JSON.stringify(originalValue);
      const newValueString = JSON.stringify(newValue);

      if (originalValueString !== newValueString) {
        changes[key] = {
          oldValue: originalValue,
          newValue: newValue,
        };
      }
    }
  }
  return changes;
};

export const createLogEntry = (
  modelName,
  originalDoc,
  newData,
  modifierId,
  action,
  docId = null,
) => {
  let changes = {};

  if (action === 'create') {
    changes = newData;
  } else if (action === 'update') {
    if (originalDoc) {
      changes = getDiff(originalDoc, newData);
    } else {
      changes = newData;
    }
  } else if (action === 'delete') {
    changes = originalDoc || {};
  }

  return {
    modelName: modelName,
    documentId: docId,
    action: action,
    modifiedBy: modifierId,
    modifiedAt: new Date(),
    changes: changes,
  };
};

export const saveAuditLog = async (logEntryObject) => {
  try {
    await addJob('SAVE_AUDIT_LOG', logEntryObject);
    return true;
  } catch (_err) {
    return false;
  }
};

export const saveAuditLogSync = async (logEntryObject) => {
  const newAuditLog = new AuditLog(logEntryObject);
  await newAuditLog.save();
  return newAuditLog._id;
};
