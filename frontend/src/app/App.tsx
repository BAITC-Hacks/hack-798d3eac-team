import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useSearchParams } from 'react-router-dom';
import { Activity, BriefcaseBusiness, Check, ClipboardList, Moon, Plus, RefreshCw, Sun, Users } from 'lucide-react';
import { proposalApi, taskApi, teamApi } from '../api/services';
import { emptyTask, ProposalModel, TaskModel, type Task, type TaskAnalysis, type TaskInput, type TeamInput } from '../domain/models';

function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [value, setValue] = useState<T | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(true);
  const reload = async () => { setBusy(true); setError(''); try { setValue(await loader()); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка загрузки'); } finally { setBusy(false); } };
  useEffect(() => { void reload(); // loader is stable per page mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { value, error, busy, reload, setValue };
}

function Shell({ children, theme, onToggleTheme }: { children: React.ReactNode; theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  return <div className="app"><header className="topbar"><Link to="/" className="brand"><span className="brand-mark">I</span><span>Iske<small>Практические задачи</small></span></Link><nav><NavLink to="/tasks"><ClipboardList size={17}/> Каталог</NavLink><NavLink to="/business"><BriefcaseBusiness size={17}/> Бизнес</NavLink><NavLink to="/teams"><Users size={17}/> Команды</NavLink></nav><button className="theme-toggle" onClick={onToggleTheme} aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'} title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}<span>Тема</span></button></header><main>{children}</main><footer><span>Iske</span><span>Практический хакатон · Задачи, которые двигают вперёд</span></footer></div>;
}
function Notice({ error, retry }: { error: string; retry?: () => void }) { return <div className="notice"><span>{error}</span>{retry && <button className="button subtle" onClick={retry}><RefreshCw size={15}/> Повторить</button>}</div>; }
function Loading() { return <div className="loading"><span className="spinner"/>Загружаем данные…</div>; }
function Level({ task }: { task: Task }) { const model = new TaskModel(task); return <span className={`level level-${task.readiness_level}`}>{model.levelLabel}</span>; }
function Score({ task }: { task: Task }) { return <div className="score"><b>{task.score}</b><span>/ 100</span><div className="meter"><i style={{ width: `${new TaskModel(task).completionPercent}%` }}/></div></div>; }
function PageTitle({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) { return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>{action}</div>; }

function Home() {
  const { value: tasks, busy, error, reload } = useLoad(() => taskApi.list());
  return <><PageTitle eyebrow="ПЛАТФОРМА ISKE" title="Практические задачи бизнеса" text="Помогаем бизнесу уточнить задачу, а командам — найти проект для работы." action={<Link className="button primary" to="/business/new"><Plus size={17}/> Создать задачу</Link>}/><div className="hero"><div><span className="pill"><Activity size={14}/> Открытый выбор команд</span><h2>От первой идеи —<br/>к реальному решению</h2><p>Задачи ранжируются по полноте описания. Команды выбирают сами, бизнес принимает решение вручную.</p><Link className="button dark" to="/tasks">Перейти в каталог <span>→</span></Link></div><div className="hero-stat"><span>Опубликованные задачи</span><strong>{tasks?.length ?? '—'}</strong><small>Доступны всем командам</small></div></div>{busy ? <Loading/> : error ? <Notice error={error} retry={reload}/> : <section className="section"><div className="section-heading"><div><div className="eyebrow">ОТКРЫТЫЙ КАТАЛОГ</div><h2>Недавно опубликованы</h2></div><Link className="text-link" to="/tasks">Все задачи →</Link></div><TaskGrid tasks={(tasks ?? []).slice(0, 3)}/></section>}</>;
}

function TaskGrid({ tasks, proposalCounts = {} }: { tasks: Task[]; proposalCounts?: Record<number, number> }) {
  if (!tasks.length) return <div className="empty">Пока нет опубликованных задач. Создайте первую задачу в разделе «Бизнес».</div>;
  return <div className="task-grid">{tasks.map(t => { const count = proposalCounts[t.id] ?? t.proposals?.length ?? 0; return <article className="task-card" key={t.id}><div className="card-top"><span className="category">{t.industry || 'Без отрасли'}</span><Level task={t}/></div><h3>{t.title || `Бизнес-задача #${t.id}`}</h3><p>{t.need || t.context || 'Описание задачи будет добавлено бизнесом.'}</p><div className="card-meta">{count > 0 ? <span className="proposal-indicator"><Check size={13}/> Уже есть предложение{count > 1 ? ` · ${count}` : ''}</span> : <span className="proposal-open">Предложений пока нет</span>}</div><div className="card-footer"><Score task={t}/><div className="card-actions"><Link className="button outline small" to={`/tasks/${t.id}`}>Подробнее</Link><Link className="button primary small" to={`/tasks/${t.id}#proposal-form`}>Предложить решение</Link></div></div></article>; })}</div>;
}

function Catalog() {
  const [industry, setIndustry] = useState(''); const [level, setLevel] = useState(''); const [sort, setSort] = useState<'score'|'industry'>('score');
  const { value, busy, error, reload } = useLoad(async () => { const [tasks, proposals] = await Promise.all([taskApi.list(), proposalApi.list()]); return { tasks, proposals }; });
  const industries = [...new Set((value?.tasks ?? []).map(t => t.industry).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'ru'));
  const proposalCounts = (value?.proposals ?? []).reduce<Record<number,number>>((counts, proposal) => { counts[proposal.task_id] = (counts[proposal.task_id] ?? 0) + 1; return counts; }, {});
  const filtered = (value?.tasks ?? []).filter(t => (!industry || t.industry === industry) && (!level || t.readiness_level === level)).sort((a,b) => sort === 'industry' ? a.industry.localeCompare(b.industry, 'ru') || b.score-a.score : b.score-a.score);
  return <><PageTitle eyebrow="ДЛЯ СТУДЕНЧЕСКИХ КОМАНД" title="Каталог задач" text="Все опубликованные задачи открыты для отклика — даже если им пока нужно уточнение."/><div className="toolbar catalog-toolbar"><label>Отрасль<select value={industry} onChange={e => setIndustry(e.target.value)}><option value="">Все отрасли</option>{industries.map(item => <option key={item}>{item}</option>)}</select></label><label>Приоритет<select value={level} onChange={e => setLevel(e.target.value)}><option value="">Любой уровень</option><option value="priority">Приоритетная</option><option value="ready">Готовая</option><option value="working">Рабочая</option><option value="draft">Нужно уточнение</option></select></label><label>Сортировать<select value={sort} onChange={e => setSort(e.target.value as 'score'|'industry')}><option value="score">По готовности</option><option value="industry">По отрасли</option></select></label><span className="sort-note">Показано: {filtered.length}</span></div>{busy ? <Loading/> : error ? <Notice error={error} retry={reload}/> : <TaskGrid tasks={filtered} proposalCounts={proposalCounts}/>}</>;
}

function Field({ label, name, value, onChange, multiline = false, required = false }: { label: string; name: keyof TaskInput; value: string; onChange: (key: keyof TaskInput, value: string) => void; multiline?: boolean; required?: boolean }) {
  const props = { value, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, e.target.value), placeholder: 'Добавьте информацию…' };
  return <label className="field"><span>{label}{required && <em> *</em>}</span>{multiline ? <textarea {...props} rows={3}/> : <input {...props}/>}</label>;
}
const fields: { name: keyof TaskInput; label: string; multiline?: boolean; required?: boolean }[] = [
  { name: 'title', label: 'Название', required: true }, { name: 'industry', label: 'Отрасль' },
  { name: 'context', label: 'Контекст бизнеса', multiline: true }, { name: 'need', label: 'Потребность / проблема', multiline: true, required: true },
  { name: 'users', label: 'Для кого создаётся решение', multiline: true }, { name: 'data_and_materials', label: 'Данные и материалы', multiline: true },
  { name: 'constraints', label: 'Ограничения и сроки', multiline: true }, { name: 'expected_result', label: 'Ожидаемый результат', multiline: true },
  { name: 'success_criteria', label: 'Критерии успеха', multiline: true }, { name: 'contact', label: 'Контакт представителя бизнеса' },
  { name: 'collaboration_format', label: 'Формат взаимодействия', multiline: true },
];

function TaskEditor({ task, onSaved }: { task?: Task; onSaved: (task: Task) => void }) {
  const [form, setForm] = useState<TaskInput>(task ? {
    title: task.title, industry: task.industry, context: task.context, need: task.need,
    users: task.users, data_and_materials: task.data_and_materials, constraints: task.constraints,
    expected_result: task.expected_result, success_criteria: task.success_criteria,
    contact: task.contact, collaboration_format: task.collaboration_format,
  } : emptyTask);
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(task ? { score: task.score, readiness_level: task.readiness_level, score_breakdown: task.score_breakdown, missing_information: task.missing_information, questions: [] } : null);
  const [id, setId] = useState<number | null>(task?.id ?? null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const change = (key: keyof TaskInput, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const save = async (confirm = false) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = id ? await taskApi.update(id, { ...form, ...(confirm ? { is_confirmed: true } : {}) }) : await taskApi.create(form);
      setId(saved.id); onSaved(saved); const result = await taskApi.analyze(saved.id); setAnalysis(result);
      setMessage(confirm ? 'Карточка подтверждена. Теперь можно опубликовать задачу.' : 'Черновик сохранён и рейтинг пересчитан.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить задачу'); }
    finally { setBusy(false); }
  };
  const analyze = async () => {
    setBusy(true); setError('');
    try {
      let current = id ? await taskApi.update(id, form) : await taskApi.create(form);
      setId(current.id); onSaved(current); const result = await taskApi.analyze(current.id); setAnalysis(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось проанализировать задачу'); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!id) return; setBusy(true); setError('');
    try { const updated = await taskApi.publish(id); onSaved(updated); setMessage('Задача опубликована и доступна всем командам.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось опубликовать задачу'); }
    finally { setBusy(false); }
  };
  return <div className="editor-layout"><section className="panel"><div className="step-label">ШАГ 1 · СОЗДАНИЕ И УТОЧНЕНИЕ</div><h2>{task ? 'Редактировать задачу' : 'Опишите бизнес-задачу'}</h2><p className="muted">Заполните известные сведения. Пропущенные поля снизят рейтинг, но не помешают публикации.</p><div className="fields-grid">{fields.map(f => <Field key={f.name} {...f} value={form[f.name]} onChange={change}/>)}</div>{error && <Notice error={error}/ >}{message && <div className="success">{message}</div>}<div className="actions"><button className="button outline" disabled={busy} onClick={() => void analyze()}><Activity size={16}/> Сохранить и оценить</button><button className="button primary" disabled={busy || !id} onClick={() => void save(true)}>Подтвердить карточку</button>{task?.is_confirmed && !task.is_published && <button className="button dark" disabled={busy} onClick={() => void publish()}>Опубликовать</button>}</div></section><aside className="panel score-panel"><div className="step-label">ГОТОВНОСТЬ ЗАДАЧИ</div>{analysis ? <><div className="score-big">{analysis.score}<small>/100</small></div><span className={`level level-${analysis.readiness_level}`}>{({draft:'Нужно уточнение',working:'Рабочая',ready:'Готовая',priority:'Приоритетная'} as const)[analysis.readiness_level]}</span><p className="muted">Баллы за заполненные поля:</p><div className="breakdown">{analysis.score_breakdown.map(item => <div key={item.field}><span>{fieldLabels[item.field] ?? item.field}</span><b>{item.points}<small>/{item.max_points}</small></b></div>)}</div><div className="hint-box"><b>Уточняющие вопросы</b>{analysis.questions.length ? <ol>{analysis.questions.map(q => <li key={q}>{q}</li>)}</ol> : <p>Все ключевые сведения заполнены.</p>}</div></> : <div className="score-empty"><Activity size={27}/><p>Сохраните задачу, чтобы рассчитать рейтинг и получить уточняющие вопросы.</p></div>}</aside></div>;
}
const fieldLabels: Record<string, string> = { context:'Контекст',need:'Потребность',data_and_materials:'Данные и материалы',expected_result:'Ожидаемый результат',success_criteria:'Критерии успеха',constraints:'Ограничения',users:'Пользователи',contact:'Контакт',collaboration_format:'Взаимодействие' };

function Business() {
  const [created, setCreated] = useState<Task | null>(null);
  return <><PageTitle eyebrow="РАБОЧЕЕ МЕСТО БИЗНЕСА" title="Конструктор задачи" text="Опишите потребность, проверьте рейтинг и подтвердите карточку перед публикацией."/><TaskEditor task={created ?? undefined} onSaved={setCreated}/></>;
}

function TaskDetail({ id }: { id: number }) {
  const { value: task, busy, error, reload, setValue: setTask } = useLoad(() => taskApi.get(id), [id]);
  const { value: teams } = useLoad(() => teamApi.list()); const [teamId, setTeamId] = useState(''); const [idea, setIdea] = useState(''); const [plan, setPlan] = useState(''); const [duration, setDuration] = useState(''); const [url, setUrl] = useState(''); const [message, setMessage] = useState(''); const [formError, setFormError] = useState(''); const [sending, setSending] = useState(false);
  useEffect(() => { if (!busy && task && window.location.hash === '#proposal-form') document.getElementById('proposal-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [id, busy, task?.id]);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setSending(true); setFormError(''); setMessage(''); try { const created = await proposalApi.create({ task_id:id, team_id:Number(teamId), idea, plan, duration, prototype_url:url }); setTask(current => current ? { ...current, proposals: [...(current.proposals ?? []), created] } : current); setMessage('Отклик отправлен представителю бизнеса.'); setIdea(''); setPlan(''); setDuration(''); setUrl(''); } catch (x) { setFormError(x instanceof Error ? x.message : 'Не удалось отправить отклик'); } finally { setSending(false); } };
  if (busy) return <Loading/>; if (error) return <Notice error={error} retry={reload}/>; if (!task) return null;
  const existingProposals = task.proposals?.length ?? 0;
  return <><Link className="back-link" to="/tasks">← Назад в каталог</Link><div className="detail-head"><div><div className="eyebrow">{task.industry || 'БИЗНЕС-ЗАДАЧА'}</div><h1>{task.title || `Задача #${task.id}`}</h1><p>{task.need}</p>{existingProposals > 0 && <span className="proposal-indicator"><Check size={13}/> Уже предложено решений: {existingProposals}</span>}</div><div className="detail-score"><Score task={task}/><Level task={task}/></div></div><div className="detail-grid"><section className="panel"><h2>Описание задачи</h2>{fields.filter(f => f.name !== 'title' && f.name !== 'industry').map(f => <div className="detail-field" key={f.name}><b>{f.label}</b><p>{task[f.name] || <span className="muted">Пока не указано</span>}</p></div>)}</section><form id="proposal-form" className="panel proposal-form" onSubmit={submit}><div className="step-label">ПРЕДЛОЖЕНИЕ КОМАНДЫ</div><h2>Предложить решение</h2><label className="field"><span>Команда *</span><select required value={teamId} onChange={e => setTeamId(e.target.value)}><option value="">Выберите команду</option>{(teams ?? []).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="field"><span>Идея решения *</span><textarea required rows={3} value={idea} onChange={e => setIdea(e.target.value)}/></label><label className="field"><span>План работы *</span><textarea required rows={3} value={plan} onChange={e => setPlan(e.target.value)}/></label><label className="field"><span>Срок *</span><input required value={duration} onChange={e => setDuration(e.target.value)} placeholder="Например, 3 недели"/></label><label className="field"><span>Ссылка на прототип</span><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://"/></label>{formError && <Notice error={formError}/ >}{message && <div className="success">{message}</div>}<button className="button primary full" disabled={sending || !teams?.length}>{sending ? 'Отправляем…' : 'Отправить отклик'}</button>{!teams?.length && <p className="muted">Сначала <Link to="/teams?new=1">добавьте команду на сайте</Link>, затем вернитесь к отклику.</p>}</form></div></>;
}

function TaskRoute() { const id = Number(window.location.pathname.split('/').filter(Boolean).at(-1)); return <TaskDetail id={id}/>; }

function TeamPage() {
  const { value: teams, busy, error, reload } = useLoad(() => teamApi.list()); const [params] = useSearchParams(); const [showForm, setShowForm] = useState(params.get('new') === '1'); const [formBusy, setFormBusy] = useState(false); const [formError, setFormError] = useState(''); const [notice, setNotice] = useState('');
  const [form, setForm] = useState<TeamInput>({ name:'', interests:'', skills:'', technologies:'' });
  const update = (key:keyof TeamInput, value:string) => setForm(old => ({...old,[key]:value}));
  const submit = async (event:React.FormEvent) => { event.preventDefault(); setFormBusy(true); setFormError(''); try { await teamApi.create(form); setForm({name:'',interests:'',skills:'',technologies:''}); setNotice('Команда добавлена. Теперь можно выбрать её при отправке решения.'); setShowForm(false); await reload(); } catch(e) { setFormError(e instanceof Error ? e.message : 'Не удалось добавить команду'); } finally { setFormBusy(false); } };
  return <><PageTitle eyebrow="УЧАСТНИКИ" title="Команды" text="Создайте профиль команды и сразу отправляйте предложения по задачам." action={<button className="button primary" onClick={() => setShowForm(value => !value)}><Plus size={16}/> Добавить команду</button>}/>{notice && <div className="success">{notice}</div>}{showForm && <form className="panel team-create" onSubmit={submit}><div><div className="step-label">НОВАЯ КОМАНДА</div><h2>Представьте команду</h2></div><div className="team-form-grid"><label className="field"><span>Название команды *</span><input required maxLength={150} value={form.name} onChange={e => update('name',e.target.value)} placeholder="Например, Green Lab"/></label><label className="field"><span>Интересы</span><input value={form.interests} onChange={e => update('interests',e.target.value)} placeholder="Отрасли и темы"/></label><label className="field"><span>Навыки</span><input value={form.skills} onChange={e => update('skills',e.target.value)} placeholder="Аналитика, дизайн…"/></label><label className="field"><span>Технологии</span><input value={form.technologies} onChange={e => update('technologies',e.target.value)} placeholder="React, Python…"/></label></div>{formError && <Notice error={formError}/ >}<div className="actions"><button type="button" className="button outline" onClick={() => setShowForm(false)}>Отмена</button><button className="button primary" disabled={formBusy}>{formBusy ? 'Сохраняем…' : 'Создать команду'}</button></div></form>}{busy ? <Loading/> : error ? <Notice error={error} retry={reload}/> : teams?.length ? <div className="team-grid">{teams.map(t => <article className="panel team-card" key={t.id}><div className="team-avatar">{t.name.slice(0,1).toUpperCase()}</div><h3>{t.name}</h3><p><b>Интересы</b>{t.interests || 'Не заполнены'}</p><p><b>Навыки</b>{t.skills || 'Не заполнены'}</p><p><b>Технологии</b>{t.technologies || 'Не заполнены'}</p></article>)}</div> : <div className="empty">Пока нет команд. Создайте первую — для неё можно будет отправить решение по задаче.</div>}</>;
}

function Proposals() {
  const { value: proposals, busy, error, reload, setValue } = useLoad(() => proposalApi.list()); const [acting, setActing] = useState<number | null>(null); const [actionError, setActionError] = useState('');
  const decide = async (id:number, status:'accepted'|'rejected') => { setActing(id); setActionError(''); try { const updated = await proposalApi.decide(id,status); setValue(current => current?.map(p => p.id === id ? updated : p) ?? [updated]); } catch(e) { setActionError(e instanceof Error ? e.message : 'Не удалось сохранить решение'); } finally { setActing(null); } };
  return <><PageTitle eyebrow="РЕШЕНИЕ БИЗНЕСА" title="Отклики команд" text="Сравните идеи и вручную примите или отклоните каждое предложение."/>{actionError && <Notice error={actionError}/ >}{busy ? <Loading/> : error ? <Notice error={error} retry={reload}/> : !proposals?.length ? <div className="empty">Откликов пока нет. После публикации задачи команды смогут предложить свои решения.</div> : <div className="proposal-list">{proposals.map(p => { const model = new ProposalModel(p); return <article className="panel proposal-card" key={p.id}><div className="proposal-card-head"><div><span className="eyebrow">ЗАДАЧА #{p.task_id}</span><h3>{p.team.name}</h3></div><span className={`status status-${p.status}`}>{model.statusLabel}</span></div><div className="proposal-copy"><b>Идея</b><p>{p.idea}</p><b>План</b><p>{p.plan}</p><b>Срок</b><p>{p.duration}</p>{p.prototype_url && <a href={p.prototype_url} target="_blank" rel="noreferrer">Открыть прототип ↗</a>}</div>{p.status === 'pending' && <div className="actions"><button className="button primary" disabled={acting === p.id} onClick={() => void decide(p.id,'accepted')}>Принять</button><button className="button outline danger" disabled={acting === p.id} onClick={() => void decide(p.id,'rejected')}>Отклонить</button></div>}</article>; })}</div>}</>;
}

export default function App() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => localStorage.getItem('iske-theme') === 'dark' ? 'dark' : 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('iske-theme', theme); }, [theme]);
  const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light');
  return <Shell theme={theme} onToggleTheme={toggleTheme}><Routes><Route path="/" element={<Home/>}/><Route path="/tasks" element={<Catalog/>}/><Route path="/tasks/:id" element={<TaskRoute/>}/><Route path="/business" element={<Business/>}/><Route path="/business/new" element={<Business/>}/><Route path="/proposals" element={<Proposals/>}/><Route path="/teams" element={<TeamPage/>}/><Route path="*" element={<div className="empty">Страница не найдена · <Link to="/">На главную</Link></div>}/></Routes></Shell>;
}
