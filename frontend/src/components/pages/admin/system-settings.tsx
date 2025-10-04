import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  Shield, 
  Mail, 
  Database,
  Server,
  Bell,
  CreditCard,
  Users,
  Trophy,
  Zap,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/api';

interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    adminEmail: string;
    supportEmail: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
  };
  security: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    twoFactorRequired: boolean;
    ipWhitelist: string[];
    rateLimitingEnabled: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
    emailTemplates: {
      welcome: string;
      verification: string;
      passwordReset: string;
      leagueInvite: string;
    };
  };
  payment: {
    paymentMethods: string[];
    defaultCurrency: string;
    platformFeePercentage: number;
    minimumDeposit: number;
    maximumDeposit: number;
    minimumWithdrawal: number;
    maximumWithdrawal: number;
    withdrawalProcessingTime: number;
    autoApproveWithdrawals: boolean;
    paymentGatewaySettings: {
      provider: string;
      apiKey: string;
      secretKey: string;
      webhookSecret: string;
      testMode: boolean;
    };
  };
  league: {
    maxTeamsPerUser: number;
    maxLeaguesPerUser: number;
    defaultLeagueSize: number;
    maximumLeagueSize: number;
    minimumEntryFee: number;
    maximumEntryFee: number;
    leagueCreationCooldown: number;
    autoStartLeagues: boolean;
    allowPrivateLeagues: boolean;
    defaultPrizeDistribution: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    notificationTypes: {
      leagueUpdates: boolean;
      paymentUpdates: boolean;
      systemUpdates: boolean;
      promotionalEmails: boolean;
    };
  };
  performance: {
    cacheEnabled: boolean;
    cacheTtl: number;
    imageOptimization: boolean;
    cdnEnabled: boolean;
    cdnUrl: string;
    databaseOptimization: boolean;
    apiRateLimit: number;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
}

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getSystemSettings?.() || getDefaultSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load system settings:', error);
      toast.error('Failed to load system settings');
      setSettings(getDefaultSettings());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultSettings = (): SystemSettings => ({
    general: {
      siteName: 'FPL Hub',
      siteDescription: 'Fantasy Premier League Management Platform',
      siteUrl: 'https://fplhub.com',
      adminEmail: 'admin@fplhub.com',
      supportEmail: 'support@fplhub.com',
      timezone: 'Africa/Accra',
      language: 'en',
      maintenanceMode: false,
      registrationEnabled: true,
      emailVerificationRequired: true
    },
    security: {
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSymbols: false,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      twoFactorRequired: false,
      ipWhitelist: [],
      rateLimitingEnabled: true,
      rateLimitRequests: 100,
      rateLimitWindow: 15
    },
    email: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      smtpSecure: true,
      fromEmail: 'noreply@fplhub.com',
      fromName: 'FPL Hub',
      emailTemplates: {
        welcome: 'Welcome to FPL Hub!',
        verification: 'Please verify your email address',
        passwordReset: 'Reset your password',
        leagueInvite: 'You have been invited to join a league'
      }
    },
    payment: {
      paymentMethods: ['mobile_money', 'bank_transfer', 'card'],
      defaultCurrency: 'GHS',
      platformFeePercentage: 5,
      minimumDeposit: 1,
      maximumDeposit: 10000,
      minimumWithdrawal: 5,
      maximumWithdrawal: 5000,
      withdrawalProcessingTime: 24,
      autoApproveWithdrawals: false,
      paymentGatewaySettings: {
        provider: 'paystack',
        apiKey: '',
        secretKey: '',
        webhookSecret: '',
        testMode: true
      }
    },
    league: {
      maxTeamsPerUser: 10,
      maxLeaguesPerUser: 50,
      defaultLeagueSize: 20,
      maximumLeagueSize: 100,
      minimumEntryFee: 0,
      maximumEntryFee: 1000,
      leagueCreationCooldown: 0,
      autoStartLeagues: false,
      allowPrivateLeagues: true,
      defaultPrizeDistribution: 'TOP_3'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      notificationTypes: {
        leagueUpdates: true,
        paymentUpdates: true,
        systemUpdates: true,
        promotionalEmails: false
      }
    },
    performance: {
      cacheEnabled: true,
      cacheTtl: 300,
      imageOptimization: true,
      cdnEnabled: false,
      cdnUrl: '',
      databaseOptimization: true,
      apiRateLimit: 1000,
      maxFileSize: 5242880,
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf']
    }
  });

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setIsSaving(true);
      await apiClient.updateSystemSettings?.(settings);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (section: keyof SystemSettings, field: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value
      }
    });
  };

  const handleNestedSettingChange = (section: keyof SystemSettings, subSection: string, field: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [subSection]: {
          ...(settings[section] as any)[subSection],
          [field]: value
        }
      }
    });
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground">No settings data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-500" />
            System Settings
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure platform settings, security, and system preferences
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadSettings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full justify-between h-10">
          <TabsTrigger value="general" className="text-xs font-medium flex-1">General</TabsTrigger>
          <TabsTrigger value="security" className="text-xs font-medium flex-1">Security</TabsTrigger>
          <TabsTrigger value="email" className="text-xs font-medium flex-1">Email</TabsTrigger>
          <TabsTrigger value="payment" className="text-xs font-medium flex-1">Payment</TabsTrigger>
          <TabsTrigger value="league" className="text-xs font-medium flex-1">League</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs font-medium flex-1">Notifications</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs font-medium flex-1">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={settings.general.siteUrl}
                    onChange={(e) => handleSettingChange('general', 'siteUrl', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={settings.general.siteDescription}
                  onChange={(e) => handleSettingChange('general', 'siteDescription', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={settings.general.adminEmail}
                    onChange={(e) => handleSettingChange('general', 'adminEmail', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => handleSettingChange('general', 'supportEmail', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.general.timezone} onValueChange={(value) => handleSettingChange('general', 'timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Accra">Africa/Accra</SelectItem>
                      <SelectItem value="Africa/Lagos">Africa/Lagos</SelectItem>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={settings.general.language} onValueChange={(value) => handleSettingChange('general', 'language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Enable maintenance mode to restrict access</p>
                  </div>
                  <Switch
                    checked={settings.general.maintenanceMode}
                    onCheckedChange={(checked) => handleSettingChange('general', 'maintenanceMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Registration Enabled</Label>
                    <p className="text-sm text-muted-foreground">Allow new user registrations</p>
                  </div>
                  <Switch
                    checked={settings.general.registrationEnabled}
                    onCheckedChange={(checked) => handleSettingChange('general', 'registrationEnabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Verification Required</Label>
                    <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
                  </div>
                  <Switch
                    checked={settings.general.emailVerificationRequired}
                    onCheckedChange={(checked) => handleSettingChange('general', 'emailVerificationRequired', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
                    min="6"
                    max="32"
                  />
                </div>
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    min="1"
                    max="168"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Uppercase</Label>
                    <p className="text-sm text-muted-foreground">Passwords must contain uppercase letters</p>
                  </div>
                  <Switch
                    checked={settings.security.passwordRequireUppercase}
                    onCheckedChange={(checked) => handleSettingChange('security', 'passwordRequireUppercase', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Lowercase</Label>
                    <p className="text-sm text-muted-foreground">Passwords must contain lowercase letters</p>
                  </div>
                  <Switch
                    checked={settings.security.passwordRequireLowercase}
                    onCheckedChange={(checked) => handleSettingChange('security', 'passwordRequireLowercase', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Numbers</Label>
                    <p className="text-sm text-muted-foreground">Passwords must contain numbers</p>
                  </div>
                  <Switch
                    checked={settings.security.passwordRequireNumbers}
                    onCheckedChange={(checked) => handleSettingChange('security', 'passwordRequireNumbers', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Symbols</Label>
                    <p className="text-sm text-muted-foreground">Passwords must contain special characters</p>
                  </div>
                  <Switch
                    checked={settings.security.passwordRequireSymbols}
                    onCheckedChange={(checked) => handleSettingChange('security', 'passwordRequireSymbols', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication Required</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                  </div>
                  <Switch
                    checked={settings.security.twoFactorRequired}
                    onCheckedChange={(checked) => handleSettingChange('security', 'twoFactorRequired', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Rate Limiting Enabled</Label>
                    <p className="text-sm text-muted-foreground">Enable API rate limiting</p>
                  </div>
                  <Switch
                    checked={settings.security.rateLimitingEnabled}
                    onCheckedChange={(checked) => handleSettingChange('security', 'rateLimitingEnabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={settings.email.smtpHost}
                    onChange={(e) => handleSettingChange('email', 'smtpHost', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(e) => handleSettingChange('email', 'smtpPort', parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input
                    id="smtpUsername"
                    value={settings.email.smtpUsername}
                    onChange={(e) => handleSettingChange('email', 'smtpUsername', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <div className="relative">
                    <Input
                      id="smtpPassword"
                      type={showPasswords.smtpPassword ? 'text' : 'password'}
                      value={settings.email.smtpPassword}
                      onChange={(e) => handleSettingChange('email', 'smtpPassword', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility('smtpPassword')}
                    >
                      {showPasswords.smtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={settings.email.fromEmail}
                    onChange={(e) => handleSettingChange('email', 'fromEmail', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={settings.email.fromName}
                    onChange={(e) => handleSettingChange('email', 'fromName', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMTP Secure</Label>
                  <p className="text-sm text-muted-foreground">Use SSL/TLS encryption</p>
                </div>
                <Switch
                  checked={settings.email.smtpSecure}
                  onCheckedChange={(checked) => handleSettingChange('email', 'smtpSecure', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select value={settings.payment.defaultCurrency} onValueChange={(value) => handleSettingChange('payment', 'defaultCurrency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GHS">GHS (Ghana Cedi)</SelectItem>
                      <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem>
                      <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="platformFeePercentage">Platform Fee (%)</Label>
                  <Input
                    id="platformFeePercentage"
                    type="number"
                    value={settings.payment.platformFeePercentage}
                    onChange={(e) => handleSettingChange('payment', 'platformFeePercentage', parseFloat(e.target.value))}
                    min="0"
                    max="50"
                    step="0.1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimumDeposit">Minimum Deposit</Label>
                  <Input
                    id="minimumDeposit"
                    type="number"
                    value={settings.payment.minimumDeposit}
                    onChange={(e) => handleSettingChange('payment', 'minimumDeposit', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="maximumDeposit">Maximum Deposit</Label>
                  <Input
                    id="maximumDeposit"
                    type="number"
                    value={settings.payment.maximumDeposit}
                    onChange={(e) => handleSettingChange('payment', 'maximumDeposit', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimumWithdrawal">Minimum Withdrawal</Label>
                  <Input
                    id="minimumWithdrawal"
                    type="number"
                    value={settings.payment.minimumWithdrawal}
                    onChange={(e) => handleSettingChange('payment', 'minimumWithdrawal', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="maximumWithdrawal">Maximum Withdrawal</Label>
                  <Input
                    id="maximumWithdrawal"
                    type="number"
                    value={settings.payment.maximumWithdrawal}
                    onChange={(e) => handleSettingChange('payment', 'maximumWithdrawal', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Approve Withdrawals</Label>
                  <p className="text-sm text-muted-foreground">Automatically approve withdrawal requests</p>
                </div>
                <Switch
                  checked={settings.payment.autoApproveWithdrawals}
                  onCheckedChange={(checked) => handleSettingChange('payment', 'autoApproveWithdrawals', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="league" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                League Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxTeamsPerUser">Max Teams Per User</Label>
                  <Input
                    id="maxTeamsPerUser"
                    type="number"
                    value={settings.league.maxTeamsPerUser}
                    onChange={(e) => handleSettingChange('league', 'maxTeamsPerUser', parseInt(e.target.value))}
                    min="1"
                    max="50"
                  />
                </div>
                <div>
                  <Label htmlFor="maxLeaguesPerUser">Max Leagues Per User</Label>
                  <Input
                    id="maxLeaguesPerUser"
                    type="number"
                    value={settings.league.maxLeaguesPerUser}
                    onChange={(e) => handleSettingChange('league', 'maxLeaguesPerUser', parseInt(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultLeagueSize">Default League Size</Label>
                  <Input
                    id="defaultLeagueSize"
                    type="number"
                    value={settings.league.defaultLeagueSize}
                    onChange={(e) => handleSettingChange('league', 'defaultLeagueSize', parseInt(e.target.value))}
                    min="2"
                    max="100"
                  />
                </div>
                <div>
                  <Label htmlFor="maximumLeagueSize">Maximum League Size</Label>
                  <Input
                    id="maximumLeagueSize"
                    type="number"
                    value={settings.league.maximumLeagueSize}
                    onChange={(e) => handleSettingChange('league', 'maximumLeagueSize', parseInt(e.target.value))}
                    min="2"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimumEntryFee">Minimum Entry Fee</Label>
                  <Input
                    id="minimumEntryFee"
                    type="number"
                    value={settings.league.minimumEntryFee}
                    onChange={(e) => handleSettingChange('league', 'minimumEntryFee', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="maximumEntryFee">Maximum Entry Fee</Label>
                  <Input
                    id="maximumEntryFee"
                    type="number"
                    value={settings.league.maximumEntryFee}
                    onChange={(e) => handleSettingChange('league', 'maximumEntryFee', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Start Leagues</Label>
                    <p className="text-sm text-muted-foreground">Automatically start leagues when full</p>
                  </div>
                  <Switch
                    checked={settings.league.autoStartLeagues}
                    onCheckedChange={(checked) => handleSettingChange('league', 'autoStartLeagues', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Private Leagues</Label>
                    <p className="text-sm text-muted-foreground">Allow users to create private leagues</p>
                  </div>
                  <Switch
                    checked={settings.league.allowPrivateLeagues}
                    onCheckedChange={(checked) => handleSettingChange('league', 'allowPrivateLeagues', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Enable email notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'emailNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Enable push notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'pushNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Enable SMS notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.smsNotifications}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'smsNotifications', checked)}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Notification Types</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>League Updates</Label>
                      <p className="text-sm text-muted-foreground">Notify about league changes</p>
                    </div>
                    <Switch
                      checked={settings.notifications?.notificationTypes?.leagueUpdates || false}
                      onCheckedChange={(checked) => handleNestedSettingChange('notifications', 'notificationTypes', 'leagueUpdates', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Payment Updates</Label>
                      <p className="text-sm text-muted-foreground">Notify about payment status</p>
                    </div>
                    <Switch
                      checked={settings.notifications?.notificationTypes?.paymentUpdates || false}
                      onCheckedChange={(checked) => handleNestedSettingChange('notifications', 'notificationTypes', 'paymentUpdates', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>System Updates</Label>
                      <p className="text-sm text-muted-foreground">Notify about system changes</p>
                    </div>
                    <Switch
                      checked={settings.notifications?.notificationTypes?.systemUpdates || false}
                      onCheckedChange={(checked) => handleNestedSettingChange('notifications', 'notificationTypes', 'systemUpdates', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Promotional Emails</Label>
                      <p className="text-sm text-muted-foreground">Send promotional content</p>
                    </div>
                    <Switch
                      checked={settings.notifications?.notificationTypes?.promotionalEmails || false}
                      onCheckedChange={(checked) => handleNestedSettingChange('notifications', 'notificationTypes', 'promotionalEmails', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Performance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cacheTtl">Cache TTL (seconds)</Label>
                  <Input
                    id="cacheTtl"
                    type="number"
                    value={settings.performance.cacheTtl}
                    onChange={(e) => handleSettingChange('performance', 'cacheTtl', parseInt(e.target.value))}
                    min="60"
                    max="3600"
                  />
                </div>
                <div>
                  <Label htmlFor="apiRateLimit">API Rate Limit</Label>
                  <Input
                    id="apiRateLimit"
                    type="number"
                    value={settings.performance.apiRateLimit}
                    onChange={(e) => handleSettingChange('performance', 'apiRateLimit', parseInt(e.target.value))}
                    min="100"
                    max="10000"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxFileSize">Max File Size (bytes)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={settings.performance.maxFileSize}
                    onChange={(e) => handleSettingChange('performance', 'maxFileSize', parseInt(e.target.value))}
                    min="1048576"
                    max="52428800"
                  />
                </div>
                <div>
                  <Label htmlFor="cdnUrl">CDN URL</Label>
                  <Input
                    id="cdnUrl"
                    value={settings.performance.cdnUrl}
                    onChange={(e) => handleSettingChange('performance', 'cdnUrl', e.target.value)}
                    placeholder="https://cdn.example.com"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cache Enabled</Label>
                    <p className="text-sm text-muted-foreground">Enable system caching</p>
                  </div>
                  <Switch
                    checked={settings.performance.cacheEnabled}
                    onCheckedChange={(checked) => handleSettingChange('performance', 'cacheEnabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Image Optimization</Label>
                    <p className="text-sm text-muted-foreground">Optimize images automatically</p>
                  </div>
                  <Switch
                    checked={settings.performance.imageOptimization}
                    onCheckedChange={(checked) => handleSettingChange('performance', 'imageOptimization', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>CDN Enabled</Label>
                    <p className="text-sm text-muted-foreground">Use Content Delivery Network</p>
                  </div>
                  <Switch
                    checked={settings.performance.cdnEnabled}
                    onCheckedChange={(checked) => handleSettingChange('performance', 'cdnEnabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Database Optimization</Label>
                    <p className="text-sm text-muted-foreground">Enable database optimizations</p>
                  </div>
                  <Switch
                    checked={settings.performance.databaseOptimization}
                    onCheckedChange={(checked) => handleSettingChange('performance', 'databaseOptimization', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Alert */}
      {isSaving && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Saving settings... Please do not close this page.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SystemSettings;
