import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Loader2, Zap, Trophy, Users, Clock, Target, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateLeagueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PositionPrize {
  rank: number;
  amount: number;
}

const CreateLeagueModal: React.FC<CreateLeagueModalProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    name: '',
    leagueFormat: '',
    startGameweek: '',
    entryFee: '',
    maxTeams: '50',
    prizeModel: '',
    includeChipScores: false,
    includeTransferCosts: false,
    knockoutRounds: ''
  });
  const [positionPrizes, setPositionPrizes] = useState<PositionPrize[]>([
    { rank: 1, amount: 0 }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get current gameweek (simulated)
  const currentGameweek = 15;
  const maxGameweek = 38;

  // Generate knockout rounds options based on max teams
  const getKnockoutRounds = (maxTeams: number) => {
    const rounds = [];
    let teams = maxTeams;
    let round = 1;
    
    while (teams > 1 && round <= 16) {
      rounds.push({
        value: round.toString(),
        label: `Round ${round} (${teams} → ${Math.ceil(teams / 2)} teams)`,
        teams
      });
      teams = Math.ceil(teams / 2);
      round++;
    }
    
    return rounds;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name) {
      newErrors.name = 'League name is required';
    } else if (formData.name.length < 3 || formData.name.length > 50) {
      newErrors.name = 'Name must be 3-50 characters';
    }

    // League format validation
    if (!formData.leagueFormat) {
      newErrors.leagueFormat = 'League format is required';
    }

    // Start gameweek validation
    if (!formData.startGameweek) {
      newErrors.startGameweek = 'Start gameweek is required';
    } else {
      const gwNum = parseInt(formData.startGameweek);
      if (gwNum <= currentGameweek) {
        newErrors.startGameweek = 'Must be a future gameweek';
      }
    }

    // Entry fee validation - now required for all leagues
    if (!formData.entryFee) {
      newErrors.entryFee = 'Entry fee is required';
    } else {
      const fee = parseFloat(formData.entryFee);
      if (fee < 10 || fee > 50) {
        newErrors.entryFee = 'Entry fee must be GHS 10-50';
      }
    }

    // Max teams validation
    const maxTeams = parseInt(formData.maxTeams);
    if (maxTeams < 2 || maxTeams > 400) {
      newErrors.maxTeams = 'Max teams must be 2-400';
    }

    // Prize model validation - required for all leagues now
    if (!formData.prizeModel) {
      newErrors.prizeModel = 'Prize model is required';
    }

    // Knockout rounds validation for head-to-head
    if (formData.leagueFormat === 'HEAD_TO_HEAD' && !formData.knockoutRounds) {
      newErrors.knockoutRounds = 'Knockout rounds required for head-to-head';
    }

    // Position prizes validation for fixed model
    if (formData.prizeModel === 'fixed') {
      const totalPrizes = positionPrizes.reduce((sum, prize) => sum + prize.amount, 0);
      const prizePool = calculatePrizePool();
      if (totalPrizes > prizePool) {
        newErrors.prizes = 'Total prizes cannot exceed prize pool';
      }
      if (positionPrizes.some(prize => prize.amount <= 0)) {
        newErrors.prizes = 'All prize amounts must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      toast.success(`League "${formData.name}" created successfully!`);
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        leagueFormat: '',
        startGameweek: '',
        entryFee: '',
        maxTeams: '50',
        prizeModel: '',
        includeChipScores: false,
        includeTransferCosts: false,
        knockoutRounds: ''
      });
      setPositionPrizes([{ rank: 1, amount: 0 }]);
      setErrors({});
      setIsLoading(false);
    }, 2000);
  };

  const calculatePrizePool = () => {
    if (!formData.entryFee || !formData.maxTeams) return 0;
    return parseFloat(formData.entryFee) * parseInt(formData.maxTeams);
  };

  const isCustomFormat = formData.leagueFormat === 'CUSTOM';
  const isHeadToHead = formData.leagueFormat === 'HEAD_TO_HEAD';
  const isFixedPrizeModel = formData.prizeModel === 'fixed';

  // Generate gameweek options (future gameweeks only)
  const gameweekOptions = [];
  for (let gw = currentGameweek + 1; gw <= maxGameweek; gw++) {
    gameweekOptions.push(gw);
  }

  const knockoutRoundsOptions = getKnockoutRounds(parseInt(formData.maxTeams) || 50);

  const addPositionPrize = () => {
    const nextRank = Math.max(...positionPrizes.map(p => p.rank)) + 1;
    setPositionPrizes([...positionPrizes, { rank: nextRank, amount: 0 }]);
  };

  const removePositionPrize = (index: number) => {
    if (positionPrizes.length > 1) {
      setPositionPrizes(positionPrizes.filter((_, i) => i !== index));
    }
  };

  const updatePositionPrize = (index: number, field: 'rank' | 'amount', value: number) => {
    const updated = [...positionPrizes];
    updated[index][field] = value;
    setPositionPrizes(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-xl font-black text-gray-900">Create League</DialogTitle>
          <p className="text-gray-600 text-sm">Set up your new league</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* League Name */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-800">League Name *</Label>
            <Input
              placeholder="Enter league name (3-50 characters)"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`input-plain-white ${errors.name ? 'border-destructive' : ''}`}
              maxLength={50}
            />
            {errors.name && (
              <p className="text-destructive text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* League Format */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-800">
              <Target className="w-3 h-3 inline mr-1" />
              League Format *
            </Label>
            <Select value={formData.leagueFormat} onValueChange={(value) => setFormData(prev => ({ ...prev, leagueFormat: value }))}>
              <SelectTrigger className={`select-plain-white ${errors.leagueFormat ? 'border-destructive' : ''}`}>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent className="select-content-plain-white">
                <SelectItem value="CLASSIC" className="select-item-plain-white">Classic</SelectItem>
                <SelectItem value="HEAD_TO_HEAD" className="select-item-plain-white">Head-to-Head</SelectItem>
                <SelectItem value="CUSTOM" className="select-item-plain-white">Custom</SelectItem>
              </SelectContent>
            </Select>
            {errors.leagueFormat && (
              <p className="text-destructive text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.leagueFormat}
              </p>
            )}
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-800">
                <Clock className="w-3 h-3 inline mr-1" />
                Start GW *
              </Label>
              <Select value={formData.startGameweek} onValueChange={(value) => setFormData(prev => ({ ...prev, startGameweek: value }))}>
                <SelectTrigger className={`select-plain-white ${errors.startGameweek ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="GW" />
                </SelectTrigger>
                <SelectContent className="select-content-plain-white">
                  {gameweekOptions.map(gw => (
                    <SelectItem key={gw} value={gw.toString()} className="select-item-plain-white">GW {gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.startGameweek && (
                <p className="text-destructive text-xs">
                  {errors.startGameweek}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-800">
                <Users className="w-3 h-3 inline mr-1" />
                Max Teams *
              </Label>
              <Input
                type="number"
                placeholder="2-400"
                min="2"
                max="400"
                value={formData.maxTeams}
                onChange={(e) => setFormData(prev => ({ ...prev, maxTeams: e.target.value }))}
                className={`input-plain-white ${errors.maxTeams ? 'border-destructive' : ''}`}
              />
              {errors.maxTeams && (
                <p className="text-destructive text-xs">
                  {errors.maxTeams}
                </p>
              )}
            </div>
          </div>

          {/* Entry Fee - Now Required */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-800">Entry Fee (GHS) *</Label>
            <Input
              type="number"
              placeholder="Required (GHS 10-50)"
              min="10"
              max="50"
              step="0.01"
              value={formData.entryFee}
              onChange={(e) => setFormData(prev => ({ ...prev, entryFee: e.target.value }))}
              className={`input-plain-white text-center ${errors.entryFee ? 'border-destructive' : ''}`}
            />
            {errors.entryFee && (
              <p className="text-destructive text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.entryFee}
              </p>
            )}
          </div>

          {/* Prize Model - Now Required */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-800">
              <Trophy className="w-3 h-3 inline mr-1" />
              Prize Distribution *
            </Label>
            <Select value={formData.prizeModel} onValueChange={(value) => setFormData(prev => ({ ...prev, prizeModel: value }))}>
              <SelectTrigger className={`select-plain-white ${errors.prizeModel ? 'border-destructive' : ''}`}>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="select-content-plain-white">
                <SelectItem value="fixed" className="select-item-plain-white">Fixed Position Prizes</SelectItem>
                <SelectItem value="percentage" className="select-item-plain-white">Percentage Model</SelectItem>
              </SelectContent>
            </Select>
            {errors.prizeModel && (
              <p className="text-destructive text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.prizeModel}
              </p>
            )}

            {/* Prize Pool Display */}
            {formData.entryFee && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">
                    Prize Pool: GHS {calculatePrizePool().toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Position Prizes Configuration */}
          {isFixedPrizeModel && (
            <Card className="sport-card-plain-white">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">Position Prizes</h4>
                  <Button
                    type="button"
                    onClick={addPositionPrize}
                    size="sm"
                    className="h-8 w-8 p-0 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {positionPrizes.map((prize, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Rank"
                          min="1"
                          value={prize.rank || ''}
                          onChange={(e) => updatePositionPrize(index, 'rank', parseInt(e.target.value) || 0)}
                          className="input-plain-white text-center text-xs h-8"
                        />
                      </div>
                      <div className="flex-2">
                        <Input
                          type="number"
                          placeholder="Prize (GHS)"
                          min="0"
                          step="0.01"
                          value={prize.amount || ''}
                          onChange={(e) => updatePositionPrize(index, 'amount', parseFloat(e.target.value) || 0)}
                          className="input-plain-white text-center text-xs h-8"
                        />
                      </div>
                      {positionPrizes.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removePositionPrize(index)}
                          size="sm"
                          className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 rounded-md"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {errors.prizes && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.prizes}
                  </p>
                )}

                <div className="text-xs text-gray-600">
                  Total allocated: GHS {positionPrizes.reduce((sum, prize) => sum + (prize.amount || 0), 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Head-to-Head Specific */}
          {isHeadToHead && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-800">Knockout Rounds *</Label>
              <Select value={formData.knockoutRounds} onValueChange={(value) => setFormData(prev => ({ ...prev, knockoutRounds: value }))}>
                <SelectTrigger className={`select-plain-white ${errors.knockoutRounds ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Select rounds" />
                </SelectTrigger>
                <SelectContent className="select-content-plain-white">
                  {knockoutRoundsOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="select-item-plain-white">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.knockoutRounds && (
                <p className="text-destructive text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.knockoutRounds}
                </p>
              )}
            </div>
          )}

          {/* Custom League Options */}
          {isCustomFormat && (
            <Card className="sport-card-plain-white">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-800">Custom Options</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Include Chip Scores</Label>
                    <p className="text-xs text-gray-500">Count chip usage in scoring</p>
                  </div>
                  <Switch
                    checked={formData.includeChipScores}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeChipScores: checked }))}
                  />
                </div>

                <Separator className="border-gray-200" />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Include Transfer Costs</Label>
                    <p className="text-xs text-gray-500">Deduct transfer hit points</p>
                  </div>
                  <Switch
                    checked={formData.includeTransferCosts}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeTransferCosts: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Future Gameweek Warning */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              League must start from GW{currentGameweek + 1} or later. Current gameweek is GW{currentGameweek}.
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full btn-electric"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Create League
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLeagueModal;
