/**
 * ============================================================================
 * Community Storage Manager
 * ============================================================================
 */

/**
 * Ensures the Community Connections storage structure exists.
 * Returns the root Google Drive Folder.
 */
function ensureCommunityStorage_() {
  const storageConfig = APP_CONFIG.storage;
  const configuredRootId = String(storageConfig.rootFolderId || '').trim();

  if (!configuredRootId) {
    throw new Error('APP_CONFIG.storage.rootFolderId is not configured.');
  }

  const communityRoot = DriveApp.getFolderById(configuredRootId);
  if (communityRoot.isTrashed && communityRoot.isTrashed()) {
    communityRoot.setTrashed(false);
  }

  ensureCommunityStorageFolders_(communityRoot);

  // Keep the Settings sheet synchronized, but never allow a stale setting to
  // override the permanent configured storage root.
  saveStorageSetting_(
    storageConfig.settingsKeys.rootFolderId,
    communityRoot.getId()
  );

  return communityRoot;
}

/**
 * Initializes the permanent storage structure in the configured data folder.
 * The configured folder is already the data root, so no extra nested root is
 * created.
 */
function initializeCommunityStorage_() {
  const communityRoot = ensureCommunityStorage_();

  Logger.log(
    'Community storage initialized: ' +
    communityRoot.getName() +
    ' (' + communityRoot.getId() + ')'
  );

  return communityRoot;
}

/**
 * Ensures all permanent folders under the Community Storage root exist.
 */
function ensureCommunityStorageFolders_(communityRoot) {
  const storageConfig = APP_CONFIG.storage;

  getOrCreateStorageFolder_(
    communityRoot,
    storageConfig.rootFolders.adventures
  );

  getOrCreateStorageFolder_(
    communityRoot,
    storageConfig.rootFolders.archives
  );

  const systemFolder = getOrCreateStorageFolder_(
    communityRoot,
    storageConfig.rootFolders.system
  );

  Object.keys(storageConfig.systemFolders).forEach(function(key) {
    getOrCreateStorageFolder_(
      systemFolder,
      storageConfig.systemFolders[key]
    );
  });
}

/**
 * Returns an existing child folder or creates it.
 */
function getOrCreateStorageFolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(folderName);
}

/**
 * Reads one value from the Settings sheet.
 */
function getStorageSetting_(settingKey) {
  const sheet = getSheetByName_(APP_CONFIG.sheets.settings);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return '';
  }

  const headers = values[0];
  const keyIndex = headers.indexOf('SettingKey');
  const valueIndex = headers.indexOf('SettingValue');

  if (keyIndex === -1 || valueIndex === -1) {
    throw new Error(
      'Settings sheet is missing SettingKey or SettingValue columns.'
    );
  }

  for (let row = 1; row < values.length; row++) {
    if (String(values[row][keyIndex]).trim() === settingKey) {
      return String(values[row][valueIndex] || '').trim();
    }
  }

  return '';
}

/**
 * Creates or updates one value in the Settings sheet.
 */
function saveStorageSetting_(settingKey, settingValue) {
  const sheet = getSheetByName_(APP_CONFIG.sheets.settings);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const idIndex = headers.indexOf('SettingId');
  const keyIndex = headers.indexOf('SettingKey');
  const valueIndex = headers.indexOf('SettingValue');
  const createdIndex = headers.indexOf('CreatedAt');
  const updatedIndex = headers.indexOf('UpdatedAt');

  if (
    idIndex === -1 ||
    keyIndex === -1 ||
    valueIndex === -1 ||
    createdIndex === -1 ||
    updatedIndex === -1
  ) {
    throw new Error('Settings sheet headers are incomplete.');
  }

  const now = new Date();

  for (let row = 1; row < values.length; row++) {
    if (String(values[row][keyIndex]).trim() === settingKey) {
      sheet.getRange(row + 1, valueIndex + 1).setValue(settingValue);
      sheet.getRange(row + 1, updatedIndex + 1).setValue(now);
      return;
    }
  }

  const newRow = new Array(headers.length).fill('');
  newRow[idIndex] = createId_('setting');
  newRow[keyIndex] = settingKey;
  newRow[valueIndex] = settingValue;
  newRow[createdIndex] = now;
  newRow[updatedIndex] = now;

  sheet.appendRow(newRow);
}

/**
 * Temporary Sprint 1 test function.
 * Run this manually from the Apps Script editor.
 */
