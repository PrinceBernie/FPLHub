// File: fpl-hub-backend/src/config/cdn.js
// CDN configuration for production deployment

const path = require('path');
const fs = require('fs');

// CDN configuration
const cdnConfig = {
  // CDN provider selection
  provider: process.env.CDN_PROVIDER || 'none', // aws-cloudfront, cloudflare, azure-cdn, google-cdn, none
  
  // AWS CloudFront configuration
  awsCloudFront: {
    enabled: process.env.AWS_CLOUDFRONT_ENABLED === 'true',
    distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
    domainName: process.env.AWS_CLOUDFRONT_DOMAIN_NAME,
    region: process.env.AWS_CLOUDFRONT_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET,
    s3Region: process.env.AWS_S3_REGION || 'us-east-1',
    cachePolicy: {
      ttl: parseInt(process.env.AWS_CLOUDFRONT_CACHE_TTL) || 86400, // 24 hours
      minTtl: parseInt(process.env.AWS_CLOUDFRONT_MIN_TTL) || 0,
      maxTtl: parseInt(process.env.AWS_CLOUDFRONT_MAX_TTL) || 31536000, // 1 year
      defaultTtl: parseInt(process.env.AWS_CLOUDFRONT_DEFAULT_TTL) || 86400
    }
  },
  
  // Cloudflare configuration
  cloudflare: {
    enabled: process.env.CLOUDFLARE_ENABLED === 'true',
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    domain: process.env.CLOUDFLARE_DOMAIN,
    cacheLevel: process.env.CLOUDFLARE_CACHE_LEVEL || 'aggressive',
    minify: {
      css: process.env.CLOUDFLARE_MINIFY_CSS === 'true',
      js: process.env.CLOUDFLARE_MINIFY_JS === 'true',
      html: process.env.CLOUDFLARE_MINIFY_HTML === 'true'
    },
    rocketLoader: process.env.CLOUDFLARE_ROCKET_LOADER === 'true',
    autoMinify: process.env.CLOUDFLARE_AUTO_MINIFY === 'true'
  },
  
  // Azure CDN configuration
  azureCdn: {
    enabled: process.env.AZURE_CDN_ENABLED === 'true',
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    resourceGroup: process.env.AZURE_RESOURCE_GROUP,
    profileName: process.env.AZURE_CDN_PROFILE_NAME,
    endpointName: process.env.AZURE_CDN_ENDPOINT_NAME,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID,
    storageAccount: process.env.AZURE_STORAGE_ACCOUNT,
    storageKey: process.env.AZURE_STORAGE_KEY
  },
  
  // Google Cloud CDN configuration
  googleCdn: {
    enabled: process.env.GOOGLE_CDN_ENABLED === 'true',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME,
    serviceAccountKey: process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY,
    loadBalancerName: process.env.GOOGLE_CLOUD_LOAD_BALANCER_NAME,
    backendBucketName: process.env.GOOGLE_CLOUD_BACKEND_BUCKET_NAME
  },
  
  // Asset optimization
  assets: {
    // Static assets to be served via CDN
    static: {
      enabled: process.env.CDN_STATIC_ASSETS === 'true',
      paths: [
        '/public/css',
        '/public/js',
        '/public/images',
        '/public/fonts',
        '/public/icons'
      ],
      cacheControl: process.env.CDN_STATIC_CACHE_CONTROL || 'public, max-age=31536000, immutable',
      compression: process.env.CDN_STATIC_COMPRESSION === 'true',
      minification: process.env.CDN_STATIC_MINIFICATION === 'true'
    },
    
    // API responses caching
    api: {
      enabled: process.env.CDN_API_CACHING === 'true',
      endpoints: [
        '/api/fpl/teams',
        '/api/fpl/players',
        '/api/fpl/gameweeks',
        '/api/leagues/public'
      ],
      cacheControl: process.env.CDN_API_CACHE_CONTROL || 'public, max-age=3600, s-maxage=3600',
      vary: process.env.CDN_API_VARY || 'Accept-Encoding, Accept-Language',
      maxAge: parseInt(process.env.CDN_API_MAX_AGE) || 3600
    },
    
    // Media files
    media: {
      enabled: process.env.CDN_MEDIA_CACHING === 'true',
      formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'],
      cacheControl: process.env.CDN_MEDIA_CACHE_CONTROL || 'public, max-age=604800, s-maxage=604800',
      optimization: {
        enabled: process.env.CDN_MEDIA_OPTIMIZATION === 'true',
        quality: parseInt(process.env.CDN_MEDIA_QUALITY) || 85,
        formats: ['webp', 'avif'],
        responsive: process.env.CDN_MEDIA_RESPONSIVE === 'true'
      }
    }
  },
  
  // Cache invalidation
  invalidation: {
    enabled: process.env.CDN_INVALIDATION_ENABLED === 'true',
    automatic: process.env.CDN_AUTOMATIC_INVALIDATION === 'true',
    patterns: [
      '/api/leagues/*/standings',
      '/api/fpl/*/live',
      '/api/user/*/profile'
    ],
    batchSize: parseInt(process.env.CDN_INVALIDATION_BATCH_SIZE) || 100,
    delay: parseInt(process.env.CDN_INVALIDATION_DELAY) || 5000
  },
  
  // Monitoring and analytics
  monitoring: {
    enabled: process.env.CDN_MONITORING_ENABLED === 'true',
    metrics: [
      'hit_rate',
      'miss_rate',
      'bandwidth',
      'requests',
      'errors',
      'latency'
    ],
    alerts: {
      enabled: process.env.CDN_ALERTS_ENABLED === 'true',
      hitRateThreshold: parseFloat(process.env.CDN_HIT_RATE_THRESHOLD) || 0.8,
      errorRateThreshold: parseFloat(process.env.CDN_ERROR_RATE_THRESHOLD) || 0.05,
      latencyThreshold: parseInt(process.env.CDN_LATENCY_THRESHOLD) || 1000
    }
  }
};

