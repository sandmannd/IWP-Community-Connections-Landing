/** Community Memories for completed and active adventures. */

function getMemorySheet_() {
  const ss = getOrCreateDatabase_();
  return createSheetIfMissing_(ss, APP_CONFIG.sheets.memories, getMemoryHeaders_());
}

function getMemoryRecord_(memoryId) {
  const memory = getDataObjects_(getMemorySheet_()).find(function(item) {
    return String(item.MemoryId || '') === String(memoryId || '');
  });
  if (!memory) throw new Error('Memory not found.');
  return memory;
}

function listApprovedEventMemories_(eventId) {
  const sheet = getMemorySheet_();
  return getDataObjects_(sheet)
    .filter(function(memory) {
      return String(memory.EventId || '') === String(eventId || '') &&
        toBoolean_(memory.Approved);
    })
    .sort(function(a, b) {
      if (toBoolean_(a.Featured) !== toBoolean_(b.Featured)) {
        return toBoolean_(a.Featured) ? -1 : 1;
      }
      return String(b.CreatedAt || '').localeCompare(String(a.CreatedAt || ''));
    })
    .map(toClientMemory_);
}

function listEventMemoriesForAdmin(eventId) {
  requireAdmin_();
  getEvent(eventId);

  return getDataObjects_(getMemorySheet_())
    .filter(function(memory) {
      return String(memory.EventId || '') === String(eventId || '');
    })
    .sort(function(a, b) {
      if (toBoolean_(a.Featured) !== toBoolean_(b.Featured)) {
        return toBoolean_(a.Featured) ? -1 : 1;
      }
      return String(b.CreatedAt || '').localeCompare(String(a.CreatedAt || ''));
    })
    .map(toClientMemory_);
}

function uploadEventMemory(eventId, fileData, caption) {
  requireAdmin_();
  getEvent(eventId);

  fileData = fileData || {};
  const mimeType = String(fileData.mimeType || '').toLowerCase();
  const fileName = String(fileData.fileName || ('memory-' + Date.now() + '.jpg'));
  const base64 = String(fileData.base64 || '').replace(/^data:[^;]+;base64,/, '');

  if (!base64) throw new Error('No photo data was received.');

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.indexOf(mimeType) === -1) {
    throw new Error('Use a JPG, PNG, or WebP photo.');
  }

  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (error) {
    throw new Error('The photo data could not be read. Please choose the photo again.');
  }

  if (bytes.length > 8 * 1024 * 1024) {
    throw new Error('Memory photos must be smaller than 8 MB.');
  }

  const folder = getOrCreateMemoryFolder_(eventId);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const record = {
    MemoryId: createId_('memory'),
    EventId: String(eventId),
    ImageUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1800',
    FileId: file.getId(),
    Caption: String(caption || '').trim().slice(0, 240),
    Featured: false,
    Approved: true,
    UploadedBy: getCurrentUserEmail_(),
    CreatedAt: now_(),
    UpdatedAt: now_()
  };

  appendObject_(getMemorySheet_(), record);

  return {
    success: true,
    message: 'Memory photo added.',
    memory: toClientMemory_(record)
  };
}

function updateEventMemory(memoryId, updates) {
  requireAdmin_();
  updates = updates || {};

  const current = getMemoryRecord_(memoryId);
  getEvent(current.EventId);

  const allowed = { UpdatedAt: now_() };
  const hasCaption = Object.prototype.hasOwnProperty.call(updates, 'Caption') ||
    Object.prototype.hasOwnProperty.call(updates, 'caption');
  const hasFeatured = Object.prototype.hasOwnProperty.call(updates, 'Featured') ||
    Object.prototype.hasOwnProperty.call(updates, 'featured');
  const hasApproved = Object.prototype.hasOwnProperty.call(updates, 'Approved') ||
    Object.prototype.hasOwnProperty.call(updates, 'approved');

  if (hasCaption) {
    allowed.Caption = String(updates.Caption !== undefined ? updates.Caption : updates.caption || '')
      .trim().slice(0, 240);
  }
  if (hasApproved) {
    allowed.Approved = toBoolean_(updates.Approved !== undefined ? updates.Approved : updates.approved);
  }
  if (hasFeatured) {
    allowed.Featured = toBoolean_(updates.Featured !== undefined ? updates.Featured : updates.featured);
  }

  const finalApproved = hasApproved ? allowed.Approved : toBoolean_(current.Approved);
  const finalFeatured = hasFeatured ? allowed.Featured : toBoolean_(current.Featured);

  if (!finalApproved && finalFeatured) {
    allowed.Featured = false;
  }

  if (finalApproved && finalFeatured) {
    clearFeaturedMemories_(current.EventId, memoryId);
  }

  const updated = updateObjectById_(getMemorySheet_(), 'MemoryId', memoryId, allowed);

  return {
    success: true,
    message: 'Memory updated.',
    memory: toClientMemory_(updated)
  };
}

function deleteEventMemory(memoryId) {
  requireAdmin_();

  const existing = getMemoryRecord_(memoryId);
  getEvent(existing.EventId);

  const sheet = getMemorySheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) throw new Error('Memory not found.');

  const headers = values[0];
  const idIndex = headers.indexOf('MemoryId');
  const fileIdIndex = headers.indexOf('FileId');

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex] || '') !== String(memoryId || '')) continue;

    const fileId = fileIdIndex >= 0 ? String(values[i][fileIdIndex] || '') : '';
    if (fileId) {
      try {
        DriveApp.getFileById(fileId).setTrashed(true);
      } catch (error) {
        Logger.log('Could not trash memory file: ' + error.message);
      }
    }

    sheet.deleteRow(i + 1);
    return { success: true, message: 'Memory photo deleted.' };
  }

  throw new Error('Memory not found.');
}

function clearFeaturedMemories_(eventId, keepMemoryId) {
  const sheet = getMemorySheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  const headers = values[0];
  const idIndex = headers.indexOf('MemoryId');
  const eventIdIndex = headers.indexOf('EventId');
  const featuredIndex = headers.indexOf('Featured');
  const updatedIndex = headers.indexOf('UpdatedAt');

  if (idIndex < 0 || eventIdIndex < 0 || featuredIndex < 0) return;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][eventIdIndex] || '') !== String(eventId || '')) continue;
    if (String(values[i][idIndex] || '') === String(keepMemoryId || '')) continue;
    if (!toBoolean_(values[i][featuredIndex])) continue;

    sheet.getRange(i + 1, featuredIndex + 1).setValue(false);
    if (updatedIndex >= 0) sheet.getRange(i + 1, updatedIndex + 1).setValue(now_());
  }
}

function getOrCreateMemoryFolder_(eventId) {
  const rootName = 'IWP Community Connections Memories';
  const roots = DriveApp.getFoldersByName(rootName);
  const root = roots.hasNext() ? roots.next() : DriveApp.createFolder(rootName);

  const eventFolderName = 'Adventure ' + String(eventId || 'Unknown');
  const folders = root.getFoldersByName(eventFolderName);
  return folders.hasNext() ? folders.next() : root.createFolder(eventFolderName);
}

function toClientMemory_(memory) {
  return {
    MemoryId: String(memory.MemoryId || ''),
    EventId: String(memory.EventId || ''),
    ImageUrl: String(memory.ImageUrl || ''),
    Caption: String(memory.Caption || ''),
    Featured: toBoolean_(memory.Featured),
    Approved: toBoolean_(memory.Approved),
    UploadedBy: String(memory.UploadedBy || ''),
    CreatedAt: safeClientValue_(memory.CreatedAt),
    UpdatedAt: safeClientValue_(memory.UpdatedAt)
  };
}