function testEnsureCommunityStorage() {
  const folder = ensureCommunityStorage_();

  const result = {
    success: true,
    folderName: folder.getName(),
    folderId: folder.getId(),
    folderUrl: folder.getUrl()
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * One-time migration that moves the existing Community Storage folder into
 * the configured IWP Community Connections project folder.
 */
function moveCommunityStorageToProjectFolder() {
  const communityRoot = ensureCommunityStorage_();
  const result = {
    success: true,
    storageFolderId: communityRoot.getId(),
    storageFolderName: communityRoot.getName(),
    storageFolderUrl: communityRoot.getUrl(),
    message: 'Storage already uses the permanent configured data folder.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


/**
 * One-time backfill for existing adventures that do not yet have a
 * DriveFolderId. Creates or reuses each adventure folder and saves the ID.
 * Run manually from the Apps Script editor after the publish integration is
 * installed. Safe to run more than once.
 */
function backfillAdventureStorageFolders() {
  requireAdmin_();

  const sheet = getSheetByName_(APP_CONFIG.sheets.events);
  const events = getDataObjects_(sheet);
  const result = {
    success: true,
    processed: 0,
    createdOrRecovered: 0,
    alreadyLinked: 0,
    skipped: 0,
    errors: []
  };

  events.forEach(function(event) {
    const eventId = String(event.EventId || '').trim();
    const title = String(event.Title || '').trim();
    const startDate = event.StartDate;

    if (!eventId || !title || !startDate) {
      result.skipped++;
      return;
    }

    result.processed++;

    try {
      const hadFolderId = Boolean(String(event.DriveFolderId || '').trim());
      const folder = ensureAdventureFolder_(event);

      updateObjectById_(sheet, 'EventId', eventId, {
        DriveFolderId: folder.getId(),
        UpdatedAt: now_()
      });

      if (hadFolderId) {
        result.alreadyLinked++;
      } else {
        result.createdOrRecovered++;
      }
    } catch (err) {
      result.errors.push({
        eventId: eventId,
        title: title,
        message: err.message
      });
    }
  });

  result.success = result.errors.length === 0;
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Ensures the Google Drive folder structure for one adventure exists.
 * Reuses event.DriveFolderId when it points to a valid folder.
 * Returns the adventure Google Drive Folder.
 */
function ensureAdventureFolder_(event) {
  if (!event || !event.EventId || !event.Title || !event.StartDate) {
    throw new Error(
      'ensureAdventureFolder_ requires EventId, Title, and StartDate.'
    );
  }

  const location = getExpectedAdventureStorageLocation_(event);
  let adventureFolder = null;

  if (event.DriveFolderId) {
    try {
      adventureFolder = DriveApp.getFolderById(event.DriveFolderId);
      if (adventureFolder.isTrashed && adventureFolder.isTrashed()) {
        adventureFolder.setTrashed(false);
      }
    } catch (err) {
      Logger.log(
        'Saved adventure folder could not be opened. Recovering it. ' +
        err.message
      );
      adventureFolder = null;
    }
  }

  if (!adventureFolder) {
    const matchingFolders = location.yearFolder.getFoldersByName(
      location.folderName
    );
    adventureFolder = matchingFolders.hasNext()
      ? matchingFolders.next()
      : location.yearFolder.createFolder(location.folderName);
  }

  // A valid DriveFolderId is not enough. The folder must live under the
  // configured data root in Adventures/<year>.
  if (!isFolderDirectChildOf_(adventureFolder, location.yearFolder)) {
    adventureFolder.moveTo(location.yearFolder);
  }

  if (adventureFolder.getName() !== location.folderName) {
    adventureFolder.setName(location.folderName);
  }

  ensureAdventureSubfolders_(adventureFolder);
  return adventureFolder;
}

/**
 * Returns the required location and name for an adventure folder.
 */
function getExpectedAdventureStorageLocation_(event) {
  const communityRoot = ensureCommunityStorage_();
  const storageConfig = APP_CONFIG.storage;
  const adventuresFolder = getOrCreateStorageFolder_(
    communityRoot,
    storageConfig.rootFolders.adventures
  );
  const startDate = normalizeAdventureStartDate_(event.StartDate);
  const yearFolder = getOrCreateStorageFolder_(
    adventuresFolder,
    String(startDate.getFullYear())
  );
  const dateText = Utilities.formatDate(
    startDate,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
  const safeTitle = sanitizeStorageFolderName_(event.Title);
  const safeEventId = sanitizeStorageFolderName_(event.EventId);

  return {
    communityRoot: communityRoot,
    adventuresFolder: adventuresFolder,
    yearFolder: yearFolder,
    folderName: dateText + ' - ' + safeTitle + ' - ' + safeEventId
  };
}

/**
 * Returns true only when parentFolder is a direct parent of childFolder.
 */
function isFolderDirectChildOf_(childFolder, parentFolder) {
  const parents = childFolder.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === parentFolder.getId()) return true;
  }
  return false;
}

/**
 * Ensures the standard child folders exist inside an adventure folder.
 */
function ensureAdventureSubfolders_(adventureFolder) {
  [
    'Event Images',
    'Community Uploads',
    'Featured Photos',
    'Documents',
    'Exports',
    'Archive'
  ].forEach(function(folderName) {
    getOrCreateStorageFolder_(adventureFolder, folderName);
  });
}


/**
 * Returns one standard subfolder inside an adventure's permanent Drive folder.
 * Creates the adventure folder or missing child folder when needed.
 */
function getAdventureStorageSubfolder_(event, folderName) {
  event = event || {};
  const allowed = [
    'Event Images',
    'Community Uploads',
    'Featured Photos',
    'Documents',
    'Exports',
    'Archive'
  ];

  if (allowed.indexOf(String(folderName || '')) === -1) {
    throw new Error('Unsupported adventure storage folder: ' + folderName);
  }

  const adventureFolder = ensureAdventureFolder_(event);
  return getOrCreateStorageFolder_(adventureFolder, folderName);
}

/**
 * Moves a stored memory file into the requested adventure folder.
 * Missing or inaccessible files are logged without blocking moderation.
 */
function moveMemoryFileToAdventureFolder_(event, fileId, folderName) {
  const normalizedFileId = String(fileId || '').trim();
  if (!normalizedFileId) return false;

  try {
    const destination = getAdventureStorageSubfolder_(event, folderName);
    DriveApp.getFileById(normalizedFileId).moveTo(destination);
    return true;
  } catch (error) {
    Logger.log(
      'Could not move memory file ' + normalizedFileId +
      ' to ' + folderName + ': ' + error.message
    );
    return false;
  }
}

/**
 * Repairs every adventure folder location and reports exactly where it lives.
 * Safe to run more than once.
 */
function repairAdventureStorageLocations() {
  requireAdmin_();

  const sheet = getSheetByName_(APP_CONFIG.sheets.events);
  const events = getDataObjects_(sheet);
  const result = {
    success: true,
    processed: 0,
    repaired: 0,
    alreadyCorrect: 0,
    skipped: 0,
    errors: [],
    adventures: []
  };

  events.forEach(function(event) {
    const eventId = String(event.EventId || '').trim();
    const title = String(event.Title || '').trim();
    if (!eventId || !title || !event.StartDate) {
      result.skipped++;
      return;
    }

    result.processed++;

    try {
      const expected = getExpectedAdventureStorageLocation_(event);
      let beforeFolder = null;
      let beforeParentIds = [];
      let beforeName = '';

      if (event.DriveFolderId) {
        try {
          beforeFolder = DriveApp.getFolderById(event.DriveFolderId);
          beforeName = beforeFolder.getName();
          beforeParentIds = getFolderParentIds_(beforeFolder);
        } catch (ignored) {}
      }

      const folder = ensureAdventureFolder_(event);
      updateObjectById_(sheet, 'EventId', eventId, {
        DriveFolderId: folder.getId(),
        UpdatedAt: now_()
      });

      const changed =
        !beforeFolder ||
        beforeFolder.getId() !== folder.getId() ||
        beforeName !== folder.getName() ||
        beforeParentIds.indexOf(expected.yearFolder.getId()) === -1;

      if (changed) result.repaired++;
      else result.alreadyCorrect++;

      result.adventures.push({
        eventId: eventId,
        title: title,
        folderId: folder.getId(),
        folderName: folder.getName(),
        folderUrl: folder.getUrl(),
        parentFolderId: expected.yearFolder.getId(),
        parentFolderName: expected.yearFolder.getName(),
        path: APP_CONFIG.storage.rootName + '/Adventures/' +
          expected.yearFolder.getName() + '/' + folder.getName()
      });
    } catch (err) {
      result.errors.push({
        eventId: eventId,
        title: title,
        message: err.message
      });
    }
  });

  const root = ensureCommunityStorage_();
  result.rootFolderId = root.getId();
  result.rootFolderName = root.getName();
  result.rootFolderUrl = root.getUrl();
  result.success = result.errors.length === 0;

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Returns a diagnostic report without changing event records.
 */
function inspectAdventureStorageLocations() {
  requireAdmin_();

  const events = getDataObjects_(
    getSheetByName_(APP_CONFIG.sheets.events)
  );
  const report = events.map(function(event) {
    const item = {
      eventId: String(event.EventId || ''),
      title: String(event.Title || ''),
      driveFolderId: String(event.DriveFolderId || '')
    };

    if (!item.driveFolderId) {
      item.status = 'NOT LINKED';
      return item;
    }

    try {
      const folder = DriveApp.getFolderById(item.driveFolderId);
      item.status = 'LINKED';
      item.folderName = folder.getName();
      item.folderUrl = folder.getUrl();
      item.parentIds = getFolderParentIds_(folder);
      item.parentNames = getFolderParentNames_(folder);
    } catch (err) {
      item.status = 'BROKEN LINK';
      item.error = err.message;
    }

    return item;
  });

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

function getFolderParentIds_(folder) {
  const ids = [];
  const parents = folder.getParents();
  while (parents.hasNext()) ids.push(parents.next().getId());
  return ids;
}

function getFolderParentNames_(folder) {
  const names = [];
  const parents = folder.getParents();
  while (parents.hasNext()) names.push(parents.next().getName());
  return names;
}


/**
 * Converts supported event date values into a valid local Date.
 */
function normalizeAdventureStartDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  const text = String(value || '').trim();
  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
  }

  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) {
    throw new Error('Invalid adventure StartDate: ' + value);
  }

  return parsed;
}

/**
 * Removes characters Google Drive does not handle cleanly in folder names.
 */
function sanitizeStorageFolderName_(value) {
  const cleaned = String(value || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'Untitled';
}
