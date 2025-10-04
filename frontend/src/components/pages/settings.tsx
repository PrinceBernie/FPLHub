import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Bell, 
  Lock,
  LogOut,
  Edit,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import PhoneVerificationModal from '../modals/phone-verification-modal';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Profile state
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone?.replace('+233', '') || '', // Remove +233 prefix for editing
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
  });

  // Phone verification state
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState('');

  // Initialize profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone?.replace('+233', '') || '',
      });
    }
  }, [user]);

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await apiClient.getUserSettings();
        setNotifications({
          email: settings.settings.notifications.email,
          sms: settings.settings.notifications.sms,
        });
      } catch (error) {
        console.error('Failed to load user settings:', error);
      }
    };

    if (user) {
      loadUserSettings();
    }
  }, [user]);

  // Validation functions
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password: string): { strength: number; message: string } => {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;

    if (strength === 0 || !checks.length) return { strength: 0, message: 'Password is required' };
    if (strength <= 2) return { strength: 1, message: 'Weak password' };
    if (strength <= 3) return { strength: 2, message: 'Fair password' };
    if (strength <= 4) return { strength: 3, message: 'Good password' };
    return { strength: 4, message: 'Strong password' };
  };

  // Profile handlers
  const handleEditProfile = (field: string) => {
    setEditingField(field);
    setProfileErrors({});
    
    if (field === 'phone') {
      toast.info('You will need to verify your new phone number via SMS');
    }
  };

  const handleSaveProfile = async (field: string) => {
    const newErrors: Record<string, string> = {};
    const value = profileData[field as keyof typeof profileData];

    // Validation
    if (field === 'email') {
      if (!value.trim()) {
        newErrors.email = 'Email is required';
      } else if (!isValidEmail(value)) {
        newErrors.email = 'Please enter a valid email address';
      }
    } else if (field === 'phone') {
      if (!value.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (value.length !== 9) {
        newErrors.phone = 'Phone number must be exactly 9 digits';
      } else if (!/^[0-9]+$/.test(value)) {
        newErrors.phone = 'Phone number must contain only digits';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setProfileErrors(newErrors);
      return;
    }

    // Special handling for phone number changes
    if (field === 'phone' && value !== user?.phone?.replace('+233', '')) {
      const fullPhoneNumber = `+233${value}`;
      setPendingPhoneNumber(fullPhoneNumber);
      setShowPhoneVerificationModal(true);
      return;
    }

    // Save other fields via API
    try {
      if (field === 'email') {
        await apiClient.updateProfile({ email: value });
        toast.success('Email updated successfully!');
      }
      setEditingField(null);
      setProfileErrors({});
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleCancelProfile = (field: string) => {
    setProfileData({
      ...profileData,
      [field]: field === 'phone' ? user?.phone?.replace('+233', '') || '' : user?.[field as keyof typeof user] as string || ''
    });
    setEditingField(null);
    setProfileErrors({});
  };

  // Password handlers
  const handlePasswordChange = (field: keyof typeof passwordData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleChangePassword = async () => {
    const newErrors: Record<string, string> = {};

    // Validation
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiClient.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
      toast.success('Password changed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Phone verification handlers
  const handlePhoneVerified = async (verifiedPhoneNumber: string) => {
    try {
      // Store just the digits (without +233) in profile data
      const phoneDigits = verifiedPhoneNumber.replace('+233', '');
      setProfileData(prev => ({ ...prev, phone: phoneDigits }));
      setEditingField(null);
      setPendingPhoneNumber('');
      toast.success('Phone number updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update phone number');
    }
  };

  const handlePhoneVerificationClose = (open: boolean) => {
    setShowPhoneVerificationModal(open);
    if (!open && editingField === 'phone') {
      // Reset to original phone digits (without +233)
      setProfileData(prev => ({ ...prev, phone: user?.phone?.replace('+233', '') || '' }));
      setPendingPhoneNumber('');
    }
  };

  // Notification handlers
  const handleNotificationChange = async (type: 'email' | 'sms', checked: boolean) => {
    try {
      await apiClient.updateUserSettings({
        notifications: {
          [type]: checked,
        },
      });
      setNotifications(prev => ({ ...prev, [type]: checked }));
      toast.success(`${type === 'email' ? 'Email' : 'SMS'} notifications ${checked ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update notification settings');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to logout');
    }
  };

  // Profile field component
  const ProfileField = ({ 
    label, 
    field, 
    value, 
    icon: Icon, 
    type = 'text',
    readOnly = false
  }: {
    label: string;
    field: string;
    value: string;
    icon: any;
    type?: string;
    readOnly?: boolean;
  }) => {
    const isEditing = editingField === field;
    const error = profileErrors[field];
    const isPhoneField = field === 'phone';
    
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Remove any non-digit characters and limit to 9 digits
      const digitsOnly = value.replace(/\D/g, '').slice(0, 9);
      setProfileData(prev => ({ ...prev, phone: digitsOnly }));
    };
    
    const displayValue = isPhoneField ? value.replace('+233', '') : value;
    const inputValue = isPhoneField ? profileData.phone : profileData[field as keyof typeof profileData];
    
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {isPhoneField ? (
              <div className="flex">
                <div className="flex items-center gap-2 px-3 h-8 border border-r-0 border-border rounded-l-md bg-input">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">+233</span>
                </div>
                {isEditing ? (
                  <Input
                    type="tel"
                    value={inputValue}
                    onChange={handlePhoneChange}
                    className={`input-compact rounded-l-none border-l-0 focus-visible:ring-offset-0 ${error ? 'border-destructive' : ''}`}
                    placeholder="Enter 9 digits"
                    maxLength={9}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    autoFocus
                  />
                ) : (
                  <Input
                    type="tel"
                    value={displayValue}
                    readOnly
                    className="input-compact rounded-l-none border-l-0 bg-muted/5 cursor-default"
                  />
                )}
              </div>
            ) : (
              <>
                <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                {isEditing ? (
                  <Input
                    type={type}
                    value={inputValue}
                    onChange={(e) => setProfileData(prev => ({ ...prev, [field]: e.target.value }))}
                    className={`input-with-icon ${error ? 'border-destructive' : ''}`}
                    autoFocus
                  />
                ) : (
                  <Input
                    type={type}
                    value={value}
                    readOnly
                    className="input-with-icon bg-muted/5 cursor-default"
                  />
                )}
              </>
            )}
          </div>
          
          {!readOnly && (
            <div className="flex gap-1">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleSaveProfile(field)}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancelProfile(field)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditProfile(field)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  if (!user) {
    return (
      <div className="container-clean py-6 max-w-4xl">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-clean py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences and security settings.
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="clean-card">
            <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
            <div className="space-y-4">
              <ProfileField
                label="Username"
                field="username"
                value={profileData.username}
                icon={User}
                readOnly={true}
              />
              
              <ProfileField
                label="Email Address"
                field="email"
                value={profileData.email}
                icon={Mail}
                type="email"
              />
              
              <ProfileField
                label="Phone Number"
                field="phone"
                value={user.phone}
                icon={Phone}
                type="tel"
              />
            </div>

            <div className="mt-6 p-4 bg-muted/5 border border-border rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Account Status</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-muted-foreground">Verification Status:</span>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.isVerified 
                    ? 'bg-success/10 text-success border border-success/20' 
                    : 'bg-warning/10 text-warning border border-warning/20'
                }`}>
                  {user.isVerified ? 'Verified' : 'Pending Verification'}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="clean-card">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className={`input-with-icon-password ${passwordErrors.currentPassword ? 'border-destructive' : ''}`}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 z-10"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className={`input-with-icon-password ${passwordErrors.newPassword ? 'border-destructive' : ''}`}
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 z-10"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {passwordData.newPassword && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            passwordStrength.strength === 1 ? 'w-1/4 bg-destructive' :
                            passwordStrength.strength === 2 ? 'w-2/4 bg-warning' :
                            passwordStrength.strength === 3 ? 'w-3/4 bg-primary' :
                            passwordStrength.strength === 4 ? 'w-full bg-success' : 'w-0'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.strength === 1 ? 'text-destructive' :
                        passwordStrength.strength === 2 ? 'text-warning' :
                        passwordStrength.strength === 3 ? 'text-primary' :
                        passwordStrength.strength === 4 ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {passwordStrength.message}
                      </span>
                    </div>
                  </div>
                )}
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className={`input-with-icon-password ${passwordErrors.confirmPassword ? 'border-destructive' : ''}`}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 z-10"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button 
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full"
              >
                {isChangingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="clean-card">
            <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-md">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive updates and alerts via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-md">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">SMS Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive important alerts via SMS
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) => handleNotificationChange('sms', checked)}
                />
              </div>
            </div>

            <Alert className="mt-4">
              <Bell className="w-4 h-4" />
              <AlertDescription className="text-xs">
                You can manage specific notification types in your device settings. 
                These preferences control notifications sent from our servers.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>

      {/* Account Actions */}
      <div className="clean-card border-destructive/20">
        <h3 className="text-lg font-semibold mb-4 text-destructive">Account Actions</h3>
        <div className="p-4 border border-destructive/20 rounded-md bg-destructive/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Logout</p>
                <p className="text-xs text-muted-foreground">
                  Sign out of your account securely
                </p>
              </div>
            </div>
            <Button 
              variant="destructive"
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        open={showPhoneVerificationModal}
        onOpenChange={handlePhoneVerificationClose}
        newPhoneNumber={pendingPhoneNumber}
        onVerify={handlePhoneVerified}
      />
    </div>
  );
};

export default Settings;