// Function to get CDN URL for assets
const getCDNUrl = (assetPath, config = cdnConfig) => {
  if (!config.provider || config.provider === 'none') {
    return assetPath; // No CDN, return original path
  }
  
  const baseUrl = getCDNBaseUrl(config);
  if (!baseUrl) {
    return assetPath;
  }
  
  // Remove leading slash if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${baseUrl}/${cleanPath}`;
};

// Function to get CDN base URL
const getCDNBaseUrl = (config = cdnConfig) => {
  switch (config.provider) {
    case 'aws-cloudfront':
      return config.awsCloudFront.enabled ? config.awsCloudFront.domainName : null;
    
    case 'cloudflare':
      return config.cloudflare.enabled ? `https://${config.cloudflare.domain}` : null;
    
    case 'azure-cdn':
      return config.azureCdn.enabled ? `https://${config.azureCdn.endpointName}.azureedge.net` : null;
    
    case 'google-cdn':
      return config.googleCdn.enabled ? `https://storage.googleapis.com/${config.googleCdn.bucketName}` : null;
    
    default:
      return null;
  }
};

// Function to upload assets to CDN
const uploadToCDN = async (filePath, config = cdnConfig) => {
  try {
    switch (config.provider) {
      case 'aws-cloudfront':
        return await uploadToAWSCloudFront(filePath, config.awsCloudFront);
      
      case 'cloudflare':
        return await uploadToCloudflare(filePath, config.cloudflare);
      
      case 'azure-cdn':
        return await uploadToAzureCDN(filePath, config.azureCdn);
      
      case 'google-cdn':
        return await uploadToGoogleCDN(filePath, config.googleCdn);
      
      default:
        throw new Error(`Unsupported CDN provider: ${config.provider}`);
    }
  } catch (error) {
    console.error(`❌ Failed to upload ${filePath} to CDN:`, error.message);
    throw error;
  }
};

// Function to upload to AWS CloudFront
const uploadToAWSCloudFront = async (filePath, config) => {
  if (!config.enabled) {
    throw new Error('AWS CloudFront is not enabled');
  }
  
  // This would integrate with AWS SDK
  // For now, return a mock response
  console.log(`🔄 Uploading ${filePath} to AWS CloudFront...`);
  
  return {
    success: true,
    url: `https://${config.domainName}/${path.basename(filePath)}`,
    provider: 'aws-cloudfront',
    timestamp: new Date().toISOString()
  };
};

// Function to upload to Cloudflare
const uploadToCloudflare = async (filePath, config) => {
  if (!config.enabled) {
    throw new Error('Cloudflare is not enabled');
  }
  
  console.log(`🔄 Uploading ${filePath} to Cloudflare...`);
  
  return {
    success: true,
    url: `https://${config.domain}/${path.basename(filePath)}`,
    provider: 'cloudflare',
    timestamp: new Date().toISOString()
  };
};

// Function to upload to Azure CDN
const uploadToAzureCDN = async (filePath, config) => {
  if (!config.enabled) {
    throw new Error('Azure CDN is not enabled');
  }
  
  console.log(`🔄 Uploading ${filePath} to Azure CDN...`);
  
  return {
    success: true,
    url: `https://${config.endpointName}.azureedge.net/${path.basename(filePath)}`,
    provider: 'azure-cdn',
    timestamp: new Date().toISOString()
  };
};

// Function to upload to Google CDN
const uploadToGoogleCDN = async (filePath, config) => {
  if (!config.enabled) {
    throw new Error('Google CDN is not enabled');
  }
  
  console.log(`🔄 Uploading ${filePath} to Google CDN...`);
  
  return {
    success: true,
    url: `https://storage.googleapis.com/${config.bucketName}/${path.basename(filePath)}`,
    provider: 'google-cdn',
    timestamp: new Date().toISOString()
  };
};

