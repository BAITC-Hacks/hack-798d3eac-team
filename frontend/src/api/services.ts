import { HttpClient } from './http';
import type { Proposal, ProposalInput, ProposalStatus, Task, TaskAnalysis, TaskFields, Team, TeamInput } from '../domain/models';

export class TaskApi {
  constructor(private readonly http: HttpClient) {}
  async list(industry?: string): Promise<Task[]> {
    const query = industry ? `?industry=${encodeURIComponent(industry)}` : '';
    return (await this.http.request<{ results: Task[] }>(`/tasks/${query}`)).results;
  }
  create(input: TaskFields): Promise<Task> {
    return this.http.request('/tasks/', { method: 'POST', body: JSON.stringify(input) });
  }
  get(id: number): Promise<Task> { return this.http.request(`/tasks/${id}/`); }
  update(id: number, patch: Partial<TaskFields> & { is_confirmed?: boolean }): Promise<Task> {
    return this.http.request(`/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(patch) });
  }
  analyze(id: number): Promise<TaskAnalysis> { return this.http.request(`/tasks/${id}/analysis/`); }
  publish(id: number): Promise<Task> { return this.http.request(`/tasks/${id}/publish/`, { method: 'POST', body: '{}' }); }
}
export class TeamApi {
  constructor(private readonly http: HttpClient) {}
  async list(): Promise<Team[]> { return (await this.http.request<{ results: Team[] }>('/teams/')).results; }
  create(input: TeamInput): Promise<Pick<Team, 'id' | 'name'>> {
    return this.http.request('/teams/', { method: 'POST', body: JSON.stringify(input) });
  }
}
export class ProposalApi {
  constructor(private readonly http: HttpClient) {}
  async list(): Promise<Proposal[]> { return (await this.http.request<{ results: Proposal[] }>('/proposals/')).results; }
  create(input: ProposalInput): Promise<Proposal> {
    return this.http.request('/proposals/', { method: 'POST', body: JSON.stringify(input) });
  }
  decide(id: number, status: Extract<ProposalStatus, 'accepted' | 'rejected'>): Promise<Proposal> {
    return this.http.request(`/proposals/${id}/decision/`, { method: 'POST', body: JSON.stringify({ status }) });
  }
}

const http = new HttpClient();
export const taskApi = new TaskApi(http);
export const teamApi = new TeamApi(http);
export const proposalApi = new ProposalApi(http);
