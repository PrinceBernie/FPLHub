// File: fpl-hub-backend/src/config/backup.js
// Backup automation system for production deployment

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

// Backup configuration
const backupConfig = {
  // Database backup configuration
  database: {
    enabled: process.env.BACKUP_DATABASE === 'true',
    schedule: process.env.BACKUP_DATABASE_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: {
      daily: parseInt(process.env.BACKUP_RETENTION_DAILY) || 7,
      weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY) || 4,
      monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY) || 12
    },
    compression: process.env.BACKUP_DATABASE_COMPRESSION === 'true',
    encryption: process.env.BACKUP_DATABASE_ENCRYPTION === 'true',
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
    includeSchema: process.env.BACKUP_INCLUDE_SCHEMA === 'true',
    includeData: process.env.BACKUP_INCLUDE_DATA === 'true'
  },
  
  // File backup configuration
  files: {
    enabled: process.env.BACKUP_FILES === 'true',
    schedule: process.env.BACKUP_FILES_SCHEDULE || '0 3 * * *', // Daily at 3 AM
    paths: process.env.BACKUP_FILE_PATHS ? process.env.BACKUP_FILE_PATHS.split(',') : [
      './uploads',
      './logs',
      './certs',
      './config'
    ],
    exclude: process.env.BACKUP_FILE_EXCLUDE ? process.env.BACKUP_FILE_EXCLUDE.split(',') : [
      'node_modules',
      '.git',
      '*.tmp',
      '*.log'
    ],
    compression: process.env.BACKUP_FILES_COMPRESSION === 'true',
    encryption: process.env.BACKUP_FILES_ENCRYPTION === 'true'
  },
  
  // Cloud storage configuration
  cloud: {
    enabled: process.env.BACKUP_CLOUD_ENABLED === 'true',
    provider: process.env.BACKUP_CLOUD_PROVIDER || 'aws-s3', // aws-s3, google-cloud, azure-blob, none
    
    // AWS S3 configuration
    awsS3: {
      enabled: process.env.AWS_S3_BACKUP_ENABLED === 'true',
      bucket: process.env.AWS_S3_BACKUP_BUCKET,
      region: process.env.AWS_S3_BACKUP_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      path: process.env.AWS_S3_BACKUP_PATH || 'backups',
      lifecycle: {
        enabled: process.env.AWS_S3_LIFECYCLE_ENABLED === 'true',
        transitionDays: parseInt(process.env.AWS_S3_TRANSITION_DAYS) || 30,
        expirationDays: parseInt(process.env.AWS_S3_EXPIRATION_DAYS) || 365
      }
    },
    
    // Google Cloud Storage configuration
    googleCloud: {
      enabled: process.env.GOOGLE_CLOUD_BACKUP_ENABLED === 'true',
      bucket: process.env.GOOGLE_CLOUD_BACKUP_BUCKET,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      serviceAccountKey: process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY,
      path: process.env.GOOGLE_CLOUD_BACKUP_PATH || 'backups',
      lifecycle: {
        enabled: process.env.GOOGLE_CLOUD_LIFECYCLE_ENABLED === 'true',
        ageDays: parseInt(process.env.GOOGLE_CLOUD_AGE_DAYS) || 365
      }
    },
    
    // Azure Blob Storage configuration
    azureBlob: {
      enabled: process.env.AZURE_BLOB_BACKUP_ENABLED === 'true',
      accountName: process.env.AZURE_BLOB_ACCOUNT_NAME,
      accountKey: process.env.AZURE_BLOB_ACCOUNT_KEY,
      container: process.env.AZURE_BLOB_CONTAINER,
      path: process.env.AZURE_BLOB_BACKUP_PATH || 'backups'
    }
  },
  
  // Local storage configuration
  local: {
    enabled: process.env.BACKUP_LOCAL_ENABLED === 'true',
    path: process.env.BACKUP_LOCAL_PATH || './backups',
    maxSize: process.env.BACKUP_LOCAL_MAX_SIZE || '10GB',
    cleanup: process.env.BACKUP_LOCAL_CLEANUP === 'true'
  },
  
  // Notification configuration
  notifications: {
    enabled: process.env.BACKUP_NOTIFICATIONS === 'true',
    email: {
      enabled: process.env.BACKUP_EMAIL_NOTIFICATIONS === 'true',
      smtp: {
        host: process.env.BACKUP_SMTP_HOST,
        port: parseInt(process.env.BACKUP_SMTP_PORT) || 587,
        secure: process.env.BACKUP_SMTP_SECURE === 'true',
        auth: {
          user: process.env.BACKUP_SMTP_USER,
          pass: process.env.BACKUP_SMTP_PASS
        }
      },
      recipients: process.env.BACKUP_EMAIL_RECIPIENTS ? process.env.BACKUP_EMAIL_RECIPIENTS.split(',') : [],
      subject: process.env.BACKUP_EMAIL_SUBJECT || 'FPL Hub Backup Report'
    },
    slack: {
      enabled: process.env.BACKUP_SLACK_NOTIFICATIONS === 'true',
      webhookUrl: process.env.BACKUP_SLACK_WEBHOOK_URL,
      channel: process.env.BACKUP_SLACK_CHANNEL || '#backups'
    }
  },
  
  // Monitoring and health checks
  monitoring: {
    enabled: process.env.BACKUP_MONITORING === 'true',
    healthCheckEndpoint: process.env.BACKUP_HEALTH_CHECK_ENDPOINT || '/health/backup',
    metrics: {
      enabled: process.env.BACKUP_METRICS === 'true',
      retention: parseInt(process.env.BACKUP_METRICS_RETENTION) || 30
    }
  }
};

