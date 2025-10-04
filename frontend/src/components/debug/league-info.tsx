import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const LeagueInfo: React.FC = () => {
  const [userLeagues, setUserLeagues] = useState<any[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<any[]>([]);
  const [currentLeagues, setCurrentLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLeagueData = async () => {
    setLoading(true);
    try {
      // Load different types of leagues
      const [userLeaguesData, publicLeaguesData, currentLeaguesData] = await Promise.allSettled([
        apiClient.getUserLeagues(),
        apiClient.getPublicLeagues(),
        apiClient.getCurrentLeagues()
      ]);

      if (userLeaguesData.status === 'fulfilled') {
        setUserLeagues(userLeaguesData.value);
      }
      if (publicLeaguesData.status === 'fulfilled') {
        setPublicLeagues(publicLeaguesData.value);
      }
      if (currentLeaguesData.status === 'fulfilled') {
        setCurrentLeagues(currentLeaguesData.value.leagues || []);
      }
    } catch (error) {
      console.error('Error loading league data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeagueData();
  }, []);

  const formatLeagueStatus = (status: string) => {
    const statusColors = {
      'DRAFT': 'bg-gray-500',
      'ACTIVE': 'bg-green-500',
      'COMPLETED': 'bg-blue-500',
      'CANCELLED': 'bg-red-500'
    };
    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors] || 'bg-gray-500'} text-white`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">League Information</h1>
        <Button onClick={loadLeagueData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* User Leagues */}
      <Card>
        <CardHeader>
          <CardTitle>Your Leagues ({userLeagues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {userLeagues.length === 0 ? (
            <p className="text-muted-foreground">You're not in any leagues yet.</p>
          ) : (
            <div className="space-y-3">
              {userLeagues.map((league) => (
                <div key={league.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{league.league?.name || 'Unknown League'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {league.league?.description || 'No description'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {formatLeagueStatus(league.league?.status || 'UNKNOWN')}
                        <Badge variant="outline">
                          {league.league?.entryType || 'FREE'}
                        </Badge>
                        <Badge variant="outline">
                          {league.league?.leagueFormat || 'CLASSIC'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        Rank: <span className="font-semibold">{league.rank || 'N/A'}</span>
                      </p>
                      <p className="text-sm">
                        Points: <span className="font-semibold">{league.totalPoints || 0}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Public Leagues */}
      <Card>
        <CardHeader>
          <CardTitle>Public Leagues ({publicLeagues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {publicLeagues.length === 0 ? (
            <p className="text-muted-foreground">No public leagues available.</p>
          ) : (
            <div className="space-y-3">
              {publicLeagues.map((league) => (
                <div key={league.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{league.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {league.description || 'No description'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {formatLeagueStatus(league.status)}
                        <Badge variant="outline">
                          {league.entryType}
                        </Badge>
                        <Badge variant="outline">
                          {league.leagueFormat}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        Teams: <span className="font-semibold">{league.currentTeams}/{league.maxTeams}</span>
                      </p>
                      <p className="text-sm">
                        Season: <span className="font-semibold">{league.season}</span>
                      </p>
                      <p className="text-sm">
                        Gameweek: <span className="font-semibold">{league.startGameweek}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Leagues */}
      <Card>
        <CardHeader>
          <CardTitle>Current Active Leagues ({currentLeagues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {currentLeagues.length === 0 ? (
            <p className="text-muted-foreground">No active leagues currently.</p>
          ) : (
            <div className="space-y-3">
              {currentLeagues.map((league) => (
                <div key={league.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{league.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {league.description || 'No description'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {formatLeagueStatus(league.status)}
                        <Badge variant="outline">
                          {league.entryType}
                        </Badge>
                        <Badge variant="outline">
                          {league.leagueFormat}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        Teams: <span className="font-semibold">{league.currentTeams}/{league.maxTeams}</span>
                      </p>
                      <p className="text-sm">
                        Season: <span className="font-semibold">{league.season}</span>
                      </p>
                      <p className="text-sm">
                        Gameweek: <span className="font-semibold">{league.startGameweek}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeagueInfo;
