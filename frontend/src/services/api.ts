// API Client for FPL Hub Backend
// This service handles all communication with the backend APIs
// Enhanced with optimization strategies from the Medium article

import { apiOptimizer } from '../utils/api-optimization';

// Detect environment and use appropriate API URL
const getApiBaseUrl = () => {
  // Check if we have an environment variable (for production)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Check if we're in production (deployed)
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    // Production: Use Railway backend URL
    return 'https://fplhub-production.up.railway.app/api';
  }
  
  // Check if we're accessing from a mobile device (IP address in URL)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // We're on mobile, use the same hostname but port 3000
    return `http://${window.location.hostname}:3000/api`;
  }
  
  // Default to localhost for desktop development
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  phone: string;
  role?: 'user' | 'moderator' | 'admin' | 'super_admin';
  adminLevel?: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  isVerified: boolean;
  fplTeamId?: number;
  createdAt: string;
}

interface Wallet {
  balance: number;
  currency: string;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'league_entry' | 'league_winnings';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

interface League {
  id: string;
  name: string;
  description?: string;
  type: 'PAID' | 'FREE';
  leagueFormat: 'CLASSIC' | 'HEAD_TO_HEAD';
  entryType: 'FREE' | 'PAID';
  entryFee?: number;
  maxTeams: number;
  season: number;
  startGameweek: number;
  endGameweek?: number;
  status: 'DRAFT' | 'OPEN' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  isPrivate: boolean;
  leagueCode?: string;
  prizeDistribution?: {
    type: 'TOP_3' | 'TOP_5' | 'TOP_10' | 'PERCENTAGE' | 'FIXED_POSITIONS';
    distribution?: Record<string, number>;
  };
  platformFeeType?: 'PERCENTAGE';
  platformFeeValue?: number;
  createdAt?: string;
  createdBy?: string;
  userTeams?: {
    teamName: string;
    currentRank: number;
  }[];
}

interface LeagueEntry {
  id: string;
  leagueId: string;
  userId: string;
  linkedTeamId: string;
  gameweekPoints: number;
  totalPoints: number;
  rank: number;
  previousRank?: number;
  status: 'active' | 'eliminated';
  joinedAt: string;
  league: League;
  linkedTeam: {
    id: string;
    teamName: string;
    fplTeamId: number;
    fplUrl: string;
  };
  user: {
    id: string;
    username: string;
  };
  liveProgress?: {
    captainStatus: 'PLAYED' | 'YET_TO_PLAY' | 'UNKNOWN' | 'ERROR';
    playersRemaining: number;
    totalPlayers: number;
    playersPlayed: number;
    gameweekProgress: number;
  };
}

interface LeaderboardEntry {
  id: string;
  userId: string;
  linkedTeamId: string;
  teamName: string;
  fplTeamId: number;
  fplUrl: string;
  username: string;
  rank: number;
  totalPoints: number;
  gameweekPoints: number;
  captainName?: string;
  captainPoints?: number;
  remainingPlayers?: number;
  estimatedPayout: number;
  entryTime: string;
  isDefault: boolean;
  leagueStatus: 'NOT_STARTED' | 'LIVE' | 'ERROR' | 'NO_ENTRIES';
}

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

interface FplSquad {
  team: {
    id: number;
    name: string;
    playerFirstName: string;
    playerLastName: string;
    totalPoints: number;
    overallRank: number;
    teamValue: number;
    bank: number;
    transfers: number;
    gameweek: number;
  };
  players: Array<{
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    team: string;
    teamId: number;
    position: string;
    positionId: number;
    price: number;
    points: number;
    form: string;
    selectedBy: string;
    status: string;
    photo: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
    multiplier: number;
    squadPosition: number;
  }>;
  chips: any[];
  automaticSubs: any[];
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  constructor() {
    this.baseURL = API_BASE_URL;
    // Don't load token from localStorage on startup to prevent issues
    this.token = null;
  }

  private loadToken() {
    // Always check localStorage for the latest token to handle token changes
    const latestToken = localStorage.getItem('auth_token');
    if (latestToken !== this.token) {
      this.token = latestToken;
    }
    return this.token;
  }

