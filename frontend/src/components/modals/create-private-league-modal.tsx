import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Label } from '../ui/label';
import { 
  Trophy, 
  Users, 
  CreditCard, 
  ChevronDown, 
  ChevronRight,
  Copy,
  Shuffle,
  Loader2,
  CheckCircle,
  Info,
  AlertTriangle,
  Eye,
  Share2,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import LeagueCodeGenerationModal from './league-code-generation-modal';
import { apiClient } from '../../services/api';

interface CreatePrivateLeagueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeagueFormData {
  name: string;
  format: 'CLASSIC' | 'HEAD_TO_HEAD';
  entryFee: number;
  maxTeams: number;
  startGameweek: number;
  endGameweek: number | null;
  prizeDistribution: 'TOP_3' | 'TOP_5' | 'TOP_10' | 'PERCENTAGE' | 'FIXED_POSITIONS';
  fixedPrizes: { position: number; amount: number }[];
  includeChips: boolean;
  includeTransferCosts: boolean;
  knockoutRounds: number;
}

const CreatePrivateLeagueModal: React.FC<CreatePrivateLeagueModalProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    format: 'CLASSIC',
    entryFee: 10,
    maxTeams: 20,
    startGameweek: 17,
    endGameweek: null,
    prizeDistribution: 'TOP_3',
    fixedPrizes: [{ position: 1, amount: 0 }],
    includeChips: false,
    includeTransferCosts: false,
    knockoutRounds: 1
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'success'>('form');
  const [createdLeague, setCreatedLeague] = useState<any>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const minEntryFee = 10;
  const maxEntryFee = 50;
  const minTeams = 2;
  const maxTeams = 400;
  const currentGameweek = 16;

  // Generate random league code
  const generateLeagueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    if (formData.leagueCode === '') {
      setFormData(prev => ({ ...prev, leagueCode: generateLeagueCode() }));
    }
  }, []);

  const updateFormData = (key: keyof LeagueFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const getMaxKnockoutRounds = (teams: number) => {
    if (teams <= 3) return 1;
    if (teams <= 7) return 2;
    return 3;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // League name validation
    if (!formData.name.trim()) {
      newErrors.name = 'League name is required';
    } else if (formData.name.length < 3 || formData.name.length > 50) {
      newErrors.name = 'League name must be between 3 and 50 characters';
    }

    // Entry fee validation
    if (formData.entryFee < minEntryFee || formData.entryFee > maxEntryFee) {
      newErrors.entryFee = `Entry fee must be between GHS ${minEntryFee} and GHS ${maxEntryFee}`;
    }

    // Max teams validation
    if (formData.maxTeams < minTeams || formData.maxTeams > maxTeams) {
      newErrors.maxTeams = `Maximum teams must be between ${minTeams} and ${maxTeams}`;
    }

    // Start gameweek validation
    if (formData.startGameweek <= currentGameweek) {
      newErrors.startGameweek = 'Start gameweek must be in the future';
    }

    // End gameweek validation
    if (formData.endGameweek && formData.endGameweek <= formData.startGameweek) {
      newErrors.endGameweek = 'End gameweek must be after start gameweek';
    }

    // Knockout rounds validation for H2H
    if (formData.format === 'HEAD_TO_HEAD') {
      const maxRounds = getMaxKnockoutRounds(formData.maxTeams);
      if (formData.knockoutRounds > maxRounds) {
        newErrors.knockoutRounds = `Maximum ${maxRounds} knockout round${maxRounds > 1 ? 's' : ''} allowed for ${formData.maxTeams} teams`;
      }
    }

    // Fixed prizes validation
    if (formData.prizeDistribution === 'FIXED_POSITIONS') {
      formData.fixedPrizes.forEach((prize, index) => {
        if (prize.amount <= 0) {
          newErrors[`fixedPrize${index}`] = `Position ${prize.position} must have a positive amount`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createLeague = async () => {
    if (!validateForm()) return;

    // Show code generation modal instead of directly creating
    setShowCodeModal(true);
  };

  const createLeagueWithCode = async (leagueCode: string) => {
    setIsCreating(true);

    try {
      // Prepare league data for API
      const leagueData = {
        name: formData.name,
        leagueFormat: formData.format,
        entryType: 'PAID' as const,
        entryFee: formData.entryFee * 100, // Convert to cents
        maxTeams: formData.maxTeams,
        startGameweek: formData.startGameweek,
        endGameweek: formData.endGameweek,
        prizeDistribution: {
          type: formData.prizeDistribution,
          distribution: formData.prizeDistribution === 'FIXED_POSITIONS' 
            ? formData.fixedPrizes.reduce((acc, prize) => {
                acc[prize.position] = prize.amount * 100; // Convert to cents
                return acc;
              }, {} as Record<number, number>)
            : undefined
        },
        isPrivate: true
      };

      // Call the API to create the league
      const response = await apiClient.createLeague(leagueData);
      
      const newLeague = {
        id: response.league.id,
        ...formData,
        leagueCode: response.league.leagueCode,
        createdAt: response.league.createdAt,
        participantCount: 1,
        status: 'active'
      };

      setCreatedLeague(newLeague);
      setShowCodeModal(false);
      setCurrentStep('success');
      toast.success('League created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create league. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetModal = () => {
    setFormData({
      name: '',
      format: 'CLASSIC',
      entryFee: 10,
      maxTeams: 20,
      startGameweek: 17,
      endGameweek: null,
      prizeDistribution: 'TOP_3',
      fixedPrizes: [{ position: 1, amount: 0 }],
      includeChips: false,
      includeTransferCosts: false,
      knockoutRounds: 1
    });
    setErrors({});
    setShowAdvanced(false);
    setCurrentStep('form');
    setCreatedLeague(null);
    setShowCodeModal(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetModal, 300);
  };

  const copyLeagueCode = async (leagueCode: string) => {
    try {
      await navigator.clipboard.writeText(leagueCode);
      toast.success('League code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy league code');
    }
  };

  const shareLeague = () => {
    if (!createdLeague) return;
    const shareText = `Join my fantasy league "${createdLeague.name}" with code: ${createdLeague.leagueCode}`;
    if (navigator.share) {
      navigator.share({ text: shareText });
    } else {
      copyLeagueCode(createdLeague.leagueCode);
    }
  };

  const calculateTotalPrizePool = () => {
    return formData.entryFee * formData.maxTeams;
  };

  const getPrizeDistribution = () => {
    const prizePool = calculateTotalPrizePool();
    
    switch (formData.prizeDistribution) {
      case 'TOP_3':
        return [
          { position: '1st', percentage: 60, amount: prizePool * 0.6 },
          { position: '2nd', percentage: 30, amount: prizePool * 0.3 },
          { position: '3rd', percentage: 10, amount: prizePool * 0.1 }
        ];
      case 'TOP_5':
        return [
          { position: '1st', percentage: 50, amount: prizePool * 0.5 },
          { position: '2nd', percentage: 25, amount: prizePool * 0.25 },
          { position: '3rd', percentage: 15, amount: prizePool * 0.15 },
          { position: '4th', percentage: 7, amount: prizePool * 0.07 },
          { position: '5th', percentage: 3, amount: prizePool * 0.03 }
        ];
      case 'TOP_10':
        return [
          { position: '1st', percentage: 40, amount: prizePool * 0.4 },
          { position: '2nd', percentage: 20, amount: prizePool * 0.2 },
          { position: '3rd', percentage: 15, amount: prizePool * 0.15 },
          { position: '4th', percentage: 10, amount: prizePool * 0.1 },
          { position: '5th', percentage: 8, amount: prizePool * 0.08 },
          { position: '6th', percentage: 4, amount: prizePool * 0.04 },
          { position: '7th', percentage: 2, amount: prizePool * 0.02 },
          { position: '8th', percentage: 1, amount: prizePool * 0.01 }
        ];
      case 'FIXED_POSITIONS':
        return formData.fixedPrizes.map(prize => ({
          position: `${prize.position}${prize.position === 1 ? 'st' : prize.position === 2 ? 'nd' : prize.position === 3 ? 'rd' : 'th'}`,
          percentage: (prize.amount / prizePool) * 100,
          amount: prize.amount
        }));
      default:
        return [];
    }
  };

  const addFixedPrize = () => {
    const newPosition = formData.fixedPrizes.length + 1;
    setFormData(prev => ({
      ...prev,
      fixedPrizes: [...prev.fixedPrizes, { position: newPosition, amount: 0 }]
    }));
  };

  const removeFixedPrize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fixedPrizes: prev.fixedPrizes.filter((_, i) => i !== index)
    }));
  };

  const updateFixedPrize = (index: number, amount: number) => {
    setFormData(prev => ({
      ...prev,
      fixedPrizes: prev.fixedPrizes.map((prize, i) => 
        i === index ? { ...prize, amount } : prize
      )
    }));
  };

  // Success State
  if (currentStep === 'success' && createdLeague) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="clean-card max-w-md border-primary/20">
          <DialogHeader className="sr-only">
            <DialogTitle>League Created Successfully</DialogTitle>
            <DialogDescription>
              Your private league has been created successfully.
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-success/10 rounded-full border border-success/20">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg">League Created!</h2>
              <p className="text-xs text-muted-foreground">
                Your league <span className="font-medium text-foreground">"{createdLeague.name}"</span> is ready
              </p>
            </div>

            <div className="clean-card-sm bg-primary/5 border-primary/20">
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">League Code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base font-mono font-bold text-primary">{createdLeague.leagueCode}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLeagueCode(createdLeague.leagueCode)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={shareLeague} className="flex-1 text-xs">
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
              <Button className="flex-1 text-xs">
                <Eye className="w-3 h-3 mr-1" />
                View League
              </Button>
            </div>

            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="text-xs text-muted-foreground"
            >
              <Plus className="w-3 h-3 mr-1" />
              Create Another League
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="clean-card max-w-2xl border-primary/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-lg">Create Private League</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new private fantasy league
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Basic Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Basic Information</h3>
            
            <div className="space-y-1">
              <Label htmlFor="league-name" className="text-xs">League Name *</Label>
              <div className="space-y-1">
                <Input
                  id="league-name"
                  placeholder="Enter league name (3-50 characters)"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="input-compact text-xs"
                  maxLength={50}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.name && <span className="text-destructive">{errors.name}</span>}</span>
                  <span>{formData.name.length}/50</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* League Format */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">League Format *</h3>
            
            <RadioGroup
              value={formData.format}
              onValueChange={(value) => updateFormData('format', value)}
              className="space-y-2"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="CLASSIC" id="format-classic" className="mt-0.5" />
                <div className="space-y-0">
                  <Label htmlFor="format-classic" className="text-xs font-medium">
                    Classic
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Traditional league where teams accumulate points over the season
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="HEAD_TO_HEAD" id="format-h2h" className="mt-0.5" />
                <div className="space-y-0">
                  <Label htmlFor="format-h2h" className="text-xs font-medium">
                    Head-to-Head
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Teams face off each gameweek, with wins/draws/losses determining rank
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Entry Configuration */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Entry Configuration</h3>
            
            <div className="clean-card-sm bg-muted/5">
              <div className="flex items-center justify-between">
                <div className="space-y-0">
                  <Label className="text-xs font-medium">Entry Type</Label>
                  <p className="text-xs text-muted-foreground">Private leagues are paid leagues only</p>
                </div>
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Paid League
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="entry-fee" className="text-xs">Entry Fee (GHS) *</Label>
              <div className="space-y-1">
                <Input
                  id="entry-fee"
                  type="number"
                  min={minEntryFee}
                  max={maxEntryFee}
                  value={formData.entryFee}
                  onChange={(e) => updateFormData('entryFee', Number(e.target.value))}
                  className="input-compact text-xs"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.entryFee && <span className="text-destructive">{errors.entryFee}</span>}</span>
                  <span>Range: GHS {minEntryFee} - GHS {maxEntryFee}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* League Size */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">League Size</h3>
            
            <div className="space-y-1">
              <Label htmlFor="max-teams" className="text-xs">Maximum Teams *</Label>
              <div className="space-y-1">
                <Input
                  id="max-teams"
                  type="number"
                  min={minTeams}
                  max={maxTeams}
                  value={formData.maxTeams}
                  onChange={(e) => updateFormData('maxTeams', Number(e.target.value))}
                  className="input-compact text-xs"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.maxTeams && <span className="text-destructive">{errors.maxTeams}</span>}</span>
                  <span>Range: {minTeams} - {maxTeams} teams</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Gameweek Configuration */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Gameweek Configuration</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="start-gameweek" className="text-xs">Start Gameweek *</Label>
                <div className="space-y-1">
                  <Select 
                    value={formData.startGameweek.toString()} 
                    onValueChange={(value) => updateFormData('startGameweek', Number(value))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 38 - currentGameweek }, (_, i) => currentGameweek + i + 1).map((gw) => (
                        <SelectItem key={gw} value={gw.toString()}>
                          Gameweek {gw}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.startGameweek && (
                    <p className="text-xs text-destructive">{errors.startGameweek}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="end-gameweek" className="text-xs">End Gameweek (Optional)</Label>
                <div className="space-y-1">
                  <Select 
                    value={formData.endGameweek?.toString() || "none"} 
                    onValueChange={(value) => updateFormData('endGameweek', value === "none" ? null : Number(value))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select end gameweek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No end gameweek</SelectItem>
                      {Array.from({ length: 38 - formData.startGameweek }, (_, i) => formData.startGameweek + i + 1).map((gw) => (
                        <SelectItem key={gw} value={gw.toString()}>
                          Gameweek {gw}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.endGameweek && (
                    <p className="text-xs text-destructive">{errors.endGameweek}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Prize Distribution */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Prize Distribution *</h3>
            
            <RadioGroup
              value={formData.prizeDistribution}
              onValueChange={(value) => updateFormData('prizeDistribution', value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="TOP_3" id="dist-top3" />
                <Label htmlFor="dist-top3" className="text-xs">Top 3 (60% / 30% / 10%)</Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="TOP_5" id="dist-top5" />
                <Label htmlFor="dist-top5" className="text-xs">Top 5 (50% / 25% / 15% / 7% / 3%)</Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="TOP_10" id="dist-top10" />
                <Label htmlFor="dist-top10" className="text-xs">Top 10 (Custom distribution)</Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="FIXED_POSITIONS" id="dist-fixed" />
                <Label htmlFor="dist-fixed" className="text-xs">Fixed Position Prizes</Label>
              </div>
            </RadioGroup>

            {/* Fixed Position Prizes */}
            {formData.prizeDistribution === 'FIXED_POSITIONS' && (
              <div className="space-y-2 mt-2">
                <div className="space-y-2">
                  {formData.fixedPrizes.map((prize, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs min-w-16">Position {prize.position}:</span>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prize.amount}
                          onChange={(e) => updateFixedPrize(index, Number(e.target.value))}
                          className="input-compact text-xs"
                          placeholder="Amount"
                        />
                        {errors[`fixedPrize${index}`] && (
                          <p className="text-xs text-destructive mt-1">{errors[`fixedPrize${index}`]}</p>
                        )}
                      </div>
                      {formData.fixedPrizes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFixedPrize(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFixedPrize}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Position
                </Button>
              </div>
            )}

            {/* Prize Preview */}
            <div className="clean-card-sm bg-muted/5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Total Prize Pool</span>
                  <span className="font-medium">GHS {calculateTotalPrizePool().toFixed(2)}</span>
                </div>
                
                {getPrizeDistribution().map((prize, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span>{prize.position} Place ({prize.percentage.toFixed(1)}%)</span>
                    <span>GHS {prize.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Head-to-Head Specific Settings */}
          {formData.format === 'HEAD_TO_HEAD' && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Head-to-Head Settings</h3>
                
                <div className="space-y-1">
                  <Label htmlFor="knockout-rounds" className="text-xs">Knockout Rounds *</Label>
                  <div className="space-y-1">
                    <Select 
                      value={formData.knockoutRounds.toString()} 
                      onValueChange={(value) => updateFormData('knockoutRounds', Number(value))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: getMaxKnockoutRounds(formData.maxTeams) }, (_, i) => i + 1).map((rounds) => (
                          <SelectItem key={rounds} value={rounds.toString()}>
                            {rounds} Round{rounds > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.knockoutRounds && (
                      <p className="text-xs text-destructive">{errors.knockoutRounds}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Advanced Settings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h3 className="text-sm font-medium">Advanced Settings</h3>
              {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-2 mt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0">
                    <Label className="text-xs">Include Chip Scores</Label>
                    <p className="text-xs text-muted-foreground">Include chip scores in league calculations</p>
                  </div>
                  <Switch
                    checked={formData.includeChips}
                    onCheckedChange={(checked) => updateFormData('includeChips', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0">
                    <Label className="text-xs">Include Transfer Costs</Label>
                    <p className="text-xs text-muted-foreground">Include transfer costs in league calculations</p>
                  </div>
                  <Switch
                    checked={formData.includeTransferCosts}
                    onCheckedChange={(checked) => updateFormData('includeTransferCosts', checked)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Summary & Review */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">League Summary</h3>
            
            <div className="clean-card-sm bg-muted/5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>League Name</span>
                  <span className="font-medium">{formData.name || 'Untitled League'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Format</span>
                  <span>{formData.format === 'CLASSIC' ? 'Classic' : 'Head-to-Head'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Entry Fee</span>
                  <span>GHS {formData.entryFee}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Max Teams</span>
                  <span>{formData.maxTeams}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Gameweeks</span>
                  <span>
                    GW {formData.startGameweek}{formData.endGameweek ? ` - ${formData.endGameweek}` : ' onwards'}
                  </span>
                </div>
                {formData.format === 'HEAD_TO_HEAD' && (
                  <div className="flex justify-between text-xs">
                    <span>Knockout Rounds</span>
                    <span>{formData.knockoutRounds}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span>Prize Pool</span>
                  <span className="font-medium text-primary">GHS {calculateTotalPrizePool().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1 text-xs"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={createLeague}
              disabled={isCreating || !formData.name.trim()}
              className="flex-1 text-xs"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                <>
                  <Trophy className="h-3 w-3 mr-1" />
                  Create League
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* League Code Generation Modal */}
      <LeagueCodeGenerationModal
        open={showCodeModal}
        onOpenChange={setShowCodeModal}
        onConfirmCreate={createLeagueWithCode}
        isCreating={isCreating}
      />
    </Dialog>
  );
};

export default CreatePrivateLeagueModal;
