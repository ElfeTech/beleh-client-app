import type {
  AcceptInvitationResponse,
  AssistantTurnResponse,
  AuthTokenRequest,
  DataSourceMetadata,
  DataSourceResponse,
  IntentRequest,
  UserResponse,
  UserMeResponse,
  UserMePatch,
  WorkspaceCreate,
  WorkspaceInvitation,
  WorkspaceInvitationCreate,
  WorkspaceMember,
  WorkspaceResponse,
  WorkspaceUsageResponse,
  ChatSessionCreate,
  ChatSessionRead,
  ChatMessageRead,
  WorkspaceContextResponse,
  UpdateWorkspaceStateRequest,
  PaginatedResponse,
  PaginationParams,
  DataSourceRecoveryRequest,
  DataSourceRecoveryResponse,
  DatasetTablesResponse,
  DatasetTablePreviewResponse,
  ConnectorCreate,
  ConnectorResponse,
  ConnectionTestRequest,
  ConnectionTestResponse,
  ConnectorTablesResponse,
  WorkspaceDemoStatus,
  WorkspaceDemoConnectResponse,
} from '../types/api';
import { normalizeWorkspaceMember } from '../utils/workspaceMembers';
import type {
  CurrentUsageResponse,
  RemainingQuotaResponse,
  UsageSummary,
  QuotaCheckRequest,
  QuotaCheckResponse,
  HistoricalUsageResponse,
  DailyUsage,
  PlanListResponse,
  PlanResponse,
} from '../types/usage';
import type {
  BillingCatalogResponse,
  BillingSubscription,
  CheckoutRequest,
  CheckoutResponse,
  PortalRequest,
  PortalResponse,
} from '../types/billing';
import type { FeedbackSubmission } from '../types/feedback';
import {
  ApiRequestError,
  extractApiErrorCode,
  extractQuotaExceededDetail,
  formatApiErrorMessage,
  isAbortError,
  QuotaExceededError,
} from '../utils/apiErrorMessage';
import type {
  ProviderConnection,
  ProviderDisconnectResponse,
  ProviderHealthResponse,
  ProviderOAuthUrlResponse,
  ProviderProject,
  WorkspaceProviderBindRequest,
  WorkspaceProviderBindResponse,
  WorkspaceProviderBinding,
  WorkspaceProviderCredentials,
  WorkspaceProviderUnbindResponse,
} from '../types/provider';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false,
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // If body is NOT FormData, default to application/json
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Never send invalid auth: fix missing or invalid Bearer token before request
    const auth = headers['Authorization'];
    const isProtectedRoute =
      url.includes('/api/') && !url.includes('/login') && !url.includes('/register');
    const isInvalidAuth =
      !auth ||
      auth === 'Bearer undefined' ||
      auth === 'Bearer null' ||
      (typeof auth === 'string' && auth.trim() === 'Bearer');

    if (isProtectedRoute && isInvalidAuth) {
      const { authService } = await import('./authService');
      let token =
        (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));

      if (!token) {
        token = authService.getAuthToken();
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn(`[API] Missing token for protected route: ${url}`);
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      let response = await fetch(url, config);

      // Simulation for clarification logic verification
      if (endpoint.includes('/messages') && options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        if (body.prompt === 'VERIFY_CLARIFICATION') {
          response = new Response(
            JSON.stringify({
              intent: {
                clarification_needed: true,
                clarification_message:
                  'VERIFIED: Only this clarification message should be visible. Insight summary and limitations must be hidden because execution status is FAILED.',
              },
              execution: {
                status: 'FAILED',
                row_count: 0,
                message: 'Execution Error (Hidden)',
              },
              insight: {
                summary: 'Insight Summary (Hidden)',
                limitations: 'Insight Limitations (Hidden)',
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
      }

      // Handle 401 Unauthorized - attempt one token refresh, then let callers / AuthSessionGate handle auth loss.
      // Do not hard-redirect here: concurrent cold-load requests can race and wipe a valid session.
      if (response.status === 401 && !isRetry) {
        console.warn(`[API] 401 Unauthorized on ${url}. Attempting token refresh...`);

        const { authService } = await import('./authService');
        let newToken: string | null = null;
        try {
          newToken = await authService.refreshToken();
        } catch (refreshError) {
          console.error('[API] Error during token refresh:', refreshError);
        }

        if (newToken) {
          console.log('[API] Token refreshed successfully, retrying request...');
          return this.request<T>(
            endpoint,
            {
              ...options,
              headers: {
                ...headers,
                Authorization: `Bearer ${newToken}`,
              },
            },
            true,
          );
        }

        throw new ApiRequestError('Authentication session expired. Please sign in again.', {
          status: 401,
        });
      }

      // Handle 403 Forbidden - often means token not yet accepted (e.g. right after login); retry once after delay with fresh token
      if (response.status === 403 && !isRetry) {
        try {
          const { authService } = await import('./authService');
          await new Promise((r) => setTimeout(r, 500));
          const newToken = await authService.refreshToken();
          if (newToken) {
            const updatedHeaders = {
              ...headers,
              Authorization: `Bearer ${newToken}`,
            };
            return this.request<T>(
              endpoint,
              {
                ...options,
                headers: updatedHeaders,
              },
              true,
            );
          }
        } catch {
          // Fall through to normal error handling
        }
      }

      // Handle 403 Forbidden - often means token not yet accepted (e.g. right after login); retry once after delay with fresh token
      if (response.status === 403 && !isRetry) {
        try {
          const { authService } = await import('./authService');
          await new Promise((r) => setTimeout(r, 500));
          const newToken = await authService.refreshToken();
          if (newToken) {
            const updatedHeaders = {
              ...headers,
              Authorization: `Bearer ${newToken}`,
            };
            return this.request<T>(
              endpoint,
              {
                ...options,
                headers: updatedHeaders,
              },
              true,
            );
          }
        } catch {
          // Fall through to normal error handling
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[API] Error response:', errorData);
        const quota = extractQuotaExceededDetail(errorData);
        if (quota || response.status === 429) {
          throw new QuotaExceededError(
            quota ?? {
              error: 'quota_exceeded',
              limit_type: 'credits',
              current_usage: 0,
              limit: 0,
              remaining: 0,
              message: formatApiErrorMessage(errorData, response.status),
            },
            response.status,
          );
        }
        const message = formatApiErrorMessage(errorData, response.status);
        throw new ApiRequestError(message, {
          status: response.status,
          code: extractApiErrorCode(errorData),
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (isAbortError(error) || options.signal?.aborted) {
        throw error;
      }
      console.error('[API] Request failed:', error);
      throw error;
    }
  }

  async registerUser(idToken: string, inviteToken?: string | null): Promise<UserResponse> {
    const payload: AuthTokenRequest = { token: idToken };
    if (inviteToken) payload.invite_token = inviteToken;

    return this.request<UserResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async loginUser(idToken: string, inviteToken?: string | null): Promise<UserResponse> {
    const payload: AuthTokenRequest = { token: idToken };
    if (inviteToken) payload.invite_token = inviteToken;

    return this.request<UserResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getUserMe(authToken: string): Promise<UserMeResponse> {
    return this.request<UserMeResponse>('/api/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async patchUserMe(authToken: string, body: UserMePatch): Promise<UserMeResponse> {
    return this.request<UserMeResponse>('/api/users/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
  }

  async getDefaultWorkspace(authToken: string): Promise<WorkspaceResponse> {
    return this.request<WorkspaceResponse>('/api/workspaces/default', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async listWorkspaces(authToken: string): Promise<PaginatedResponse<WorkspaceResponse>> {
    return this.request<PaginatedResponse<WorkspaceResponse>>('/api/workspaces/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async listWorkspacesPaginated(
    authToken: string,
    params: PaginationParams,
  ): Promise<PaginatedResponse<WorkspaceResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());

    return this.request<PaginatedResponse<WorkspaceResponse>>(
      `/api/workspaces/?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async createWorkspace(authToken: string, name: string): Promise<WorkspaceResponse> {
    const payload: WorkspaceCreate = { name };

    return this.request<WorkspaceResponse>('/api/workspaces/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async getWorkspace(authToken: string, workspaceId: string): Promise<WorkspaceResponse> {
    return this.request<WorkspaceResponse>(`/api/workspaces/${workspaceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async updateWorkspace(
    authToken: string,
    workspaceId: string,
    name: string,
  ): Promise<WorkspaceResponse> {
    const payload: WorkspaceCreate = { name };

    return this.request<WorkspaceResponse>(`/api/workspaces/${workspaceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async deleteWorkspace(authToken: string, workspaceId: string): Promise<void> {
    return this.request<void>(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async getWorkspaceUsage(authToken: string, workspaceId: string): Promise<WorkspaceUsageResponse> {
    return this.request<WorkspaceUsageResponse>(`/api/workspaces/${workspaceId}/usage`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async listWorkspaceMembers(
    authToken: string,
    workspaceId: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<WorkspaceMember>> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());
    const qs = queryParams.toString();
    const data = await this.request<WorkspaceMember[] | PaginatedResponse<WorkspaceMember>>(
      `/api/workspaces/${workspaceId}/members${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    if (Array.isArray(data)) {
      return {
        items: data.map(normalizeWorkspaceMember),
        page: params.page ?? 1,
        page_size: params.page_size ?? data.length,
        total_items: data.length,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      };
    }
    return {
      ...data,
      items: (data.items ?? []).map(normalizeWorkspaceMember),
    };
  }

  async removeWorkspaceMember(
    authToken: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    return this.request<void>(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async createInvitation(
    authToken: string,
    workspaceId: string,
    body: WorkspaceInvitationCreate,
  ): Promise<WorkspaceInvitation> {
    return this.request<WorkspaceInvitation>(`/api/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ email: body.email.trim(), role: body.role ?? 'member' }),
    });
  }

  async listInvitations(
    authToken: string,
    workspaceId: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<WorkspaceInvitation>> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());
    const qs = queryParams.toString();
    const data = await this.request<WorkspaceInvitation[] | PaginatedResponse<WorkspaceInvitation>>(
      `/api/workspaces/${workspaceId}/invitations${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    if (Array.isArray(data)) {
      return {
        items: data,
        page: params.page ?? 1,
        page_size: params.page_size ?? data.length,
        total_items: data.length,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      };
    }
    return data;
  }

  async revokeInvitation(
    authToken: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<void> {
    return this.request<void>(`/api/workspaces/${workspaceId}/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async resendInvitation(
    authToken: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitation> {
    return this.request<WorkspaceInvitation>(
      `/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async acceptInvitation(authToken: string, token: string): Promise<AcceptInvitationResponse> {
    // Backend returns WorkspaceMemberResponse (no workspace_id on schema).
    const data = await this.request<WorkspaceMember & { workspace_id?: string }>(
      `/api/invitations/${encodeURIComponent(token)}/accept`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    const member = normalizeWorkspaceMember(data);
    let workspaceId = data.workspace_id;

    if (!workspaceId) {
      // Diff workspaces before/after is unavailable here; list and prefer non-default
      // newest membership when only one new join is expected.
      try {
        const listed = await this.listWorkspaces(authToken);
        const items = listed.items ?? [];
        if (items.length === 1) {
          workspaceId = items[0].id;
        } else if (items.length > 0) {
          // Prefer a non-default workspace (invitees usually join a non-default).
          const joined = items.find((w) => !w.is_default) ?? items[0];
          workspaceId = joined.id;
        }
      } catch {
        /* leave undefined; caller falls back to home */
      }
    }

    return {
      workspace_id: workspaceId,
      member,
    };
  }

  async listWorkspaceDatasources(
    authToken: string,
    workspaceId: string,
  ): Promise<PaginatedResponse<DataSourceResponse>> {
    return this.request<PaginatedResponse<DataSourceResponse>>(
      `/api/datasets/workspaces/${workspaceId}/datasources`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async listWorkspaceDatasourcesPaginated(
    authToken: string,
    workspaceId: string,
    params: PaginationParams,
  ): Promise<PaginatedResponse<DataSourceResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());

    return this.request<PaginatedResponse<DataSourceResponse>>(
      `/api/datasets/workspaces/${workspaceId}/datasources?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async getDatasource(authToken: string, datasourceId: string): Promise<DataSourceResponse> {
    return this.request<DataSourceResponse>(`/api/datasets/datasources/${datasourceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async getWorkspaceDemo(authToken: string, workspaceId: string): Promise<WorkspaceDemoStatus> {
    return this.request<WorkspaceDemoStatus>(`/api/workspaces/${workspaceId}/demo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async connectWorkspaceDemo(
    authToken: string,
    workspaceId: string,
  ): Promise<WorkspaceDemoConnectResponse> {
    return this.request<WorkspaceDemoConnectResponse>(
      `/api/workspaces/${workspaceId}/demo/connect`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async deleteWorkspaceDemo(authToken: string, workspaceId: string): Promise<void> {
    return this.request<void>(`/api/workspaces/${workspaceId}/demo`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async createDatasource(
    authToken: string,
    workspaceId: string,
    file: File,
    name?: string,
  ): Promise<DataSourceResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }

    return this.request<DataSourceResponse>(`/api/datasets/workspaces/${workspaceId}/datasources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });
  }

  async renameDatasource(
    authToken: string,
    datasourceId: string,
    name: string,
  ): Promise<DataSourceResponse> {
    return this.request<DataSourceResponse>(`/api/datasets/datasources/${datasourceId}/rename`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name }),
    });
  }

  async overrideDatasource(
    authToken: string,
    datasourceId: string,
    file: File,
    name?: string,
  ): Promise<DataSourceResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }

    return this.request<DataSourceResponse>(`/api/datasets/datasources/${datasourceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });
  }

  async updateDatasourceHeader(
    authToken: string,
    datasourceId: string,
    sheetName: string,
    rowIndex: number,
  ): Promise<DataSourceResponse> {
    return this.request<DataSourceResponse>(`/api/datasets/datasources/${datasourceId}/header`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sheet_name: sheetName,
        header_row_index: rowIndex,
      }),
    });
  }

  async recoverDatasource(
    authToken: string,
    datasourceId: string,
    request: DataSourceRecoveryRequest,
  ): Promise<DataSourceRecoveryResponse> {
    return this.request<DataSourceRecoveryResponse>(
      `/api/datasets/datasources/${datasourceId}/recover`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );
  }

  async deleteDatasource(authToken: string, datasourceId: string): Promise<void> {
    return this.request<void>(`/api/datasets/datasources/${datasourceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async sendChatMessage(
    authToken: string,
    question: string,
    datasourceId: string,
  ): Promise<AssistantTurnResponse> {
    const payload: IntentRequest = {
      prompt: question,
      dataset_id: datasourceId,
    };

    return this.request<AssistantTurnResponse>('/api/chat/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async getDatasourceMetadata(
    authToken: string,
    datasourceId: string,
  ): Promise<DataSourceMetadata> {
    return this.request<DataSourceMetadata>(`/api/datasets/datasources/${datasourceId}/metadata`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  // Chat Session Methods
  async createChatSession(
    authToken: string,
    datasetId: string,
    title?: string,
  ): Promise<ChatSessionRead> {
    const payload: ChatSessionCreate = title ? { title } : {};

    return this.request<ChatSessionRead>(`/api/datasets/${datasetId}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async createWorkspaceSession(
    authToken: string,
    workspaceId: string,
    title?: string,
    datasetId?: string,
  ): Promise<ChatSessionRead> {
    if (!workspaceId || workspaceId === 'undefined') {
      throw new Error('Workspace ID is required to create a session');
    }
    const payload: ChatSessionCreate & { dataset_id?: string } = {
      title,
      dataset_id: datasetId,
    };

    return this.request<ChatSessionRead>(`/api/workspaces/${workspaceId}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async listChatSessions(
    authToken: string,
    datasetId: string,
  ): Promise<PaginatedResponse<ChatSessionRead>> {
    return this.request<PaginatedResponse<ChatSessionRead>>(`/api/datasets/${datasetId}/sessions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async listChatSessionsPaginated(
    authToken: string,
    datasetId: string,
    params: PaginationParams,
  ): Promise<PaginatedResponse<ChatSessionRead>> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());

    return this.request<PaginatedResponse<ChatSessionRead>>(
      `/api/datasets/${datasetId}/sessions?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async listWorkspaceSessions(
    authToken: string,
    workspaceId: string,
  ): Promise<PaginatedResponse<ChatSessionRead>> {
    if (!workspaceId || workspaceId === 'undefined') {
      throw new Error('Workspace ID is required to list sessions');
    }
    return this.request<PaginatedResponse<ChatSessionRead>>(
      `/api/workspaces/${workspaceId}/sessions`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async listWorkspaceSessionsPaginated(
    authToken: string,
    workspaceId: string,
    params: PaginationParams,
  ): Promise<PaginatedResponse<ChatSessionRead>> {
    if (!workspaceId || workspaceId === 'undefined') {
      throw new Error('Workspace ID is required to list sessions');
    }
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());

    return this.request<PaginatedResponse<ChatSessionRead>>(
      `/api/workspaces/${workspaceId}/sessions?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async getSessionMessages(
    authToken: string,
    sessionId: string,
  ): Promise<PaginatedResponse<ChatMessageRead>> {
    if (!sessionId || sessionId === 'undefined') {
      throw new Error('Session ID is required to get messages');
    }
    return this.request<PaginatedResponse<ChatMessageRead>>(`/api/sessions/${sessionId}/messages`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async getSessionMessagesPaginated(
    authToken: string,
    sessionId: string,
    params: PaginationParams,
  ): Promise<PaginatedResponse<ChatMessageRead>> {
    if (!sessionId || sessionId === 'undefined') {
      throw new Error('Session ID is required to get messages');
    }
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());

    return this.request<PaginatedResponse<ChatMessageRead>>(
      `/api/sessions/${sessionId}/messages?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async addMessageToSession(
    authToken: string,
    sessionId: string,
    prompt: string,
    datasetId: string | null,
  ): Promise<AssistantTurnResponse> {
    if (!sessionId || sessionId === 'undefined') {
      throw new Error('Session ID is required to send a message');
    }
    const payload: IntentRequest = {
      prompt,
      dataset_id: datasetId || null,
    };

    return this.request<AssistantTurnResponse>(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async deleteChatSession(authToken: string, sessionId: string): Promise<void> {
    await this.request<void>(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async updateChatSession(
    authToken: string,
    sessionId: string,
    payload: { title: string },
  ): Promise<ChatSessionRead> {
    return this.request<ChatSessionRead>(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  // Usage and Quota Methods
  async getCurrentUsage(authToken: string, workspaceId?: string): Promise<CurrentUsageResponse> {
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return this.request<CurrentUsageResponse>(`/api/usage/${params}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async getRemainingQuota(authToken: string): Promise<RemainingQuotaResponse> {
    return this.request<RemainingQuotaResponse>('/api/usage/remaining', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async getUsageSummary(authToken: string): Promise<UsageSummary> {
    return this.request<UsageSummary>('/api/usage/summary', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async checkQuota(
    authToken: string,
    operation: 'query' | 'datasource' | 'member',
    workspaceId?: string,
  ): Promise<QuotaCheckResponse> {
    const payload: QuotaCheckRequest = {
      operation,
      ...(workspaceId && { workspace_id: workspaceId }),
    };

    return this.request<QuotaCheckResponse>('/api/usage/check', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async getHistoricalUsage(
    authToken: string,
    workspaceId?: string,
    days: number = 30,
  ): Promise<HistoricalUsageResponse> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    params.append('days', days.toString());

    return this.request<HistoricalUsageResponse>(`/api/usage/history?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async getDailyUsage(
    authToken: string,
    workspaceId?: string,
    days: number = 7,
  ): Promise<DailyUsage[]> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    params.append('days', days.toString());

    return this.request<DailyUsage[]>(`/api/usage/daily?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async getAvailablePlans(): Promise<PlanListResponse> {
    const data = await this.request<
      PlanListResponse | PaginatedResponse<PlanListResponse['plans'][number]>
    >('/api/usage/plans', { method: 'GET' });
    if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
      return { plans: data.items };
    }
    if (data && typeof data === 'object' && 'plans' in data && Array.isArray(data.plans)) {
      return { plans: data.plans };
    }
    return { plans: [] };
  }

  async getCurrentPlan(authToken: string): Promise<PlanResponse> {
    return this.request<PlanResponse>('/api/usage/plan', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  // Billing (Stripe Checkout + Customer Portal)
  async getBillingCatalog(authToken: string): Promise<BillingCatalogResponse> {
    return this.request<BillingCatalogResponse>('/api/billing/catalog', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async getBillingSubscription(authToken: string): Promise<BillingSubscription> {
    return this.request<BillingSubscription>('/api/billing/subscription', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async createCheckoutSession(
    authToken: string,
    payload: CheckoutRequest,
  ): Promise<CheckoutResponse> {
    return this.request<CheckoutResponse>('/api/billing/checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async createBillingPortalSession(
    authToken: string,
    payload: PortalRequest = {},
  ): Promise<PortalResponse> {
    return this.request<PortalResponse>('/api/billing/portal', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  // Workspace State Methods
  async getWorkspaceContext(
    authToken: string,
    workspaceId: string,
  ): Promise<WorkspaceContextResponse> {
    return this.request<WorkspaceContextResponse>(`/api/workspaces/${workspaceId}/context`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async updateWorkspaceState(
    authToken: string,
    workspaceId: string,
    payload: UpdateWorkspaceStateRequest,
  ): Promise<void> {
    return this.request<void>(`/api/workspaces/${workspaceId}/state`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  // Feedback Methods
  async submitFeedback(authToken: string, feedback: FeedbackSubmission): Promise<void> {
    return this.request<void>('/api/feedback', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(feedback),
    });
  }

  // Dataset Preview Methods
  async listDatasetTables(
    authToken: string,
    datasetId: string,
    params: PaginationParams = {},
  ): Promise<DatasetTablesResponse> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());
    const qs = queryParams.toString();

    return this.request<DatasetTablesResponse>(
      `/api/datasets/${datasetId}/tables${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async getDatasetTablePreview(
    authToken: string,
    datasetId: string,
    tableName: string,
    page: number = 1,
    pageSize: number = 50,
    search?: string,
    signal?: AbortSignal,
  ): Promise<DatasetTablePreviewResponse> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    const q = search?.trim();
    if (q) queryParams.set('search', q.slice(0, 200));

    return this.request<DatasetTablePreviewResponse>(
      `/api/datasets/${datasetId}/tables/${encodeURIComponent(tableName)}/preview?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        signal,
      },
    );
  }

  async getConnectorTablePreview(
    authToken: string,
    workspaceId: string,
    connectorId: string,
    tableName: string,
    page: number = 1,
    pageSize: number = 50,
    search?: string,
    signal?: AbortSignal,
  ): Promise<DatasetTablePreviewResponse> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    const q = search?.trim();
    if (q) queryParams.set('search', q.slice(0, 200));

    return this.request<DatasetTablePreviewResponse>(
      `/api/connectors/workspaces/${encodeURIComponent(workspaceId)}/${encodeURIComponent(connectorId)}/tables/${encodeURIComponent(tableName)}/preview?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        signal,
      },
    );
  }

  // Connector Methods
  async createPostgresConnector(
    authToken: string,
    workspaceId: string,
    payload: ConnectorCreate,
  ): Promise<ConnectorResponse> {
    return this.request<ConnectorResponse>(`/api/connectors/workspaces/${workspaceId}/postgresql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async testPostgresConnection(
    authToken: string,
    workspaceId: string,
    payload: ConnectionTestRequest,
  ): Promise<ConnectionTestResponse> {
    return this.request<ConnectionTestResponse>(
      `/api/connectors/workspaces/${workspaceId}/postgresql/test`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      },
    );
  }

  async listConnectors(authToken: string, workspaceId: string): Promise<ConnectorResponse[]> {
    return this.request<ConnectorResponse[]>(`/api/connectors/workspaces/${workspaceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async listConnectorTables(
    authToken: string,
    workspaceId: string,
    connectorId: string,
    params: PaginationParams = {},
  ): Promise<ConnectorTablesResponse> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.page_size !== undefined)
      queryParams.append('page_size', params.page_size.toString());
    const qs = queryParams.toString();

    return this.request<ConnectorTablesResponse>(
      `/api/connectors/workspaces/${workspaceId}/${connectorId}/tables${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async deleteConnector(
    authToken: string,
    workspaceId: string,
    connectorId: string,
  ): Promise<void> {
    return this.request<void>(`/api/connectors/workspaces/${workspaceId}/${connectorId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  // Provider (Supabase OAuth) , /api/v1
  async getProviderOAuthUrl(authToken: string): Promise<ProviderOAuthUrlResponse> {
    return this.request<ProviderOAuthUrlResponse>('/api/v1/provider/oauth/url', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async listProviderConnections(authToken: string): Promise<ProviderConnection[]> {
    return this.request<ProviderConnection[]>('/api/v1/provider/connections', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async deleteProviderConnection(
    authToken: string,
    connectionId: string,
  ): Promise<ProviderDisconnectResponse> {
    return this.request<ProviderDisconnectResponse>(
      `/api/v1/provider/connections/${connectionId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async listProviderProjects(authToken: string, connectionId: string): Promise<ProviderProject[]> {
    return this.request<ProviderProject[]>(
      `/api/v1/provider/connections/${connectionId}/projects`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async getProviderHealth(authToken: string): Promise<ProviderHealthResponse> {
    return this.request<ProviderHealthResponse>('/api/v1/provider/health', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async bindWorkspaceProvider(
    authToken: string,
    workspaceId: string,
    body: WorkspaceProviderBindRequest,
  ): Promise<WorkspaceProviderBindResponse> {
    return this.request<WorkspaceProviderBindResponse>(
      `/api/v1/workspaces/${workspaceId}/provider/bind`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      },
    );
  }

  async unbindWorkspaceProvider(
    authToken: string,
    workspaceId: string,
  ): Promise<WorkspaceProviderUnbindResponse> {
    return this.request<WorkspaceProviderUnbindResponse>(
      `/api/v1/workspaces/${workspaceId}/provider/bind`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  async getWorkspaceProviderConnection(
    authToken: string,
    workspaceId: string,
  ): Promise<WorkspaceProviderBinding> {
    return this.request<WorkspaceProviderBinding>(
      `/api/v1/workspaces/${workspaceId}/provider/connection`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }

  /**
   * Sandbox / agent tooling only. Production returns 403 PROVIDER_CREDENTIALS_DISABLED.
   * Never call from product UI , BI features use binding status + server-side query execution.
   */
  async getWorkspaceProviderCredentials(
    authToken: string,
    workspaceId: string,
  ): Promise<WorkspaceProviderCredentials> {
    return this.request<WorkspaceProviderCredentials>(
      `/api/v1/workspaces/${workspaceId}/provider/credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
  }
}

export const apiClient = new APIClient(API_BASE_URL);