  // Simple cache helpers with localStorage fallback for page reloads
  private getFromCache<T>(key: string): T | null {
    const now = Date.now();
    const mem = this.cache.get(key);
    if (mem && mem.expiry > now) return mem.data as T;
    try {
      const raw = localStorage.getItem(`cache:${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.expiry > now) return parsed.data as T;
    } catch {}
    return null;
  }

  private setToCache<T>(key: string, data: T, ttlMs: number = 30_000) {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry });
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify({ data, expiry }));
    } catch {}
  }

  // Public method to clear specific cache entries
  clearCache(key: string): void {
    this.cache.delete(key);
    try {
      localStorage.removeItem(`cache:${key}`);
    } catch (e) {
      console.warn('Failed to clear cache from localStorage:', e);
    }
  }

  // Clear all cache entries
  clearAllCache(): void {
    this.cache.clear();
    // Also clear localStorage cache entries
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`All API cache cleared (${keysToRemove.length} localStorage entries removed)`);
  }

  // Clear user-specific cache (useful for user switching)
  clearUserCache(userId?: string): void {
    if (userId) {
      // Clear specific user's cache
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId));
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        localStorage.removeItem(`cache:${key}`);
      });
      console.log(`Cleared cache for user ${userId}: ${keysToDelete.length} entries`);
    } else {
      // Clear all user-specific cache entries
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes('linkedTeams_') || 
        key.includes('transactions_') || 
        key.includes('userLeagues_')
      );
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        localStorage.removeItem(`cache:${key}`);
      });
      console.log(`Cleared user-specific cache: ${keysToDelete.length} entries`);
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    // Use the optimized request with retry logic for non-auth endpoints
    if (endpoint.includes('/auth/')) {
      // For auth endpoints, use faster timeout and no retry to avoid blocking login
      return this.makeRequest<T>(endpoint, options, retryCount);
    } else {
      // For other endpoints, use the optimized retry logic
      return apiOptimizer.retryWithBackoff(async () => {
        return this.makeRequest<T>(endpoint, options, retryCount);
      });
    }
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}?t=${Date.now()}`;
    console.log('API request URL:', url);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const token = this.loadToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      // Debug: Log token usage for sensitive endpoints
      if (endpoint.includes('/user/') || endpoint.includes('/leagues/user/') || endpoint.includes('/wallet/')) {
        console.log(`API call to ${endpoint} using token: ${token.substring(0, 20)}...`);
      }
    }

    // Add timeout to prevent hanging
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        // Use shorter timeout for auth endpoints to avoid blocking login
        const timeoutDuration = endpoint.includes('/auth/') ? 10000 : 15000;
        timeoutId = setTimeout(() => {
          reject(new Error('Request timeout - server is taking too long to respond. Please try again.'));
        }, timeoutDuration);
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        }),
        timeoutPromise
      ]);

      // Clear timeout if request completed successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData = null;
        
        try {
          errorData = await response.json();
          // Check for detailed validation errors first
          if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
            // Find the most specific error message (skip generic "Invalid value" messages)
            const specificError = errorData.details.find(detail => 
              detail.message && !detail.message.toLowerCase().includes('invalid value')
            );
            errorMessage = specificError?.message || errorData.details[0].message || errorData.error || errorData.message || errorMessage;
          } else {
            // Check for both 'error' and 'message' fields in the response
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        
        const error = new Error(errorMessage);
        if (errorData) {
          error.response = { data: errorData };
        }
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Clean up timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (error.name === 'AbortError') {
        // More specific error handling for AbortError
        console.log('AbortError details:', {
          aborted: controller.signal.aborted,
          reason: controller.signal.reason,
          url: url
        });
        
        throw new Error('Request was cancelled. This might be due to navigation or component unmounting. Please try again.');
      }
      
      // Retry logic for timeout errors (skip for auth endpoints to avoid blocking login)
      if (error.message.includes('Request timeout') && retryCount < 2 && !endpoint.includes('/auth/')) {
        console.log(`Retrying request (attempt ${retryCount + 1}/3) for ${endpoint}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.request<T>(endpoint, options, retryCount + 1);
      }
      
      if (error.message.includes('Request timeout')) {
        const errorMessage = endpoint.includes('/auth/') 
          ? 'Login request timed out. Please check your connection and try again.'
          : 'Request timeout - server is taking too long to respond. Please try again.';
        throw new Error(errorMessage);
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to backend server - please ensure it\'s running on http://localhost:3000');
      }
      
      throw error;
    }
  }

  // Authentication
  async login(identifier: string, password: string): Promise<{ user: User; token: string }> {
    // Determine if identifier is email or username
    const isEmail = identifier.includes('@');
    const requestBody = isEmail 
      ? { email: identifier, password }
      : { username: identifier, password };
    
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (response.success && response.data) {
      this.token = response.data.token;
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data!;
  }

  async register(userData: {
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
    phone: string;
    consentGiven: boolean;
  }): Promise<{ success: boolean; message: string; data: any }> {
    const response = await this.request<{ success: boolean; message: string; data: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response;
  }

  async verifyOtp(otpCode: string, phone?: string): Promise<{ user: User; token: string }> {
    // Get phone number from parameter or sessionStorage (for backward compatibility)
    let phoneNumber = phone;
    if (!phoneNumber) {
      const pendingSignup = JSON.parse(sessionStorage.getItem('pending_signup') || '{}');
      phoneNumber = pendingSignup.phone;
    }
    
    if (!phoneNumber) {
      throw new Error('Phone number not found. Please try again.');
    }
    
    const response = await this.request<{ user: User; token: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: phoneNumber, otpCode }),
    });

    if (response.success && response.data) {
      // Clear any old authentication data first
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      this.clearAllCache();
      
      // Set new authentication data
      this.token = response.data.token;
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('OTP verification successful - cleared old data and set new token for user:', response.data.user.email);
    }

    return response.data!;
  }

  async resendOtp(phoneOrUserId?: string): Promise<{ message: string }> {
    // Get data from parameter or sessionStorage (for backward compatibility)
    let requestData;
    if (phoneOrUserId) {
      // Check if it's a userId (UUID format) or phone number
      const isUserId = phoneOrUserId.includes('-') && phoneOrUserId.length > 20;
      requestData = isUserId ? { userId: phoneOrUserId } : { phone: phoneOrUserId };
    } else {
      const pendingSignup = JSON.parse(sessionStorage.getItem('pending_signup') || '{}');
      if (pendingSignup.userId) {
        requestData = { userId: pendingSignup.userId };
      } else if (pendingSignup.phone) {
        requestData = { phone: pendingSignup.phone };
      }
    }
    
    if (!requestData) {
      throw new Error('User information not found. Please try again.');
    }
    
    const response = await this.request<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
    return response.data!;
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  // User Profile
  async getProfile(): Promise<User> {
    const response = await this.request<any>('/user/profile');
    // Normalize varied backend shapes
    const payload = response?.data ?? response;
    const candidate = payload?.user ?? payload?.data?.user ?? (payload && payload.id ? payload : undefined);
    if (!candidate) {
      console.warn('Unexpected getProfile response structure:', response);
      // Fallback to locally stored user to avoid undefined
      const local = this.getCurrentUser();
      if (local) return local as User;
      throw new Error('Invalid profile response');
    }
    return candidate as User;
  }

  async updateProfile(data: { username?: string; email?: string }): Promise<User> {
    const response = await this.request<{ user: User }>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data!.user;
  }

  // Wallet
  async getWallet(): Promise<Wallet> {
    return apiOptimizer.getWithBackgroundRefresh(
      'wallet',
      async () => {
        const response = await this.request<{ data: { balance: number; currency: string } }>('/wallet/balance');
        console.log('Wallet API response:', response);
        let wallet: Wallet;
        if (response.data && response.data.data) {
          wallet = { balance: response.data.data.balance, currency: response.data.data.currency, transactions: [] as any } as Wallet;
        } else if (response.data && (response.data as any).balance !== undefined) {
          wallet = { balance: (response.data as any).balance, currency: (response.data as any).currency || 'GHS', transactions: [] as any } as Wallet;
        } else {
          console.warn('Unexpected wallet response structure:', response);
          wallet = { balance: 0, currency: 'GHS', transactions: [] as any } as Wallet;
        }
        return wallet;
      },
      120_000, // 2 minutes cache
      60_000   // 1 minute stale time
    );
  }

  async getTransactions(): Promise<Transaction[]> {
    // Get current user ID for user-specific caching
    const currentUser = this.getCurrentUser();
    const cacheKey = `transactions_${currentUser?.id || 'anonymous'}`;
    
    const cached = this.getFromCache<Transaction[]>(cacheKey);
    if (cached) return cached;
    
    const response = await this.request<{ data: Transaction[] }>('/wallet/transactions');
    console.log('getTransactions API response:', response);
    let tx: Transaction[] = [];
    if (response.data && Array.isArray((response.data as any).data)) tx = (response.data as any).data;
    else if (response.data && Array.isArray(response.data as any)) tx = response.data as any;
    else if (Array.isArray((response as any).data)) tx = (response as any).data;
    else console.warn('Unexpected getTransactions response structure:', response);
    this.setToCache(cacheKey, tx, 60_000);
    return tx;
  }

  async deposit(data: {
    amount: number;
    method: 'momo' | 'card';
    phoneNumber?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
    cardName?: string;
  }): Promise<{ message: string; transactionId: string }> {
    const response = await this.request<{ message: string; data: { payment: any; newBalance: number } }>('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      message: response.data!.message,
      transactionId: response.data!.data.payment.id
    };
  }

  async withdraw(data: {
    amount: number;
    method: 'momo' | 'bank';
    phoneNumber?: string;
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
  }): Promise<{ message: string; transactionId: string }> {
    const response = await this.request<{ message: string; data: any }>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      message: response.data!.message,
      transactionId: response.data!.data.id
    };
  }

  // FPL Teams
  async getLinkedTeams(): Promise<LinkedTeam[]> {
    // Get current user ID for user-specific caching
    const currentUser = this.getCurrentUser();
    const cacheKey = `linkedTeams_${currentUser?.id || 'anonymous'}`;
    
    console.log('🔍 getLinkedTeams - Cache key:', cacheKey);
    const cached = this.getFromCache<LinkedTeam[]>(cacheKey);
    if (cached) {
      console.log('📦 getLinkedTeams - Using cached data:', cached.length, 'teams');
      return cached;
    }
    
    console.log('🌐 getLinkedTeams - Fetching fresh data from API...');
    const response = await this.request<{ teams: LinkedTeam[] }>('/user/linked-teams');
    console.log('📊 getLinkedTeams API response:', response);
    let teams: LinkedTeam[] = [];
    if (response.data && Array.isArray((response.data as any).teams)) teams = (response.data as any).teams;
    else if (response.data && Array.isArray(response.data as any)) teams = response.data as any;
    else if (Array.isArray((response as any).data)) teams = (response as any).data;
    else console.warn('Unexpected getLinkedTeams response structure:', response);
    
    console.log('💾 getLinkedTeams - Caching', teams.length, 'teams');
    this.setToCache(cacheKey, teams, 180_000); // 3 minutes cache for linked teams
    return teams;
  }

  async linkFplTeam(fplUrl: string, teamName?: string): Promise<{ message: string; team: LinkedTeam }> {
    try {
      const response = await this.request<{ message: string; team: LinkedTeam }>('/user/link-fpl-team', {
        method: 'POST',
        body: JSON.stringify({ fplUrl }),
      });
      return response.data!;
    } catch (error: any) {
      // Re-throw with more specific error handling for link team errors
      if (error.message.includes('409')) {
        throw new Error('This FPL team is already linked to another account. Please choose a different team.');
      } else if (error.message.includes('400')) {
        throw new Error('Maximum of 10 linked teams reached. Please unlink a team first to add a new one.');
      }
      throw error;
    }
  }

  async unlinkFplTeam(teamId: string): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>(`/user/unlink-fpl-team/${teamId}`, {
      method: 'DELETE',
    });
    return response.data!;
  }

  async getFplSquad(teamId: number): Promise<FplSquad> {
    const response = await this.request<{ squad: FplSquad }>(`/user/fpl-squad/${teamId}`);
    return response.data!.squad;
  }

  // Get public FPL team information (for searching/linking teams)
  async getFplTeam(teamId: number): Promise<any> {
    const response = await this.request<any>(`/fpl/team/${teamId}`);
    return response;
  }

  // Leagues
  async getUserLeagues(): Promise<LeagueEntry[]> {
    // Get current user ID for user-specific caching
    const currentUser = this.getCurrentUser();
    const cacheKey = `userLeagues_${currentUser?.id || 'anonymous'}`;
    
    const cached = this.getFromCache<LeagueEntry[]>(cacheKey);
    if (cached) {
      console.log('📦 getUserLeagues - Using cached data:', cached.length, 'entries');
      return cached;
    }
    
    console.log('🌐 getUserLeagues - Fetching fresh data from API...');
    const response = await this.request<{ data: LeagueEntry[] }>('/leagues/user/entries');
    console.log('📊 getUserLeagues API response:', response);
    let entries: LeagueEntry[] = [];
    if (response.data && Array.isArray(response.data)) entries = response.data;
    else if (response.data && Array.isArray((response.data as any).entries)) entries = (response.data as any).entries;
    else if (Array.isArray((response as any).data)) entries = (response as any).data;
    else console.warn('Unexpected getUserLeagues response structure:', response);
    
    console.log('💾 getUserLeagues - Caching', entries.length, 'entries');
    this.setToCache(cacheKey, entries, 300_000); // 5 minutes cache for leagues
    return entries;
  }

  async joinLeague(leagueId: string, linkedTeamId: string, leagueCode?: string): Promise<{ success: boolean; message: string; data?: any }> {
    console.log('joinLeague called with:', { leagueId, linkedTeamId, leagueCode });
    const url = `/leagues/${leagueId}/join`;
    console.log('API URL:', url);
    const response = await this.request<{ success: boolean; message: string; data?: any }>(url, {
      method: 'POST',
      body: JSON.stringify({
        linkedTeamId,
        leagueCode
      })
    });
    return response;
  }

  async bulkJoinLeague(leagueId: string, linkedTeamIds: string[], leagueCode?: string): Promise<{ success: boolean; message: string; data?: any }> {
    console.log('bulkJoinLeague called with:', { leagueId, linkedTeamIds, leagueCode });
    const url = `/leagues/${leagueId}/bulk-join`;
    console.log('API URL:', url);
    const response = await this.request<{ success: boolean; message: string; data?: any }>(url, {
      method: 'POST',
      body: JSON.stringify({
        linkedTeamIds,
        leagueCode
      })
    });
    return response;
  }

  async getLeagueLeaderboard(leagueId: string, forceRefresh: boolean = false, fastMode: boolean = false): Promise<{ leaderboard: LeaderboardEntry[]; leagueInfo: any }> {
    const cacheKey = `leaderboard_${leagueId}_${fastMode ? 'fast' : 'full'}`;
    
    if (!forceRefresh) {
      const cached = this.getFromCache<{ leaderboard: LeaderboardEntry[]; leagueInfo: any }>(cacheKey);
      if (cached) {
        console.log('📦 Returning cached leaderboard data');
        
        // Background refresh if data is stale (older than 15 seconds for live data)
        const cacheAge = Date.now() - (this.cache.get(cacheKey)?.timestamp || 0);
        if (cacheAge > 15_000) {
          console.log('🔄 Background refreshing stale leaderboard data...');
          this.getLeagueLeaderboard(leagueId, true, fastMode).catch(() => {
            // Silent fail for background refresh
          });
        }
        
        return cached;
      }
    }
    
    try {
      const url = `/leagues/${leagueId}/leaderboard${fastMode ? '?fast=true' : ''}`;
      const response = await this.request<{ success: boolean; data: { leaderboard: LeaderboardEntry[]; leagueInfo: any } }>(url, {
        timeout: fastMode ? 3000 : 8000 // Shorter timeouts for better UX
      });
      console.log('getLeagueLeaderboard API response:', response);
      
      if (response.success && response.data) {
        // Store with timestamp for background refresh logic
        const dataWithTimestamp = {
          ...response.data,
          timestamp: Date.now()
        };
        this.setToCache(cacheKey, dataWithTimestamp, fastMode ? 30_000 : 15_000); // Optimized cache times
        return response.data;
      } else {
        console.warn('Unexpected getLeagueLeaderboard response structure:', response);
        return { leaderboard: [], leagueInfo: null };
      }
    } catch (error: any) {
      console.warn('getLeagueLeaderboard failed:', error.message);
      
      // If full mode failed, try fast mode as fallback
      if (!fastMode) {
        console.log('Falling back to fast mode...');
        return this.getLeagueLeaderboard(leagueId, forceRefresh, true);
      }
      
      return { leaderboard: [], leagueInfo: null };
    }
  }

  // Prefetch helpers to warm cache without blocking UI
  prefetchDashboardData(): void {
    Promise.allSettled([
      this.getWallet(),
      this.getUserLeagues(),
      this.getLinkedTeams(),
    ]).then(() => {
      console.log('Prefetched dashboard cache');
    }).catch(() => {});
  }

  // Auto-refresh leaderboard for live data
  private leaderboardRefreshInterval: NodeJS.Timeout | null = null;
  
  startLeaderboardAutoRefresh(leagueId: string, intervalMs: number = 30000): void {
    this.stopLeaderboardAutoRefresh();
    
    this.leaderboardRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing leaderboard...');
      this.getLeagueLeaderboard(leagueId, true, false).catch(() => {
        // Silent fail for auto-refresh
      });
    }, intervalMs);
    
    console.log(`✅ Started auto-refresh for leaderboard every ${intervalMs}ms`);
  }
  
  stopLeaderboardAutoRefresh(): void {
    if (this.leaderboardRefreshInterval) {
      clearInterval(this.leaderboardRefreshInterval);
      this.leaderboardRefreshInterval = null;
      console.log('🛑 Stopped leaderboard auto-refresh');
    }
  }

  // Background refresh for stale data
  backgroundRefreshDashboard(): void {
    // Only refresh if data is stale, don't block UI
    Promise.allSettled([
      this.getWallet(), // Uses background refresh internally
      this.getUserLeagues(),
      this.getLinkedTeams(),
    ]).then(() => {
      console.log('Background dashboard refresh completed');
    }).catch(() => {});
  }

  async getPublicLeagues(): Promise<League[]> {
    const response = await this.request<{ leagues: League[] }>('/leagues/public');
    return response.data!.leagues;
  }

  async createLeague(leagueData: {
    name: string;
    leagueFormat: 'CLASSIC' | 'HEAD_TO_HEAD';
    entryType: 'FREE' | 'PAID';
    entryFee?: number;
    maxTeams: number;
    startGameweek: number;
    endGameweek?: number;
    prizeDistribution: {
      type: 'TOP_3' | 'TOP_5' | 'TOP_10' | 'PERCENTAGE' | 'FIXED_POSITIONS';
      distribution?: Record<string, number>;
    };
    isPrivate: boolean;
  }): Promise<{ message: string; league: League }> {
    const response = await this.request<{ message: string; league: League }>('/leagues/create', {
      method: 'POST',
      body: JSON.stringify(leagueData),
    });
    return response.data!;
  }


  async getCurrentLeagues(): Promise<{
    currentGameweek: any;
    leagues: League[];
  }> {
    const response = await this.request<{
      currentGameweek: any;
      leagues: League[];
    }>('/leagues/current');
    return response.data!;
  }

  async getUpcomingLeagues(): Promise<{
    currentGameweek: any;
    nextGameweek: any;
    leagues: League[];
  }> {
    const response = await this.request<{
      currentGameweek: any;
      nextGameweek: any;
      leagues: League[];
    }>('/leagues/upcoming');
    return response.data!;
  }

  async getLeagueById(leagueId: string): Promise<{
    league: League;
    standings: LeagueEntry[];
  }> {
    const response = await this.request<{
      league: League;
      standings: LeagueEntry[];
    }>(`/leagues/${leagueId}`);
    return response.data!;
  }

  async getLeagueStandings(leagueId: string, enhanced: boolean = false): Promise<{
    enhanced: boolean;
    liveProgress: string;
    data: LeagueEntry[];
  }> {
    const response = await this.request<{
      enhanced: boolean;
      liveProgress: string;
      data: LeagueEntry[];
    }>(`/leagues/${leagueId}/standings?enhanced=${enhanced}`);
    return response.data!;
  }

  async calculatePrizeDistribution(data: {
    entryFee: number;
    participantCount: number;
    distributionType: string;
    fixedPrizes?: Record<string, number>;
  }): Promise<{
    totalPrizePool: number;
    platformFee: number;
    distributableAmount: number;
    distribution: Record<string, number>;
  }> {
    const response = await this.request('/leagues/calculate-prize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  // User Settings
  async getUserSettings(): Promise<{
    profile: User;
    settings: {
      notifications: {
        email: boolean;
        sms: boolean;
      };
    };
  }> {
    const response = await this.request('/user/settings');
    return response.data!;
  }

  async updateUserSettings(settings: {
    notifications?: {
      email?: boolean;
      sms?: boolean;
    };
  }): Promise<{ message: string }> {
    const response = await this.request('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return response.data!;
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const response = await this.request('/user/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  // Phone Change OTP
  async initiatePhoneChange(newPhoneNumber: string): Promise<{
    message: string;
    data: {
      newPhoneNumber: string;
      expiresIn: number;
    };
  }> {
    const response = await this.request('/user/phone/change', {
      method: 'POST',
      body: JSON.stringify({ newPhoneNumber }),
    });
    return response.data!;
  }

  async verifyPhoneChangeOtp(otpCode: string): Promise<{
    message: string;
    data: { user: User };
  }> {
    const response = await this.request('/user/phone/verify', {
      method: 'POST',
      body: JSON.stringify({ otpCode }),
    });
    return response.data!;
  }

  async cancelPhoneChange(): Promise<{ message: string }> {
    const response = await this.request('/user/phone/change', {
      method: 'DELETE',
    });
    return response.data!;
  }

  async getPhoneChangeStatus(): Promise<{
    data: {
      hasPendingChange: boolean;
      isExpired: boolean;
      newPhoneNumber: string | null;
      expiresAt: string | null;
    };
  }> {
    const response = await this.request('/user/phone/status');
    return response.data!;
  }

  // Admin APIs
  async getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalLeagues: number;
    paidLeagues: number;
    freeLeagues: number;
    totalLeagueEntries: number;
    totalLinkedTeams: number;
    recentUsers: number;
    recentLeagues: number;
    lastUpdated: string;
  }> {
    const response = await this.request('/admin/statistics');
    return response.data!;
  }

  async getAllUsers(): Promise<User[]> {
    const response = await this.request<{ data: User[] }>('/admin/users');
    return response.data!.data;
  }

  async getAdminUsers(): Promise<User[]> {
    const response = await this.request<{ data: User[] }>('/admin/users/admins');
    return response.data!.data;
  }

  async createAdminUser(data: {
    email: string;
    username: string;
    password: string;
    phone: string;
    role: string;
  }): Promise<{ message: string; data: User }> {
    const response = await this.request('/admin/users/create-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async promoteUser(userId: string): Promise<{ message: string }> {
    const response = await this.request('/admin/users/promote', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return response.data!;
  }

  async demoteUser(userId: string): Promise<{ message: string }> {
    const response = await this.request('/admin/users/demote', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return response.data!;
  }

  async updateUserRole(userId: string, role: string): Promise<{ message: string }> {
    const response = await this.request(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return response.data!;
  }

  async getRoleHierarchy(): Promise<{
    roles: Array<{
      name: string;
      level: number;
      permissions: string[];
    }>;
  }> {
    const response = await this.request('/admin/rbac/roles');
    return response.data!;
  }

  async getAllUsersWithRoles(): Promise<User[]> {
    const response = await this.request<{ data: User[] }>('/admin/rbac/users');
    return response.data!.data;
  }

  async assignRole(userId: string, role: string): Promise<{ message: string }> {
    const response = await this.request('/admin/rbac/assign-role', {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
    return response.data!;
  }

  async createWeeklyLeagues(data: {
    gameweek: number;
    season: number;
    platformFeeType?: string;
    platformFeeValue?: number;
  }): Promise<{ message: string; data: League[] }> {
    const response = await this.request('/admin/leagues/create-weekly', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async getGameweekLeagues(gameweek: number): Promise<League[]> {
    const response = await this.request<{ success: boolean; data: League[] }>(`/leagues/gameweek/${gameweek}`);
    console.log('API Client - getGameweekLeagues response:', response);
    console.log('API Client - response.data:', response.data);
    return response.data || [];
  }

  // Additional Admin Methods
  async getAllUsers(): Promise<any[]> {
    const response = await this.request<{ success: boolean; data: any[] }>('/admin/users');
    return response.data || [];
  }

  async createUser(userData: any): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response.data;
  }

  async banUser(userId: string, reason?: string): Promise<void> {
    await this.request(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async unbanUser(userId: string): Promise<void> {
    await this.request(`/admin/users/${userId}/unban`, {
      method: 'POST'
    });
  }

  async verifyUser(userId: string): Promise<void> {
    await this.request(`/admin/users/${userId}/verify`, {
      method: 'POST'
    });
  }

  async resetUserPassword(userId: string): Promise<void> {
    await this.request(`/admin/users/${userId}/reset-password`, {
      method: 'POST'
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async createLeague(leagueData: any): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>('/admin/leagues', {
      method: 'POST',
      body: JSON.stringify(leagueData)
    });
    return response.data;
  }

  async updateLeague(leagueId: string, leagueData: any): Promise<void> {
    await this.request(`/admin/leagues/${leagueId}`, {
      method: 'PUT',
      body: JSON.stringify(leagueData)
    });
  }

  async activateLeague(leagueId: string): Promise<void> {
    await this.request(`/admin/leagues/${leagueId}/activate`, {
      method: 'POST'
    });
  }

  async pauseLeague(leagueId: string): Promise<void> {
    await this.request(`/admin/leagues/${leagueId}/pause`, {
      method: 'POST'
    });
  }

  async cancelLeague(leagueId: string): Promise<void> {
    await this.request(`/admin/leagues/${leagueId}/cancel`, {
      method: 'POST'
    });
  }

  async deleteLeague(leagueId: string): Promise<void> {
    await this.request(`/admin/leagues/${leagueId}`, {
      method: 'DELETE'
    });
  }

  async duplicateLeague(leagueId: string): Promise<void> {
    await this.request(`/admin/leagues/${leagueId}/duplicate`, {
      method: 'POST'
    });
  }

  async getAllTransactions(): Promise<any[]> {
    const response = await this.request<{ success: boolean; data: any[] }>('/admin/transactions');
    return response.data || [];
  }

  async getFinancialStats(): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>('/admin/financial/stats');
    return response.data || {};
  }

  async approveTransaction(transactionId: string): Promise<void> {
    await this.request(`/admin/transactions/${transactionId}/approve`, {
      method: 'POST'
    });
  }

  async rejectTransaction(transactionId: string): Promise<void> {
    await this.request(`/admin/transactions/${transactionId}/reject`, {
      method: 'POST'
    });
  }

  async refundTransaction(transactionId: string): Promise<void> {
    await this.request(`/admin/transactions/${transactionId}/refund`, {
      method: 'POST'
    });
  }

  async getAnalytics(timeRange?: string): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>(`/admin/analytics?timeRange=${timeRange || '30d'}`);
    return response.data || {};
  }

  async getSystemSettings(): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>('/admin/settings');
    return response.data || {};
  }

  async updateSystemSettings(settings: any): Promise<void> {
    await this.request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  async getSystemLogs(filters?: any): Promise<any[]> {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await this.request<{ success: boolean; data: any[] }>(`/admin/logs?${queryParams}`);
    return response.data || [];
  }

  async getLogStats(): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>('/admin/logs/stats');
    return response.data || {};
  }

  async clearSystemLogs(): Promise<void> {
    await this.request('/admin/logs', {
      method: 'DELETE'
    });
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.loadToken();
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}

export const apiClient = new ApiClient();
export type { User, Wallet, Transaction, League, LeagueEntry, LinkedTeam, FplSquad, LeaderboardEntry };
