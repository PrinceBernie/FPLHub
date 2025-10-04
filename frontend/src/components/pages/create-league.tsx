import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, Settings, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface LeagueFormData {
  name: string;
  description: string;
  entryFee: number;
  maxParticipants: number;
  isPrivate: boolean;
  password?: string;
  startGameweek: number;
  prizeDistribution: {
    first: number;
    second: number;
    third: number;
  };
}

const CreateLeague: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<'basic' | 'settings' | 'prizes' | 'success'>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    description: '',
    entryFee: 0,
    maxParticipants: 20,
    isPrivate: false,
    password: '',
    startGameweek: 1,
    prizeDistribution: {
      first: 50,
      second: 30,
      third: 20,
    },
  });

  const handleInputChange = (field: keyof LeagueFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrizeChange = (position: keyof LeagueFormData['prizeDistribution'], value: number) => {
    setFormData(prev => ({
      ...prev,
      prizeDistribution: {
        ...prev.prizeDistribution,
        [position]: value
      }
    }));
  };

  const validateBasicInfo = () => {
    if (!formData.name.trim()) {
      toast.error('League name is required');
      return false;
    }
    if (formData.name.length < 3) {
      toast.error('League name must be at least 3 characters');
      return false;
    }
    if (formData.maxParticipants < 2 || formData.maxParticipants > 100) {
      toast.error('Max participants must be between 2 and 100');
      return false;
    }
    return true;
  };

  const validateSettings = () => {
    if (formData.entryFee < 0) {
      toast.error('Entry fee cannot be negative');
      return false;
    }
    if (formData.isPrivate && !formData.password?.trim()) {
      toast.error('Password is required for private leagues');
      return false;
    }
    return true;
  };

  const validatePrizes = () => {
    const total = formData.prizeDistribution.first + formData.prizeDistribution.second + formData.prizeDistribution.third;
    if (total !== 100) {
      toast.error('Prize distribution must total 100%');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'basic' && !validateBasicInfo()) return;
    if (currentStep === 'settings' && !validateSettings()) return;
    if (currentStep === 'prizes' && !validatePrizes()) return;

    if (currentStep === 'basic') setCurrentStep('settings');
    else if (currentStep === 'settings') setCurrentStep('prizes');
    else if (currentStep === 'prizes') handleCreateLeague();
  };

  const handleBack = () => {
    if (currentStep === 'settings') setCurrentStep('basic');
    else if (currentStep === 'prizes') setCurrentStep('settings');
    else if (currentStep === 'success') navigate('/dashboard');
  };

  const handleCreateLeague = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.createLeague({
        name: formData.name,
        description: formData.description,
        entryFee: formData.entryFee,
        maxParticipants: formData.maxParticipants,
        isPrivate: formData.isPrivate,
        password: formData.password,
        startGameweek: formData.startGameweek,
        prizeDistribution: formData.prizeDistribution,
      });

      if (response.success) {
        setCurrentStep('success');
        toast.success('League created successfully!');
      } else {
        toast.error(response.message || 'Failed to create league');
      }
    } catch (error: any) {
      console.error('Failed to create league:', error);
      toast.error(error.message || 'Failed to create league');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'basic', label: 'Basic Info', icon: Users },
      { key: 'settings', label: 'Settings', icon: Settings },
      { key: 'prizes', label: 'Prizes', icon: Trophy },
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : isCompleted 
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
              }`}>
                <StepIcon className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBasicStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">League Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter league name"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your league..."
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="maxParticipants">Maximum Participants</Label>
            <Input
              id="maxParticipants"
              type="number"
              value={formData.maxParticipants}
              onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
              min="2"
              max="100"
              className="mt-1"
            />
            <p className="text-sm text-gray-600 mt-1">
              Between 2 and 100 participants
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>League Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="entryFee">Entry Fee (GH₵)</Label>
            <Input
              id="entryFee"
              type="number"
              value={formData.entryFee}
              onChange={(e) => handleInputChange('entryFee', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="mt-1"
            />
            <p className="text-sm text-gray-600 mt-1">
              Set to 0 for free leagues
            </p>
          </div>
          
          <div>
            <Label htmlFor="startGameweek">Starting Gameweek</Label>
            <Input
              id="startGameweek"
              type="number"
              value={formData.startGameweek}
              onChange={(e) => handleInputChange('startGameweek', parseInt(e.target.value))}
              min="1"
              max="38"
              className="mt-1"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isPrivate}
                onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isPrivate">Make this a private league</Label>
            </div>
            
            {formData.isPrivate && (
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPrizesStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-blue-600" />
            <span>Prize Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Set how the prize pool will be distributed among winners (must total 100%)
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="first">1st Place (%)</Label>
              <Input
                id="first"
                type="number"
                value={formData.prizeDistribution.first}
                onChange={(e) => handlePrizeChange('first', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="second">2nd Place (%)</Label>
              <Input
                id="second"
                type="number"
                value={formData.prizeDistribution.second}
                onChange={(e) => handlePrizeChange('second', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="third">3rd Place (%)</Label>
              <Input
                id="third"
                type="number"
                value={formData.prizeDistribution.third}
                onChange={(e) => handlePrizeChange('third', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Distribution:</span>
              <Badge variant={formData.prizeDistribution.first + formData.prizeDistribution.second + formData.prizeDistribution.third === 100 ? 'default' : 'destructive'}>
                {formData.prizeDistribution.first + formData.prizeDistribution.second + formData.prizeDistribution.third}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">League Created!</h2>
        <p className="text-gray-600">
          Your league "{formData.name}" has been created successfully
        </p>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Share your league code with friends</li>
          <li>• Invite participants to join</li>
          <li>• Monitor registrations in your dashboard</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentStep === 'success' ? 'Success' : 'Create League'}
              </h1>
              <p className="text-sm text-gray-600">
                {currentStep === 'success' 
                  ? 'Your league is ready!' 
                  : `Step ${currentStep === 'basic' ? '1' : currentStep === 'settings' ? '2' : '3'} of 3`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentStep !== 'success' && renderStepIndicator()}
        
        {currentStep === 'basic' && renderBasicStep()}
        {currentStep === 'settings' && renderSettingsStep()}
        {currentStep === 'prizes' && renderPrizesStep()}
        {currentStep === 'success' && renderSuccessStep()}

        {/* Action Buttons */}
        {currentStep !== 'success' && (
          <div className="flex space-x-4 mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                currentStep === 'prizes' ? 'Create League' : 'Next'
              )}
            </Button>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="flex justify-center mt-8">
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              Return to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateLeague;
