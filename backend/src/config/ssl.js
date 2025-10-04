// File: fpl-hub-backend/src/config/ssl.js
// SSL/HTTPS configuration for production deployment

const fs = require('fs');
const path = require('path');

// SSL configuration options
const sslConfig = {
  // Production SSL settings
  production: {
    // Let's Encrypt certificates (recommended for production)
    letsEncrypt: {
      enabled: process.env.LETS_ENCRYPT_ENABLED === 'true',
      domain: process.env.DOMAIN_NAME,
      email: process.env.LETS_ENCRYPT_EMAIL,
      staging: process.env.LETS_ENCRYPT_STAGING === 'true', // Use staging for testing
      renewBeforeExpiry: 30 * 24 * 60 * 60 * 1000, // 30 days
      certPath: process.env.LETS_ENCRYPT_CERT_PATH || '/etc/letsencrypt/live',
      keyPath: process.env.LETS_ENCRYPT_KEY_PATH || '/etc/letsencrypt/live'
    },
    
    // Manual SSL certificates
    manual: {
      enabled: process.env.MANUAL_SSL_ENABLED === 'true',
      certPath: process.env.SSL_CERT_PATH,
      keyPath: process.env.SSL_KEY_PATH,
      caPath: process.env.SSL_CA_PATH // Optional: Certificate Authority chain
    },
    
    // SSL options
    options: {
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: [
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305'
      ].join(':'),
      honorCipherOrder: true,
      requestCert: false,
      rejectUnauthorized: false // Allow self-signed certificates in development
    }
  },
  
  // Development SSL settings
  development: {
    selfSigned: {
      enabled: process.env.SELF_SIGNED_SSL === 'true',
      keyPath: path.join(__dirname, '../../certs/dev-key.pem'),
      certPath: path.join(__dirname, '../../certs/dev-cert.pem'),
      days: 365,
      commonName: 'localhost'
    }
  }
};

// Function to get SSL credentials based on environment
const getSSLCredentials = (env = process.env.NODE_ENV) => {
  if (env === 'production') {
    // Check Let's Encrypt first
    if (sslConfig.production.letsEncrypt.enabled) {
      const domain = sslConfig.production.letsEncrypt.domain;
      const certPath = path.join(sslConfig.production.letsEncrypt.certPath, domain);
      
      try {
        return {
          key: fs.readFileSync(path.join(certPath, 'privkey.pem')),
          cert: fs.readFileSync(path.join(certPath, 'fullchain.pem')),
          source: 'letsencrypt'
        };
      } catch (error) {
        console.warn('Let\'s Encrypt certificates not found, falling back to manual SSL');
      }
    }
    
    // Fallback to manual SSL
    if (sslConfig.production.manual.enabled) {
      try {
        const credentials = {
          key: fs.readFileSync(sslConfig.production.manual.keyPath),
          cert: fs.readFileSync(sslConfig.production.manual.certPath),
          source: 'manual'
        };
        
        // Add CA if provided
        if (sslConfig.production.manual.caPath) {
          credentials.ca = fs.readFileSync(sslConfig.production.manual.caPath);
        }
        
        return credentials;
      } catch (error) {
        throw new Error(`Manual SSL certificates not found: ${error.message}`);
      }
    }
    
    throw new Error('No SSL certificates configured for production');
  }
  
  // Development: self-signed certificates
  if (env === 'development' && sslConfig.development.selfSigned.enabled) {
    try {
      return {
        key: fs.readFileSync(sslConfig.development.selfSigned.keyPath),
        cert: fs.readFileSync(sslConfig.development.selfSigned.certPath),
        source: 'self-signed'
      };
    } catch (error) {
      console.warn('Self-signed certificates not found, generating new ones...');
      return generateSelfSignedCertificates();
    }
  }
  
  return null;
};

// Function to generate self-signed certificates for development
const generateSelfSignedCertificates = () => {
  const { execSync } = require('child_process');
  const certsDir = path.join(__dirname, '../../certs');
  
  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }
  
  try {
    // Generate private key
    execSync(`openssl genrsa -out "${path.join(certsDir, 'dev-key.pem')}" 2048`, { stdio: 'pipe' });
    
    // Generate certificate signing request
    execSync(`openssl req -new -key "${path.join(certsDir, 'dev-key.pem')}" -out "${path.join(certsDir, 'dev-csr.pem')}" -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, { stdio: 'pipe' });
    
    // Generate self-signed certificate
    execSync(`openssl x509 -req -in "${path.join(certsDir, 'dev-csr.pem')}" -signkey "${path.join(certsDir, 'dev-key.pem')}" -out "${path.join(certsDir, 'dev-cert.pem')}" -days 365`, { stdio: 'pipe' });
    
    // Clean up CSR
    fs.unlinkSync(path.join(certsDir, 'dev-csr.pem'));
    
    console.log('✅ Self-signed certificates generated successfully');
    
    return {
      key: fs.readFileSync(path.join(certsDir, 'dev-key.pem')),
      cert: fs.readFileSync(path.join(certsDir, 'dev-cert.pem')),
      source: 'self-signed'
    };
  } catch (error) {
    console.error('❌ Failed to generate self-signed certificates:', error.message);
    console.log('💡 Install OpenSSL or use HTTP in development mode');
    return null;
  }
};

// Function to validate SSL configuration
const validateSSLConfig = () => {
  const env = process.env.NODE_ENV;
  
  if (env === 'production') {
    if (!process.env.DOMAIN_NAME) {
      throw new Error('DOMAIN_NAME environment variable is required for production SSL');
    }
    
    if (sslConfig.production.letsEncrypt.enabled) {
      if (!process.env.LETS_ENCRYPT_EMAIL) {
        throw new Error('LETS_ENCRYPT_EMAIL environment variable is required for Let\'s Encrypt');
      }
    } else if (sslConfig.production.manual.enabled) {
      if (!process.env.SSL_CERT_PATH || !process.env.SSL_KEY_PATH) {
        throw new Error('SSL_CERT_PATH and SSL_KEY_PATH environment variables are required for manual SSL');
      }
    } else {
      throw new Error('SSL must be enabled for production (either Let\'s Encrypt or manual)');
    }
  }
  
  return true;
};

module.exports = {
  sslConfig,
  getSSLCredentials,
  generateSelfSignedCertificates,
  validateSSLConfig
};
