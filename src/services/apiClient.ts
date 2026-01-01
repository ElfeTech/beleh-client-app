import type {
  ChatWorkflowResponse,
  DataSourceMetadata,
  DataSourceResponse,
  IntentRequest,
  UserCreate,
  UserResponse,
  WorkspaceCreate,
  WorkspaceResponse,
  ChatSessionCreate,
  ChatSessionRead,
  ChatMessageRead,
  WorkspaceContextResponse,
  UpdateWorkspaceStateRequest
} from '../types/api';
import type {
  CurrentUsageResponse,
  RemainingQuotaResponse,
  UsageSummary,
  QuotaCheckRequest,
  QuotaCheckResponse,
  HistoricalUsageResponse,
  DailyUsage,
  PlanListResponse,
  PlanResponse
} from '../types/usage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    // If body is NOT FormData, default to application/json
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      ...options,
      headers,
    };


    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized - token expired
      if (response.status === 401 && !isRetry) {

        try {
          // Attempt to refresh the token
          const { authService } = await import('./authService');
          const newToken = await authService.refreshToken();

          if (newToken) {

            // Update the Authorization header with the new token
            const updatedHeaders = {
              ...headers,
              'Authorization': `Bearer ${newToken}`,
            };

            // Retry the request with the new token
            return this.request<T>(endpoint, {
              ...options,
              headers: updatedHeaders,
            }, true); // Mark as retry to prevent infinite loop
          } else {
            // Refresh failed, redirect to sign-in
            console.error('[API] Token refresh failed, redirecting to sign-in');
            window.location.href = '/signin';
            throw new Error('Authentication session expired. Please sign in again.');
          }
        } catch (refreshError) {
          console.error('[API] Error during token refresh:', refreshError);
          window.location.href = '/signin';
          throw new Error('Authentication session expired. Please sign in again.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[API] Error response:', errorData);
        throw new Error(
          errorData.detail || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[API] Request failed:', error);
      throw error;
    }
  }

  async registerUser(idToken: string): Promise<UserResponse> {
    const payload: UserCreate = { token: idToken };

    return this.request<UserResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async loginUser(idToken: string): Promise<UserResponse> {
    const payload: UserCreate = { token: idToken };

    return this.request<UserResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDefaultWorkspace(authToken: string): Promise<WorkspaceResponse> {
    return this.request<WorkspaceResponse>('/api/workspaces/default', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async listWorkspaces(authToken: string): Promise<WorkspaceResponse[]> {
    return this.request<WorkspaceResponse[]>('/api/workspaces/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async createWorkspace(authToken: string, name: string): Promise<WorkspaceResponse> {
    const payload: WorkspaceCreate = { name };

    return this.request<WorkspaceResponse>('/api/workspaces/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async updateWorkspace(authToken: string, workspaceId: string, name: string): Promise<WorkspaceResponse> {
    const payload: WorkspaceCreate = { name };

    return this.request<WorkspaceResponse>(`/api/workspaces/${workspaceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async deleteWorkspace(authToken: string, workspaceId: string): Promise<void> {
    return this.request<void>(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async listWorkspaceDatasources(authToken: string, workspaceId: string): Promise<DataSourceResponse[]> {
    return this.request<DataSourceResponse[]>(`/api/datasets/workspaces/${workspaceId}/datasources`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async createDatasource(
    authToken: string,
    workspaceId: string,
    file: File,
    name?: string
  ): Promise<DataSourceResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }

    return this.request<DataSourceResponse>(`/api/datasets/workspaces/${workspaceId}/datasources`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });
  }

  async renameDatasource(
    authToken: string,
    datasourceId: string,
    name: string
  ): Promise<DataSourceResponse> {
    return this.request<DataSourceResponse>(`/api/datasets/datasources/${datasourceId}/rename`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name }),
    });
  }

  async overrideDatasource(
    authToken: string,
    datasourceId: string,
    file: File,
    name?: string
  ): Promise<DataSourceResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }

    return this.request<DataSourceResponse>(`/api/datasets/datasources/${datasourceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });
  }

  async deleteDatasource(authToken: string, datasourceId: string): Promise<void> {
    return this.request<void>(`/api/datasets/datasources/${datasourceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async sendChatMessage(
    authToken: string,
    question: string,
    datasourceId: string
  ): Promise<ChatWorkflowResponse> {
    const payload: IntentRequest = {
      prompt: question,
      dataset_id: datasourceId,
    };

    return this.request<ChatWorkflowResponse>('/api/chat/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async getDatasourceMetadata(
    authToken: string,
    datasourceId: string
  ): Promise<DataSourceMetadata> {
    return this.request<DataSourceMetadata>(`/api/datasets/datasources/${datasourceId}/metadata`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  // Chat Session Methods
  async createChatSession(
    authToken: string,
    datasetId: string,
    title?: string
  ): Promise<ChatSessionRead> {
    const payload: ChatSessionCreate = title ? { title } : {};

    return this.request<ChatSessionRead>(`/api/datasets/${datasetId}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async listChatSessions(
    authToken: string,
    datasetId: string
  ): Promise<ChatSessionRead[]> {
    return this.request<ChatSessionRead[]>(`/api/datasets/${datasetId}/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async getSessionMessages(
    authToken: string,
    sessionId: string
  ): Promise<ChatMessageRead[]> {
    const messages = await this.request<ChatMessageRead[]>(`/api/sessions/${sessionId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    return messages;
  }

  async addMessageToSession(
    authToken: string,
    sessionId: string,
    prompt: string,
    datasetId: string
  ): Promise<ChatWorkflowResponse> {
    const payload: IntentRequest = {
      prompt,
      dataset_id: datasetId,
    };

    return this.request<ChatWorkflowResponse>(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async deleteChatSession(
    authToken: string,
    sessionId: string
  ): Promise<void> {
    await this.request<void>(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  // Usage and Quota Methods
  async getCurrentUsage(
    authToken: string,
    workspaceId?: string
  ): Promise<CurrentUsageResponse> {
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return this.request<CurrentUsageResponse>(`/api/usage/${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async getRemainingQuota(authToken: string): Promise<RemainingQuotaResponse> {
    return this.request<RemainingQuotaResponse>('/api/usage/remaining', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async getUsageSummary(authToken: string): Promise<UsageSummary> {
    return this.request<UsageSummary>('/api/usage/summary', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async checkQuota(
    authToken: string,
    operation: 'query' | 'datasource' | 'member',
    workspaceId?: string
  ): Promise<QuotaCheckResponse> {
    const payload: QuotaCheckRequest = {
      operation,
      ...(workspaceId && { workspace_id: workspaceId })
    };

    return this.request<QuotaCheckResponse>('/api/usage/check', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async getHistoricalUsage(
    authToken: string,
    workspaceId?: string,
    days: number = 30
  ): Promise<HistoricalUsageResponse> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    params.append('days', days.toString());

    return this.request<HistoricalUsageResponse>(`/api/usage/history?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async getDailyUsage(
    authToken: string,
    workspaceId?: string,
    days: number = 7
  ): Promise<DailyUsage[]> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    params.append('days', days.toString());

    return this.request<DailyUsage[]>(`/api/usage/daily?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async getAvailablePlans(): Promise<PlanListResponse> {
    return this.request<PlanListResponse>('/api/usage/plans', {
      method: 'GET',
    });
  }

  async getCurrentPlan(authToken: string): Promise<PlanResponse> {
    return this.request<PlanResponse>('/api/usage/plan', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  // Workspace State Methods
  async getWorkspaceContext(
    authToken: string,
    workspaceId: string
  ): Promise<WorkspaceContextResponse> {
    return this.request<WorkspaceContextResponse>(`/api/workspaces/${workspaceId}/context`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }

  async updateWorkspaceState(
    authToken: string,
    workspaceId: string,
    payload: UpdateWorkspaceStateRequest
  ): Promise<void> {
    return this.request<void>(`/api/workspaces/${workspaceId}/state`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new APIClient(API_BASE_URL);
