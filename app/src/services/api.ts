import AsyncStorage from '@react-native-async-storage/async-storage';

// const API_BASE_URL = 'http://10.213.86.197:5000';
const API_BASE_URL = 'https://qova-j40s.onrender.com';

const TOKEN_KEY = '@qova_auth_token';

let cachedToken: string | null = null;
let useFallbackStorage = false;
const inMemoryStorage: Record<string, string> = {};

// Helper to interact with web localStorage if available, or in-memory storage
const fallbackStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (_) {}
    return inMemoryStorage[key] || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch (_) {}
    inMemoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch (_) {}
    delete inMemoryStorage[key];
  }
};

export async function setToken(token: string): Promise<void> {
  cachedToken = token;
  if (useFallbackStorage) {
    fallbackStorage.setItem(TOKEN_KEY, token);
    return;
  }
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.warn('[Storage] AsyncStorage failed, falling back to memory/localStorage:', e);
    useFallbackStorage = true;
    fallbackStorage.setItem(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (useFallbackStorage) {
    return fallbackStorage.getItem(TOKEN_KEY);
  }
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
    return cachedToken;
  } catch (e) {
    console.warn('[Storage] AsyncStorage failed, falling back to memory/localStorage:', e);
    useFallbackStorage = true;
    return fallbackStorage.getItem(TOKEN_KEY);
  }
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  if (useFallbackStorage) {
    fallbackStorage.removeItem(TOKEN_KEY);
    return;
  }
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn('[Storage] AsyncStorage failed, falling back to memory/localStorage:', e);
    useFallbackStorage = true;
    fallbackStorage.removeItem(TOKEN_KEY);
  }
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = await getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${response.status}`);
    }

    if (!response.ok || !json.success) {
      throw new Error(json.message || `Request failed with status ${response.status}`);
    }

    return json.data;
  } catch (error: any) {
    console.warn(`[API Request Error] ${url}:`, error.message);
    throw error;
  }
}

export const api = {
  // Auth
  async sendOtp(phone: string): Promise<void> {
    await request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOtp(phone: string, code: string): Promise<{ token: string; user: { id: string; phone: string; name: string } }> {
    const data = await request<{ token: string; user: { id: string; phone: string; name: string } }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  async completeProfile(bankAccountNumber: string, bankCode: string): Promise<{ user: { id: string; phone: string; name: string; bank_account_number: string; bank_name: string } }> {
    return await request<{ user: { id: string; phone: string; name: string; bank_account_number: string; bank_name: string } }>('/auth/complete-profile', {
      method: 'POST',
      body: JSON.stringify({ bank_account_number: bankAccountNumber, bank_code: bankCode }),
    });
  },

  // Users
  async getProfile(): Promise<{ user: { id: string; phone: string; name: string; bank_account_number?: string; bank_name?: string; reliability_score: number } }> {
    return await request('/users/me', {
      method: 'GET',
    });
  },

  async getReliabilityScore(): Promise<{ score: number; label: string; breakdown: { contributions_paid: number; late_or_missed: number; pots_completed: number } }> {
    return await request<{ score: number; label: string; breakdown: { contributions_paid: number; late_or_missed: number; pots_completed: number } }>('/users/me/reliability', {
      method: 'GET',
    });
  },

  // Circles
  async createCircle(params: {
    name: string;
    contribution_amount: number; // in kobo
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    total_slots: number;
    payout_order_type?: 'AUTO' | 'MANUAL';
    start_condition?: 'AUTO' | 'MANUAL';
  }): Promise<{ id: string; name: string; invite_code: string }> {
    const data = await request<{ circle: { id: string; name: string; invite_code: string } }>('/circles', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data.circle;
  },

  async getMyCircles(): Promise<{
    current: Array<{
      id: string;
      name: string;
      invite_code: string;
      contribution_amount: number;
      frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
      total_slots: number;
      status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
      payout_order: string[];
      current_cycle: number;
      admin: { id: string; name: string };
      _count: { memberships: number };
      slot_number: number;
    }>;
    past: Array<{
      id: string;
      name: string;
      invite_code: string;
      contribution_amount: number;
      frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
      total_slots: number;
      status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
      current_cycle: number;
      admin: { id: string; name: string };
      _count: { memberships: number };
      slot_number: number;
    }>;
  }> {
    return await request('/users/me/circles', {
      method: 'GET',
    });
  },

  // Banks
  async getBanks(): Promise<Array<{ code: string; name: string; logo?: string | null }>> {
    return await request<Array<{ code: string; name: string; logo?: string | null }>>('/banks', {
      method: 'GET',
    });
  },

  // Circle Details
  async getCircle(id: string): Promise<{ circle: any }> {
    return await request(`/circles/${id}`, {
      method: 'GET',
    });
  },

  async getCircleByInvite(inviteCode: string): Promise<{ circle: any }> {
    return await request(`/circles/by-invite/${inviteCode}`, {
      method: 'GET',
    });
  },

  async joinCircle(inviteCode: string): Promise<{ membership: any; circle: any; circle_started: boolean }> {
    return await request('/circles/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    });
  },

  async getCircleHistory(id: string): Promise<{ history: any[] }> {
    return await request(`/circles/${id}/history`, {
      method: 'GET',
    });
  },

  async getCircleMembers(id: string): Promise<{ members: any[] }> {
    return await request(`/circles/${id}/members`, {
      method: 'GET',
    });
  },

  async startCircle(id: string): Promise<any> {
    return await request(`/circles/${id}/start`, {
      method: 'POST',
    });
  },

  // Contributions
  async getContributions(circleId: string): Promise<{ cycle: number; contributions: any[] }> {
    return await request(`/contributions/${circleId}`, {
      method: 'GET',
    });
  },

  async payContribution(circleId: string): Promise<{ account_number: string; bank_name: string; account_ref: string; amount_kobo: number; due_date: string }> {
    return await request('/contributions/pay', {
      method: 'POST',
      body: JSON.stringify({ circle_id: circleId }),
    });
  },

  async simulatePayment(accountRef: string): Promise<any> {
    return await request('/contributions/simulate-payment', {
      method: 'POST',
      body: JSON.stringify({ account_ref: accountRef }),
    });
  },

  // Auto-debit mandates (per-member, individual opt-in)
  async getMandate(circleId: string): Promise<{ status: string; activation_note: string | null; last_debit_at: string | null; amount: number } | null> {
    try {
      return await request(`/circles/${circleId}/mandate`, { method: 'GET' });
    } catch (e: any) {
      // No mandate yet → backend returns 404 "No auto-debit mandate found for this circle"
      if (e.message?.toLowerCase().includes('no auto-debit mandate')) return null;
      throw e;
    }
  },

  async enableAutoDebit(circleId: string): Promise<{ mandate_id: string; status: string; activation_note: string | null }> {
    return await request(`/circles/${circleId}/mandate`, { method: 'POST' });
  },

  async disableAutoDebit(circleId: string): Promise<{ status: string }> {
    return await request(`/circles/${circleId}/mandate`, { method: 'DELETE' });
  },

  // Payout order (admin only, MANUAL circles) — array of user IDs in payout sequence
  async setPayoutOrder(circleId: string, payoutOrder: string[]): Promise<{ payout_order: string[] }> {
    return await request(`/circles/${circleId}/payout-order`, {
      method: 'POST',
      body: JSON.stringify({ payout_order: payoutOrder }),
    });
  },

  // Card autopay — pay this cycle by card + tokenize it for automatic future charges
  async setupCardAutopay(circleId: string): Promise<{ checkout_link: string; order_reference: string; amount_kobo: number; status: string }> {
    return await request(`/circles/${circleId}/card-autopay`, { method: 'POST' });
  },

  async getCardAutopay(circleId: string): Promise<{ status: string; card_type: string | null; card_pan_masked: string | null; last_charge_at: string | null; token_expires_at: string | null } | null> {
    try {
      return await request(`/circles/${circleId}/card-autopay`, { method: 'GET' });
    } catch (e: any) {
      if (e.message?.toLowerCase().includes('no card autopay')) return null;
      throw e;
    }
  },

  async cancelCardAutopay(circleId: string): Promise<{ status: string }> {
    return await request(`/circles/${circleId}/card-autopay`, { method: 'DELETE' });
  },
};
