"""
Modelos para sistema de gestão de projetos com Kanban
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
from uuid import uuid4
from enum import Enum

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property

from . import db


class ProjectStatus(Enum):
    """Status dos projetos"""
    PLANNING = "planejamento"
    ACTIVE = "ativo"
    ON_HOLD = "pausado"
    COMPLETED = "concluido"
    CANCELLED = "cancelado"


class ProjectPriority(Enum):
    """Prioridade dos projetos"""
    LOW = "baixa"
    MEDIUM = "media"
    HIGH = "alta"
    CRITICAL = "critica"


class TaskStatus(Enum):
    """Status das tarefas"""
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "em_andamento"
    REVIEW = "revisao"
    DONE = "concluido"
    BLOCKED = "bloqueado"


class TaskPriority(Enum):
    """Prioridade das tarefas"""
    LOW = "baixa"
    MEDIUM = "media"
    HIGH = "alta"
    URGENT = "urgente"


class TaskType(Enum):
    """Tipos de tarefa"""
    FEATURE = "funcionalidade"
    BUG = "bug"
    IMPROVEMENT = "melhoria"
    DOCUMENTATION = "documentacao"
    RESEARCH = "pesquisa"
    MAINTENANCE = "manutencao"


class Project(db.Model):
    """Projetos para gestão com Kanban"""
    __tablename__ = 'projects'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Metadata do projeto
    key: Mapped[str] = mapped_column(String(10), nullable=False, unique=True, index=True)  # ex: "FISIO"
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # ex: "desenvolvimento", "clinico"
    
    # Status e prioridade
    status: Mapped[ProjectStatus] = mapped_column(db.Enum(ProjectStatus), default=ProjectStatus.PLANNING, index=True)
    priority: Mapped[ProjectPriority] = mapped_column(db.Enum(ProjectPriority), default=ProjectPriority.MEDIUM, index=True)
    
    # Datas
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    completed_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Progresso e estimativas
    estimated_hours: Mapped[Optional[float]] = mapped_column(Float)
    actual_hours: Mapped[float] = mapped_column(Float, default=0.0)
    budget: Mapped[Optional[float]] = mapped_column(Float)
    
    # Equipe
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    team_members: Mapped[List[str]] = mapped_column(JSON, default=list)  # IDs dos membros da equipe
    
    # Configuração do Kanban
    board_columns: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    # Formato: [{"id": "todo", "name": "To Do", "order": 1, "limit": null, "color": "#blue"}]
    
    # Métricas e KPIs
    metrics: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    # Formato: {
    #   "velocity": 0,
    #   "cycle_time": 0,
    #   "lead_time": 0,
    #   "burndown": []
    # }
    
    # Arquivos e recursos
    attachments: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    
    # Controle
    is_template: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    
    @hybrid_property
    def progress_percentage(self):
        """Calcula porcentagem de progresso baseado nas tarefas"""
        if not self.tasks:
            return 0
        
        completed_tasks = sum(1 for task in self.tasks if task.status == TaskStatus.DONE)
        total_tasks = len([task for task in self.tasks if not task.is_archived])
        
        if total_tasks == 0:
            return 0
        
        return (completed_tasks / total_tasks) * 100
    
    @hybrid_property
    def is_overdue(self):
        """Verifica se o projeto está atrasado"""
        if not self.due_date or self.status in [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]:
            return False
        return date.today() > self.due_date
    
    @hybrid_property
    def days_remaining(self):
        """Dias restantes até o prazo"""
        if not self.due_date:
            return None
        return (self.due_date - date.today()).days
    
    def get_team_members_details(self):
        """Obtém detalhes dos membros da equipe"""
        from .user import User
        if not self.team_members:
            return []
        
        members = User.query.filter(User.id.in_(self.team_members)).all()
        return [member.to_dict() for member in members]
    
    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'key': self.key,
            'category': self.category,
            'status': self.status.value,
            'priority': self.priority.value,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'estimated_hours': self.estimated_hours,
            'actual_hours': self.actual_hours,
            'budget': self.budget,
            'progress_percentage': round(self.progress_percentage, 1),
            'is_overdue': self.is_overdue,
            'days_remaining': self.days_remaining,
            'tags': self.tags,
            'is_template': self.is_template,
            'is_archived': self.is_archived,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_details:
            data.update({
                'team_members': self.get_team_members_details(),
                'board_columns': self.board_columns,
                'metrics': self.metrics,
                'attachments': self.attachments,
                'owner': self.owner.to_dict() if self.owner else None,
                'task_count': len([t for t in self.tasks if not t.is_archived]),
                'completed_task_count': len([t for t in self.tasks if t.status == TaskStatus.DONE and not t.is_archived])
            })
        
        return data


class Task(db.Model):
    """Tarefas do sistema Kanban"""
    __tablename__ = 'tasks'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey('projects.id'), nullable=False)
    
    # Identificação
    key: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)  # ex: "FISIO-123"
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Classificação
    task_type: Mapped[TaskType] = mapped_column(db.Enum(TaskType), nullable=False, index=True)
    status: Mapped[TaskStatus] = mapped_column(db.Enum(TaskStatus), default=TaskStatus.BACKLOG, index=True)
    priority: Mapped[TaskPriority] = mapped_column(db.Enum(TaskPriority), default=TaskPriority.MEDIUM, index=True)
    
    # Atribuição
    assignee_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('users.id'), index=True)
    reporter_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Estimativas e tracking
    story_points: Mapped[Optional[int]] = mapped_column(Integer)  # Para Scrum
    estimated_hours: Mapped[Optional[float]] = mapped_column(Float)
    actual_hours: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Datas importantes
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    completed_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relacionamentos entre tarefas
    parent_task_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('tasks.id'))
    depends_on: Mapped[List[str]] = mapped_column(JSON, default=list)  # IDs das tarefas que esta depende
    
    # Posicionamento no Kanban
    column_id: Mapped[str] = mapped_column(String(50), nullable=False, default="backlog")
    board_position: Mapped[int] = mapped_column(Integer, default=0)  # Posição na coluna
    
    # Sprint (se usar metodologia ágil)
    sprint_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('sprints.id'))
    
    # Metadados
    labels: Mapped[List[str]] = mapped_column(JSON, default=list)
    components: Mapped[List[str]] = mapped_column(JSON, default=list)  # Componentes do sistema afetados
    
    # Arquivos e links
    attachments: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    external_links: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    
    # Critérios de aceitação
    acceptance_criteria: Mapped[List[str]] = mapped_column(JSON, default=list)
    
    # Controle
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id], backref="assigned_tasks")
    reporter = relationship("User", foreign_keys=[reporter_id], backref="reported_tasks")
    parent_task = relationship("Task", remote_side=[id], backref="subtasks")
    sprint = relationship("Sprint", back_populates="tasks")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    time_logs = relationship("TimeLog", back_populates="task", cascade="all, delete-orphan")
    
    @hybrid_property
    def is_overdue(self):
        """Verifica se a tarefa está atrasada"""
        if not self.due_date or self.status == TaskStatus.DONE:
            return False
        return date.today() > self.due_date
    
    @hybrid_property
    def age_in_days(self):
        """Idade da tarefa em dias"""
        return (datetime.utcnow() - self.created_at).days
    
    @hybrid_property
    def cycle_time(self):
        """Tempo de ciclo da tarefa (primeiro movimento até done)"""
        if self.status != TaskStatus.DONE or not self.start_date or not self.completed_date:
            return None
        return (self.completed_date - self.start_date).total_seconds() / 3600  # horas
    
    def can_move_to_status(self, new_status):
        """Verifica se a tarefa pode ser movida para o novo status"""
        # Verificar dependências
        if new_status == TaskStatus.IN_PROGRESS:
            for dep_id in self.depends_on:
                dep_task = Task.query.get(dep_id)
                if dep_task and dep_task.status != TaskStatus.DONE:
                    return False, f"Tarefa dependente {dep_task.key} não foi concluída"
        
        return True, "OK"
    
    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'key': self.key,
            'title': self.title,
            'description': self.description,
            'task_type': self.task_type.value,
            'status': self.status.value,
            'priority': self.priority.value,
            'assignee_id': self.assignee_id,
            'reporter_id': self.reporter_id,
            'story_points': self.story_points,
            'estimated_hours': self.estimated_hours,
            'actual_hours': self.actual_hours,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'parent_task_id': self.parent_task_id,
            'column_id': self.column_id,
            'board_position': self.board_position,
            'sprint_id': self.sprint_id,
            'labels': self.labels,
            'is_overdue': self.is_overdue,
            'age_in_days': self.age_in_days,
            'cycle_time': self.cycle_time,
            'is_archived': self.is_archived,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_details:
            data.update({
                'depends_on': self.depends_on,
                'components': self.components,
                'attachments': self.attachments,
                'external_links': self.external_links,
                'acceptance_criteria': self.acceptance_criteria,
                'assignee': self.assignee.to_dict() if self.assignee else None,
                'reporter': self.reporter.to_dict() if self.reporter else None,
                'project': {'id': self.project.id, 'name': self.project.name, 'key': self.project.key} if self.project else None,
                'parent_task': {'id': self.parent_task.id, 'key': self.parent_task.key, 'title': self.parent_task.title} if self.parent_task else None,
                'subtask_count': len(self.subtasks) if hasattr(self, 'subtasks') else 0,
                'comment_count': len(self.comments),
                'start_date': self.start_date.isoformat() if self.start_date else None,
                'completed_date': self.completed_date.isoformat() if self.completed_date else None
            })
        
        return data


class Sprint(db.Model):
    """Sprints para metodologia ágil"""
    __tablename__ = 'sprints'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey('projects.id'), nullable=False)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    goal: Mapped[Optional[str]] = mapped_column(Text)
    
    # Datas
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Métricas
    planned_story_points: Mapped[Optional[int]] = mapped_column(Integer)
    completed_story_points: Mapped[int] = mapped_column(Integer, default=0)
    
    # Retrospectiva
    retrospective_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    project = relationship("Project", back_populates="sprints")
    tasks = relationship("Task", back_populates="sprint")
    
    @hybrid_property
    def duration_days(self):
        """Duração do sprint em dias"""
        return (self.end_date - self.start_date).days
    
    @hybrid_property
    def days_remaining(self):
        """Dias restantes do sprint"""
        if self.is_completed:
            return 0
        remaining = (self.end_date - date.today()).days
        return max(0, remaining)
    
    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'goal': self.goal,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'is_active': self.is_active,
            'is_completed': self.is_completed,
            'planned_story_points': self.planned_story_points,
            'completed_story_points': self.completed_story_points,
            'duration_days': self.duration_days,
            'days_remaining': self.days_remaining,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_details:
            data.update({
                'retrospective_notes': self.retrospective_notes,
                'project': {'id': self.project.id, 'name': self.project.name} if self.project else None,
                'task_count': len(self.tasks),
                'completed_task_count': len([t for t in self.tasks if t.status == TaskStatus.DONE])
            })
        
        return data


class TaskComment(db.Model):
    """Comentários nas tarefas"""
    __tablename__ = 'task_comments'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey('tasks.id'), nullable=False)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)  # Comentário interno da equipe
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    task = relationship("Task", back_populates="comments")
    author = relationship("User", backref="task_comments")
    
    def to_dict(self):
        """Converte para dicionário"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'content': self.content,
            'is_internal': self.is_internal,
            'author': self.author.to_dict() if self.author else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class TimeLog(db.Model):
    """Registro de tempo nas tarefas"""
    __tablename__ = 'time_logs'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey('tasks.id'), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    
    hours: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    date_worked: Mapped[date] = mapped_column(Date, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    task = relationship("Task", back_populates="time_logs")
    user = relationship("User", backref="time_logs")
    
    def to_dict(self):
        """Converte para dicionário"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'hours': self.hours,
            'description': self.description,
            'date_worked': self.date_worked.isoformat(),
            'user': self.user.to_dict() if self.user else None,
            'created_at': self.created_at.isoformat()
        }