/** Types mirror the Django JsonResponse payloads in tasks_app/views.py. */
export type ReadinessLevel = 'draft' | 'working' | 'ready' | 'priority';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

export interface ScoreBreakdownItem { field: string; points: number; max_points: number }
export interface TaskAnalysis {
  score: number;
  readiness_level: ReadinessLevel;
  score_breakdown: ScoreBreakdownItem[];
  missing_information: string[];
  questions: string[];
}
export interface TaskFields {
  title: string;
  industry: string;
  context: string;
  need: string;
  users: string;
  data_and_materials: string;
  constraints: string;
  expected_result: string;
  success_criteria: string;
  contact: string;
  collaboration_format: string;
}
export interface Task extends TaskFields {
  id: number;
  score: number;
  readiness_level: ReadinessLevel;
  is_confirmed: boolean;
  is_published: boolean;
  score_breakdown: ScoreBreakdownItem[];
  missing_information: string[];
  proposals?: Proposal[];
}
export interface Team { id: number; name: string; interests: string; skills: string; technologies: string }
export interface Proposal {
  id: number;
  task_id: number;
  team: { id: number; name: string };
  idea: string;
  plan: string;
  duration: string;
  prototype_url: string;
  status: ProposalStatus;
}
export interface ProposalInput {
  task_id: number;
  team_id: number;
  idea: string;
  plan: string;
  duration: string;
  prototype_url?: string;
}
export interface TaskInput extends TaskFields {}
export const emptyTask: TaskInput = {
  title: '', industry: '', context: '', need: '', users: '', data_and_materials: '',
  constraints: '', expected_result: '', success_criteria: '', contact: '', collaboration_format: '',
};

/** Lightweight domain helpers; scoring itself remains authoritative on Django. */
export class TaskModel {
  constructor(readonly data: Task) {}
  get levelLabel(): string {
    return ({ draft: 'Нужно уточнение', working: 'Рабочая', ready: 'Готовая', priority: 'Приоритетная' } as const)[this.data.readiness_level];
  }
  get completionPercent(): number { return Math.max(0, Math.min(100, this.data.score)); }
}
export class ProposalModel {
  constructor(readonly data: Proposal) {}
  get statusLabel(): string { return ({ pending: 'На рассмотрении', accepted: 'Принят', rejected: 'Отклонён' } as const)[this.data.status]; }
}