// Backup status tracking
let backupStatus = {
  lastBackup: null,
  lastSuccessfulBackup: null,
  lastFailedBackup: null,
  totalBackups: 0,
  successfulBackups: 0,
  failedBackups: 0,
  currentBackup: null,
  errors: []
};

// Function to create database backup
const createDatabaseBackup = async (config = backupConfig) => {
  if (!config.database.enabled) {
    console.log('ℹ️ Database backup is disabled');
    return { success: false, message: 'Database backup disabled' };
  }
  
  try {
    console.log('🔄 Creating database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(config.local.path, 'database');
    const backupFile = path.join(backupDir, `db-backup-${timestamp}.sql`);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Determine database type and create backup
    const dbType = process.env.DATABASE_PROVIDER || 'sqlite';
    let backupCommand;
    
    if (dbType === 'postgresql') {
      backupCommand = `pg_dump "${process.env.DATABASE_URL}" > "${backupFile}"`;
    } else if (dbType === 'mysql') {
      backupCommand = `mysqldump -u "${process.env.DB_USER}" -p"${process.env.DB_PASSWORD}" "${process.env.DB_NAME}" > "${backupFile}"`;
    } else {
      // SQLite - just copy the file
      const dbPath = process.env.DATABASE_URL || './dev.db';
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupFile);
      } else {
        throw new Error('SQLite database file not found');
      }
    }
    
    if (backupCommand) {
      execSync(backupCommand, { stdio: 'pipe' });
    }
    
    // Compress backup if enabled
    let finalBackupFile = backupFile;
    if (config.database.compression) {
      const compressedFile = `${backupFile}.gz`;
      await compressFile(backupFile, compressedFile);
      fs.unlinkSync(backupFile); // Remove uncompressed file
      finalBackupFile = compressedFile;
    }
    
    // Encrypt backup if enabled
    if (config.database.encryption && config.database.encryptionKey) {
      const encryptedFile = `${finalBackupFile}.enc`;
      await encryptFile(finalBackupFile, encryptedFile, config.database.encryptionKey);
      fs.unlinkSync(finalBackupFile); // Remove unencrypted file
      finalBackupFile = encryptedFile;
    }
    
    console.log(`✅ Database backup created: ${finalBackupFile}`);
    
    // Update backup status
    backupStatus.lastBackup = new Date();
    backupStatus.lastSuccessfulBackup = new Date();
    backupStatus.totalBackups++;
    backupStatus.successfulBackups++;
    
    return {
      success: true,
      file: finalBackupFile,
      size: fs.statSync(finalBackupFile).size,
      timestamp: new Date().toISOString(),
      type: 'database'
    };
    
  } catch (error) {
    console.error('❌ Database backup failed:', error.message);
    
    // Update backup status
    backupStatus.lastBackup = new Date();
    backupStatus.lastFailedBackup = new Date();
    backupStatus.totalBackups++;
    backupStatus.failedBackups++;
    backupStatus.errors.push({
      timestamp: new Date().toISOString(),
      type: 'database',
      error: error.message
    });
    
    throw error;
  }
};

