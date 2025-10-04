import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, Loader2, Trophy, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface LinkedTeam {
  id: string;
  teamName: string;
  fplTeamId: number;
  fplUrl: string;
  totalPoints: number;
  overallRank: number;
  gameweekPoints: number;
  teamValue: number;
  bank: number;
  transfers: number;
  gameweek: number;
  createdAt: string;
}

type GameType = 'champions' | 'free2play';
type SelectionType = 'league' | 'game';

const TeamSelection: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const selectionType = (searchParams.get('type') as SelectionType) || 'league';
  const gameType = (searchParams.get('gameType') as GameType) || 'champions';
  const gameweek = parseInt(searchParams.get('gameweek') || '1');
  const leagueId = searchParams.get('leagueId');
  
  const [linkedTeams, setLinkedTeams] = useState<LinkedTeam[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLinkedTeams();
  }, []);

  const loadLinkedTeams = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getLinkedTeams();
      if (response.success && response.data) {
        setLinkedTeams(response.data);
      }
    } catch (error) {
      console.error('Failed to load linked teams:', error);
      toast.error('Failed to load linked teams');
    } finally {
      setIsLoading(false);
    }
  };

  const getContextInfo = () => {
    if (selectionType === 'game') {
      if (gameType === 'champions') {
        return {
          title: 'Gameweek Champions',
          description: 'Select teams for the champions competition',
          icon: <Trophy className="w-6 h-6 text-amber-600" />,
          price: 10,
          color: 'amber',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-900'
        };
      } else {
        return {
          title: 'Free2Play',
          description: 'Select teams for the free competition',
          icon: <Play className="w-6 h-6 text-green-600" />,
          price: 0,
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-900'
        };
      }
    } else {
      return {
        title: 'Join League',
        description: 'Select teams to join the league',
        icon: <Users className="w-6 h-6 text-blue-600" />,
        price: 0,
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900'
      };
    }
  };

  const contextInfo = getContextInfo();
  const totalCost = contextInfo.price * selectedTeams.length;

  const handleTeamSelection = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeams(prev => [...prev, teamId]);
    } else {
      setSelectedTeams(prev => prev.filter(id => id !== teamId));
    }
  };

  const handleSelectAllTeams = () => {
    if (selectedTeams.length === linkedTeams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(linkedTeams.map(team => team.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedTeams.length === 0) {
      toast.error('Please select at least one team');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (selectionType === 'game') {
        // Navigate to review payment page
        const params = new URLSearchParams({
          type: 'review',
          gameType,
          gameweek: gameweek.toString(),
          teams: selectedTeams.join(',')
        });
        navigate(`/games/flow?${params.toString()}`);
      } else {
        // Join league with selected teams
        const response = await apiClient.joinLeague({
          leagueId: leagueId!,
          teamIds: selectedTeams
        });

        if (response.success) {
          toast.success('Successfully joined the league!');
          navigate('/dashboard');
        } else {
          toast.error(response.message || 'Failed to join league');
        }
      }
    } catch (error: any) {
      console.error('Failed to submit:', error);
      toast.error(error.message || 'Failed to submit selection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (selectionType === 'game') {
      navigate(`/games/flow?type=gameweek&gameType=${gameType}`);
    } else {
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-gray-900">Select Teams</h1>
              <p className="text-sm text-gray-600">
                {selectionType === 'game' 
                  ? `Choose teams for ${contextInfo.title}` 
                  : 'Choose teams to join the league'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Context Info */}
        <Card className={`${contextInfo.bgColor} ${contextInfo.borderColor} border-2 mb-6`}>
          <CardHeader>
            <CardTitle className={`flex items-center space-x-3 ${contextInfo.textColor}`}>
              {contextInfo.icon}
              <div>
                <h2 className="text-2xl font-bold">{contextInfo.title}</h2>
                <p className="text-sm font-normal opacity-80">{contextInfo.description}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={contextInfo.price > 0 ? 'secondary' : 'outline'} className="text-sm">
                {contextInfo.price > 0 ? 'PAID' : 'FREE'}
              </Badge>
              <span className={`text-lg font-bold ${contextInfo.textColor}`}>
                {contextInfo.price > 0 ? `GH₵${contextInfo.price}.00` : 'FREE'}
              </span>
            </div>
            {selectionType === 'game' && (
              <div className="mt-2 text-sm opacity-80">
                Gameweek {gameweek}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Available Teams</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllTeams}
                className="text-xs"
              >
                {selectedTeams.length === linkedTeams.length ? 'Deselect All' : 'Select All'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {linkedTeams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Available</h3>
                <p className="text-gray-600 mb-4">
                  You need to link your FPL teams before you can join leagues or games.
                </p>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                >
                  Link Teams
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedTeams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTeams.includes(team.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleTeamSelection(team.id, !selectedTeams.includes(team.id))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>GW{team.gameweek} Points: {team.gameweekPoints}</span>
                          <span>Total: {team.totalPoints}</span>
                          <span>Rank: #{team.overallRank}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Value: £{(team.teamValue / 10).toFixed(1)}m</span>
                          <span>Bank: £{(team.bank / 10).toFixed(1)}m</span>
                          <span>Transfers: {team.transfers}</span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        selectedTeams.includes(team.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedTeams.includes(team.id) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selection Summary */}
        {selectedTeams.length > 0 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
                  </h3>
                  {contextInfo.price > 0 && (
                    <p className="text-sm text-gray-600">
                      Total cost: GH₵{totalCost}.00
                    </p>
                  )}
                </div>
                <Badge variant="default" className="text-sm">
                  {selectedTeams.length} selected
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedTeams.length === 0 || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              selectionType === 'game' ? 'Review & Pay' : 'Join League'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamSelection;
