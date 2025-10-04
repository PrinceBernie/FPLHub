// WebSocket client for real-time live standings updates
import { io, Socket } from 'socket.io-client';

interface LiveStandingsUpdate {
  leagueId: string;
  leagueName: string;
  updatedEntries: any[];
  batchInfo: {
    batchSize: number;
    totalBatches: number;
    responseTime: number;
    updatedCount: number;
    totalTeams: number;
  };
  performanceMetrics: {
    avgResponseTime: number;
    mode: string;
    batchSize: number;
  };
  gameweekId: number;
  timestamp: string;
}

interface GlobalStandingsUpdate {
  leagueId: string;
  updatedCount: number;
  batchInfo: any;
  timestamp: string;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    const serverUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔗 Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.authenticate();
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.handleReconnection();
    });

    this.socket.on('authenticated', (data) => {
      console.log('✅ WebSocket authenticated:', data);
      this.onAuthenticated?.(data);
    });

    this.socket.on('live-standings-update', (data: LiveStandingsUpdate) => {
      console.log('📡 Received live standings update:', data);
      this.onLiveStandingsUpdate?.(data);
    });

    this.socket.on('global-standings-update', (data: GlobalStandingsUpdate) => {
      console.log('🌍 Received global standings update:', data);
      this.onGlobalStandingsUpdate?.(data);
    });

    this.socket.on('league-data', (data) => {
      console.log('📊 Received league data:', data);
      this.onLeagueData?.(data);
    });

    this.socket.on('live-status-update', (data) => {
      console.log('⚡ Live status update:', data);
      this.onLiveStatusUpdate?.(data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.onError?.(error);
    });
  }

  private authenticate() {
    if (!this.socket || !this.isConnected) return;

    const token = localStorage.getItem('authToken');
    if (token) {
      this.socket.emit('authenticate', { token });
    } else {
      console.warn('⚠️ No auth token found for WebSocket authentication');
    }
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.onMaxReconnectAttemptsReached?.();
    }
  }

  // Public methods
  public joinLeague(leagueId: string) {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ WebSocket not connected, cannot join league');
      return;
    }

    this.socket.emit('join-league', { leagueId });
    console.log(`🏆 Joining league: ${leagueId}`);
  }

  public leaveLeague(leagueId: string) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('leave-league', { leagueId });
    console.log(`👋 Leaving league: ${leagueId}`);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }

  // Event handlers (to be set by components)
  public onAuthenticated?: (data: any) => void;
  public onLiveStandingsUpdate?: (data: LiveStandingsUpdate) => void;
  public onGlobalStandingsUpdate?: (data: GlobalStandingsUpdate) => void;
  public onLeagueData?: (data: any) => void;
  public onLiveStatusUpdate?: (data: any) => void;
  public onError?: (error: any) => void;
  public onMaxReconnectAttemptsReached?: () => void;
}

// Export singleton instance
export const websocketClient = new WebSocketClient();
export default websocketClient;