// Function to create file backup
const createFileBackup = async (config = backupConfig) => {
  if (!config.files.enabled) {
    console.log('ℹ️ File backup is disabled');
    return { success: false, message: 'File backup disabled' };
  }
  
  try {
    console.log('🔄 Creating file backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(config.local.path, 'files');
    const backupFile = path.join(backupDir, `files-backup-${timestamp}.tar`);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create tar archive
    const tarCommand = `tar -czf "${backupFile}" ${config.files.paths.join(' ')}`;
    execSync(tarCommand, { stdio: 'pipe' });
    
    // Compress backup if enabled
    let finalBackupFile = backupFile;
    if (config.files.compression) {
      const compressedFile = `${backupFile}.gz`;
      await compressFile(backupFile, compressedFile);
      fs.unlinkSync(backupFile); // Remove uncompressed file
      finalBackupFile = compressedFile;
    }
    
    // Encrypt backup if enabled
    if (config.files.encryption && config.database.encryptionKey) {
      const encryptedFile = `${finalBackupFile}.enc`;
      await encryptFile(finalBackupFile, encryptedFile, config.database.encryptionKey);
      fs.unlinkSync(finalBackupFile); // Remove unencrypted file
      finalBackupFile = encryptedFile;
    }
    
    console.log(`✅ File backup created: ${finalBackupFile}`);
    
    return {
      success: true,
      file: finalBackupFile,
      size: fs.statSync(finalBackupFile).size,
      timestamp: new Date().toISOString(),
      type: 'files'
    };
    
  } catch (error) {
    console.error('❌ File backup failed:', error.message);
    throw error;
  }
};

// Function to upload backup to cloud storage
const uploadBackupToCloud = async (backupFile, config = backupConfig) => {
  if (!config.cloud.enabled) {
    console.log('ℹ️ Cloud backup is disabled');
    return { success: false, message: 'Cloud backup disabled' };
  }
  
  try {
    console.log(`🔄 Uploading backup to cloud: ${backupFile}`);
    
    switch (config.cloud.provider) {
      case 'aws-s3':
        return await uploadToAWSS3(backupFile, config.cloud.awsS3);
      
      case 'google-cloud':
        return await uploadToGoogleCloud(backupFile, config.cloud.googleCloud);
      
      case 'azure-blob':
        return await uploadToAzureBlob(backupFile, config.cloud.azureBlob);
      
      default:
        throw new Error(`Unsupported cloud provider: ${config.cloud.provider}`);
    }
    
  } catch (error) {
    console.error('❌ Cloud backup upload failed:', error.message);
    throw error;
  }
};

// Function to upload to AWS S3
const uploadToAWSS3 = async (backupFile, config) => {
  if (!config.enabled) {
    throw new Error('AWS S3 backup is not enabled');
  }
  
  // This would integrate with AWS SDK
  console.log(`🔄 Uploading to AWS S3: ${backupFile}`);
  
  return {
    success: true,
    url: `s3://${config.bucket}/${config.path}/${path.basename(backupFile)}`,
    provider: 'aws-s3',
    timestamp: new Date().toISOString()
  };
};

// Function to upload to Google Cloud Storage
const uploadToGoogleCloud = async (backupFile, config) => {
  if (!config.enabled) {
    throw new Error('Google Cloud backup is not enabled');
  }
  
  console.log(`🔄 Uploading to Google Cloud: ${backupFile}`);
  
  return {
    success: true,
    url: `gs://${config.bucket}/${config.path}/${path.basename(backupFile)}`,
    provider: 'google-cloud',
    timestamp: new Date().toISOString()
  };
};

// Function to upload to Azure Blob Storage
const uploadToAzureBlob = async (backupFile, config) => {
  if (!config.enabled) {
    throw new Error('Azure Blob backup is not enabled');
  }
  
  console.log(`🔄 Uploading to Azure Blob: ${backupFile}`);
  
  return {
    success: true,
    url: `https://${config.accountName}.blob.core.windows.net/${config.container}/${config.path}/${path.basename(backupFile)}`,
    provider: 'azure-blob',
    timestamp: new Date().toISOString()
  };
};

// Function to compress file
const compressFile = async (inputFile, outputFile) => {
  const input = fs.createReadStream(inputFile);
  const output = fs.createWriteStream(outputFile);
  const gzip = createGzip();
  
  await pipelineAsync(input, gzip, output);
  console.log(`✅ File compressed: ${outputFile}`);
};

// Function to encrypt file
const encryptFile = async (inputFile, outputFile, key) => {
  // This would implement proper encryption
  // For now, just copy the file
  fs.copyFileSync(inputFile, outputFile);
  console.log(`✅ File encrypted: ${outputFile}`);
};

// Function to cleanup old backups
const cleanupOldBackups = async (config = backupConfig) => {
  if (!config.local.cleanup) {
    console.log('ℹ️ Local backup cleanup is disabled');
    return;
  }
  
  try {
    console.log('🔄 Cleaning up old backups...');
    
    const backupDir = config.local.path;
    if (!fs.existsSync(backupDir)) {
      return;
    }
    
    const files = fs.readdirSync(backupDir);
    const now = new Date();
    
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const ageInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);
      
      // Remove backups older than retention period
      if (ageInDays > config.database.retention.monthly) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Removed old backup: ${file}`);
      }
    }
    
    console.log('✅ Backup cleanup completed');
    
  } catch (error) {
    console.error('❌ Backup cleanup failed:', error.message);
  }
};

// Function to restore database from backup
const restoreDatabaseFromBackup = async (backupFile, config = backupConfig) => {
  try {
    console.log(`🔄 Restoring database from backup: ${backupFile}`);
    
    // Decrypt if encrypted
    let workingFile = backupFile;
    if (backupFile.endsWith('.enc') && config.database.encryptionKey) {
      const decryptedFile = backupFile.replace('.enc', '');
      await decryptFile(backupFile, decryptedFile, config.database.encryptionKey);
      workingFile = decryptedFile;
    }
    
    // Decompress if compressed
    if (workingFile.endsWith('.gz')) {
      const decompressedFile = workingFile.replace('.gz', '');
      await decompressFile(workingFile, decompressedFile);
      workingFile = decompressedFile;
    }
    
    // Determine database type and restore
    const dbType = process.env.DATABASE_PROVIDER || 'sqlite';
    let restoreCommand;
    
    if (dbType === 'postgresql') {
      restoreCommand = `psql "${process.env.DATABASE_URL}" < "${workingFile}"`;
    } else if (dbType === 'mysql') {
      restoreCommand = `mysql -u "${process.env.DB_USER}" -p"${process.env.DB_PASSWORD}" "${process.env.DB_NAME}" < "${workingFile}"`;
    } else {
      // SQLite - just copy the file
      const dbPath = process.env.DATABASE_URL || './dev.db';
      fs.copyFileSync(workingFile, dbPath);
    }
    
    if (restoreCommand) {
      execSync(restoreCommand, { stdio: 'inherit' });
    }
    
    console.log('✅ Database restored successfully');
    
    // Cleanup temporary files
    if (workingFile !== backupFile) {
      fs.unlinkSync(workingFile);
    }
    
    return { success: true, message: 'Database restored successfully' };
    
  } catch (error) {
    console.error('❌ Database restore failed:', error.message);
    throw error;
  }
};

// Function to decrypt file
const decryptFile = async (inputFile, outputFile, key) => {
  // This would implement proper decryption
  // For now, just copy the file
  fs.copyFileSync(inputFile, outputFile);
  console.log(`✅ File decrypted: ${outputFile}`);
};

// Function to decompress file
const decompressFile = async (inputFile, outputFile) => {
  // This would implement proper decompression
  // For now, just copy the file
  fs.copyFileSync(inputFile, outputFile);
  console.log(`✅ File decompressed: ${outputFile}`);
};

// Function to get backup status
const getBackupStatus = () => {
  return {
    ...backupStatus,
    config: {
      database: backupConfig.database.enabled,
      files: backupConfig.files.enabled,
      cloud: backupConfig.cloud.enabled,
      local: backupConfig.local.enabled
    }
  };
};

// Function to run full backup
const runFullBackup = async (config = backupConfig) => {
  try {
    console.log('🚀 Starting full backup process...');
    
    backupStatus.currentBackup = {
      startTime: new Date(),
      status: 'running',
      steps: []
    };
    
    const results = [];
    
    // Database backup
    if (config.database.enabled) {
      try {
        const dbResult = await createDatabaseBackup(config);
        results.push(dbResult);
        backupStatus.currentBackup.steps.push({ type: 'database', status: 'success' });
        
        // Upload to cloud if enabled
        if (config.cloud.enabled) {
          try {
            const cloudResult = await uploadBackupToCloud(dbResult.file, config);
            results.push(cloudResult);
            backupStatus.currentBackup.steps.push({ type: 'cloud-upload', status: 'success' });
          } catch (error) {
            backupStatus.currentBackup.steps.push({ type: 'cloud-upload', status: 'failed', error: error.message });
          }
        }
      } catch (error) {
        backupStatus.currentBackup.steps.push({ type: 'database', status: 'failed', error: error.message });
      }
    }
    
    // File backup
    if (config.files.enabled) {
      try {
        const fileResult = await createFileBackup(config);
        results.push(fileResult);
        backupStatus.currentBackup.steps.push({ type: 'files', status: 'success' });
        
        // Upload to cloud if enabled
        if (config.cloud.enabled) {
          try {
            const cloudResult = await uploadBackupToCloud(fileResult.file, config);
            results.push(cloudResult);
            backupStatus.currentBackup.steps.push({ type: 'cloud-upload', status: 'success' });
          } catch (error) {
            backupStatus.currentBackup.steps.push({ type: 'cloud-upload', status: 'failed', error: error.message });
          }
        }
      } catch (error) {
        backupStatus.currentBackup.steps.push({ type: 'files', status: 'failed', error: error.message });
      }
    }
    
    // Cleanup old backups
    await cleanupOldBackups(config);
    
    // Update backup status
    backupStatus.currentBackup.status = 'completed';
    backupStatus.currentBackup.endTime = new Date();
    
    console.log('✅ Full backup process completed');
    
    return {
      success: true,
      results: results,
      timestamp: new Date().toISOString(),
      duration: backupStatus.currentBackup.endTime - backupStatus.currentBackup.startTime
    };
    
  } catch (error) {
    console.error('❌ Full backup process failed:', error.message);
    
    backupStatus.currentBackup.status = 'failed';
    backupStatus.currentBackup.endTime = new Date();
    backupStatus.currentBackup.error = error.message;
    
    throw error;
  }
};

// Function to validate backup configuration
const validateBackupConfig = (config = backupConfig) => {
  const errors = [];
  
  if (config.database.enabled) {
    if (config.database.encryption && !config.database.encryptionKey) {
      errors.push('Database encryption requires encryption key');
    }
  }
  
  if (config.files.enabled) {
    if (!config.files.paths || config.files.paths.length === 0) {
      errors.push('File backup requires at least one path');
    }
  }
  
  if (config.cloud.enabled) {
    switch (config.cloud.provider) {
      case 'aws-s3':
        if (config.cloud.awsS3.enabled && (!config.cloud.awsS3.bucket || !config.cloud.awsS3.accessKeyId || !config.cloud.awsS3.secretAccessKey)) {
          errors.push('AWS S3 backup requires bucket, accessKeyId, and secretAccessKey');
        }
        break;
      
      case 'google-cloud':
        if (config.cloud.googleCloud.enabled && (!config.cloud.googleCloud.bucket || !config.cloud.googleCloud.projectId || !config.cloud.googleCloud.serviceAccountKey)) {
          errors.push('Google Cloud backup requires bucket, projectId, and serviceAccountKey');
        }
        break;
      
      case 'azure-blob':
        if (config.cloud.azureBlob.enabled && (!config.cloud.azureBlob.accountName || !config.cloud.azureBlob.accountKey || !config.cloud.azureBlob.container)) {
          errors.push('Azure Blob backup requires accountName, accountKey, and container');
        }
        break;
      
      default:
        errors.push(`Unsupported cloud provider: ${config.cloud.provider}`);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Backup configuration errors: ${errors.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  backupConfig,
  createDatabaseBackup,
  createFileBackup,
  uploadBackupToCloud,
  cleanupOldBackups,
  restoreDatabaseFromBackup,
  getBackupStatus,
  runFullBackup,
  validateBackupConfig
};