// Function to invalidate CDN cache
const invalidateCDNCache = async (paths, config = cdnConfig) => {
  if (!config.invalidation.enabled) {
    console.log('ℹ️ CDN cache invalidation is disabled');
    return { success: true, message: 'CDN cache invalidation disabled' };
  }
  
  try {
    switch (config.provider) {
      case 'aws-cloudfront':
        return await invalidateAWSCloudFront(paths, config.awsCloudFront);
      
      case 'cloudflare':
        return await invalidateCloudflare(paths, config.cloudflare);
      
      case 'azure-cdn':
        return await invalidateAzureCDN(paths, config.azureCdn);
      
      case 'google-cdn':
        return await invalidateGoogleCDN(paths, config.googleCdn);
      
      default:
        throw new Error(`Unsupported CDN provider: ${config.provider}`);
    }
  } catch (error) {
    console.error('❌ CDN cache invalidation failed:', error.message);
    throw error;
  }
};

// Function to invalidate AWS CloudFront cache
const invalidateAWSCloudFront = async (paths, config) => {
  console.log(`🔄 Invalidating AWS CloudFront cache for ${paths.length} paths...`);
  
  // This would integrate with AWS SDK
  return {
    success: true,
    invalidationId: `INV-${Date.now()}`,
    paths: paths,
    provider: 'aws-cloudfront',
    timestamp: new Date().toISOString()
  };
};

// Function to invalidate Cloudflare cache
const invalidateCloudflare = async (paths, config) => {
  console.log(`🔄 Invalidating Cloudflare cache for ${paths.length} paths...`);
  
  return {
    success: true,
    paths: paths,
    provider: 'cloudflare',
    timestamp: new Date().toISOString()
  };
};

// Function to invalidate Azure CDN cache
const invalidateAzureCDN = async (paths, config) => {
  console.log(`🔄 Invalidating Azure CDN cache for ${paths.length} paths...`);
  
  return {
    success: true,
    paths: paths,
    provider: 'azure-cdn',
    timestamp: new Date().toISOString()
  };
};

// Function to invalidate Google CDN cache
const invalidateGoogleCDN = async (paths, config) => {
  console.log(`🔄 Invalidating Google CDN cache for ${paths.length} paths...`);
  
  return {
    success: true,
    paths: paths,
    provider: 'google-cdn',
    timestamp: new Date().toISOString()
  };
};

// Function to get CDN health status
const getCDNHealth = async (config = cdnConfig) => {
  const health = {
    provider: config.provider,
    enabled: config.provider !== 'none',
    status: 'unknown',
    baseUrl: getCDNBaseUrl(config),
    assets: {
      static: config.assets.static.enabled,
      api: config.assets.api.enabled,
      media: config.assets.media.enabled
    },
    invalidation: config.invalidation.enabled,
    monitoring: config.monitoring.enabled
  };
  
  if (!health.enabled) {
    health.status = 'disabled';
    return health;
  }
  
  try {
    // Test CDN connectivity
    const testUrl = `${health.baseUrl}/health`;
    const response = await fetch(testUrl, { method: 'HEAD' });
    
    if (response.ok) {
      health.status = 'healthy';
    } else {
      health.status = 'unhealthy';
      health.error = `HTTP ${response.status}`;
    }
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }
  
  return health;
};

// Function to validate CDN configuration
const validateCDNConfig = (config = cdnConfig) => {
  const errors = [];
  
  if (config.provider !== 'none') {
    switch (config.provider) {
      case 'aws-cloudfront':
        if (config.awsCloudFront.enabled) {
          if (!config.awsCloudFront.distributionId || !config.awsCloudFront.domainName) {
            errors.push('AWS CloudFront requires distributionId and domainName');
          }
        }
        break;
      
      case 'cloudflare':
        if (config.cloudflare.enabled) {
          if (!config.cloudflare.zoneId || !config.cloudflare.apiToken || !config.cloudflare.domain) {
            errors.push('Cloudflare requires zoneId, apiToken, and domain');
          }
        }
        break;
      
      case 'azure-cdn':
        if (config.azureCdn.enabled) {
          if (!config.azureCdn.subscriptionId || !config.azureCdn.resourceGroup) {
            errors.push('Azure CDN requires subscriptionId and resourceGroup');
          }
        }
        break;
      
      case 'google-cdn':
        if (config.googleCdn.enabled) {
          if (!config.googleCdn.projectId || !config.googleCdn.bucketName) {
            errors.push('Google CDN requires projectId and bucketName');
          }
        }
        break;
      
      default:
        errors.push(`Unsupported CDN provider: ${config.provider}`);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`CDN configuration errors: ${errors.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  cdnConfig,
  getCDNUrl,
  getCDNBaseUrl,
  uploadToCDN,
  invalidateCDNCache,
  getCDNHealth,
  validateCDNConfig
};
