"""
API endpoints para sistema de gestão de projetos com Kanban
"""

from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import joinedload

from ..models.project_management import (
    Project, Task, Sprint, TaskComment, TimeLog,
    ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, TaskType
)
from ..models.user import User
from .. import db
from ..utils.decorators import role_required
from ..utils.pagination import paginate
from ..utils.validation import validate_json

project_management_bp = Blueprint('project_management', __name__, url_prefix='/api/projects')


# =============================================================================
# PROJETOS
# =============================================================================

@project_management_bp.route('/projects', methods=['GET'])
@jwt_required()
def get_projects():
    """Lista projetos"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    query = Project.query.filter(Project.is_archived == False)
    
    # Filtrar por projetos que o usuário é owner ou membro da equipe
    if user.role not in ['ADMIN']:
        query = query.filter(
            or_(
                Project.owner_id == user_id,
                Project.team_members.contains([user_id])
            )
        )
    
    # Filtros
    status = request.args.get('status')
    if status:
        query = query.filter(Project.status == ProjectStatus(status))
    
    priority = request.args.get('priority')
    if priority:
        query = query.filter(Project.priority == ProjectPriority(priority))
    
    category = request.args.get('category')
    if category:
        query = query.filter(Project.category.ilike(f'%{category}%'))
    
    owner_id = request.args.get('owner_id')
    if owner_id:
        query = query.filter(Project.owner_id == owner_id)
    
    # Busca por texto
    search = request.args.get('search')
    if search:
        query = query.filter(
            or_(
                Project.name.ilike(f'%{search}%'),
                Project.description.ilike(f'%{search}%'),
                Project.key.ilike(f'%{search}%')
            )
        )
    
    # Ordenação
    sort_by = request.args.get('sort_by', 'updated_at')
    if sort_by == 'name':
        query = query.order_by(Project.name)
    elif sort_by == 'due_date':
        query = query.order_by(Project.due_date.nullslast())
    elif sort_by == 'priority':
        query = query.order_by(desc(Project.priority))
    else:
        query = query.order_by(desc(Project.updated_at))
    
    # Eager loading
    query = query.options(joinedload(Project.owner))
    
    include_details = request.args.get('include_details', 'false').lower() == 'true'
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda project: project.to_dict(include_details=include_details)
    )


@project_management_bp.route('/projects/<project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Obtém projeto específico"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Projeto não encontrado'}), 404
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id and user_id not in project.team_members:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    return jsonify({
        'project': project.to_dict(include_details=True)
    })


@project_management_bp.route('/projects', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'name': {'type': 'string', 'required': True, 'maxlength': 200},
    'description': {'type': 'string', 'required': False},
    'key': {'type': 'string', 'required': True, 'maxlength': 10},
    'category': {'type': 'string', 'required': True, 'maxlength': 100},
    'priority': {'type': 'string', 'required': False, 'enum': [p.value for p in ProjectPriority]},
    'start_date': {'type': 'string', 'required': False},
    'due_date': {'type': 'string', 'required': False},
    'estimated_hours': {'type': 'number', 'required': False},
    'budget': {'type': 'number', 'required': False},
    'team_members': {'type': 'list', 'required': False},
    'tags': {'type': 'list', 'required': False}
})
def create_project():
    """Cria novo projeto"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar se a chave do projeto já existe
    existing_project = Project.query.filter_by(key=data['key'].upper()).first()
    if existing_project:
        return jsonify({'error': 'Chave do projeto já existe'}), 400
    
    # Validar datas se fornecidas
    start_date = None
    due_date = None
    
    if data.get('start_date'):
        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data de início inválido'}), 400
    
    if data.get('due_date'):
        try:
            due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data de entrega inválido'}), 400
    
    if start_date and due_date and due_date <= start_date:
        return jsonify({'error': 'Data de entrega deve ser posterior à data de início'}), 400
    
    # Validar membros da equipe
    team_members = data.get('team_members', [])
    if team_members:
        valid_members = User.query.filter(User.id.in_(team_members)).all()
        if len(valid_members) != len(team_members):
            return jsonify({'error': 'Um ou mais membros da equipe não foram encontrados'}), 400
    
    # Colunas padrão do Kanban
    default_columns = [
        {"id": "backlog", "name": "Backlog", "order": 1, "limit": None, "color": "#gray"},
        {"id": "todo", "name": "To Do", "order": 2, "limit": None, "color": "#blue"},
        {"id": "in_progress", "name": "Em Andamento", "order": 3, "limit": 3, "color": "#yellow"},
        {"id": "review", "name": "Em Revisão", "order": 4, "limit": 2, "color": "#purple"},
        {"id": "done", "name": "Concluído", "order": 5, "limit": None, "color": "#green"}
    ]
    
    project = Project(
        name=data['name'],
        description=data.get('description'),
        key=data['key'].upper(),
        category=data['category'],
        priority=ProjectPriority(data.get('priority', 'medium')),
        start_date=start_date,
        due_date=due_date,
        estimated_hours=data.get('estimated_hours'),
        budget=data.get('budget'),
        owner_id=user_id,
        team_members=team_members,
        board_columns=default_columns,
        tags=data.get('tags', [])
    )
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify({
        'message': 'Projeto criado com sucesso',
        'project': project.to_dict(include_details=True)
    }), 201


@project_management_bp.route('/projects/<project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """Atualiza projeto"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Projeto não encontrado'}), 404
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id:
        return jsonify({'error': 'Sem permissão para editar este projeto'}), 403
    
    data = request.get_json()
    
    # Campos permitidos para atualização
    allowed_fields = [
        'name', 'description', 'category', 'priority', 'start_date', 'due_date',
        'estimated_hours', 'budget', 'team_members', 'tags', 'board_columns'
    ]
    
    # Validações especiais
    if 'start_date' in data and data['start_date']:
        try:
            project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data de início inválido'}), 400
    
    if 'due_date' in data and data['due_date']:
        try:
            project.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data de entrega inválido'}), 400
    
    if 'priority' in data:
        project.priority = ProjectPriority(data['priority'])
    
    # Atualizar campos simples
    for field in ['name', 'description', 'category', 'estimated_hours', 'budget', 'team_members', 'tags', 'board_columns']:
        if field in data:
            setattr(project, field, data[field])
    
    project.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Projeto atualizado com sucesso',
        'project': project.to_dict(include_details=True)
    })


@project_management_bp.route('/projects/<project_id>/status', methods=['PUT'])
@jwt_required()
@validate_json({
    'status': {'type': 'string', 'required': True, 'enum': [s.value for s in ProjectStatus]}
})
def update_project_status(project_id):
    """Atualiza status do projeto"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Projeto não encontrado'}), 404
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id:
        return jsonify({'error': 'Sem permissão para alterar status deste projeto'}), 403
    
    data = request.get_json()
    old_status = project.status
    new_status = ProjectStatus(data['status'])
    
    project.status = new_status
    
    # Definir data de conclusão se mudou para concluído
    if new_status == ProjectStatus.COMPLETED and old_status != ProjectStatus.COMPLETED:
        project.completed_date = date.today()
    elif new_status != ProjectStatus.COMPLETED:
        project.completed_date = None
    
    project.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': f'Status alterado para {new_status.value}',
        'project': project.to_dict(include_details=True)
    })


# =============================================================================
# TAREFAS
# =============================================================================

@project_management_bp.route('/projects/<project_id>/tasks', methods=['GET'])
@jwt_required()
def get_project_tasks(project_id):
    """Lista tarefas do projeto"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Projeto não encontrado'}), 404
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id and user_id not in project.team_members:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    query = Task.query.filter(
        Task.project_id == project_id,
        Task.is_archived == False
    )
    
    # Filtros
    status = request.args.get('status')
    if status:
        query = query.filter(Task.status == TaskStatus(status))
    
    assignee_id = request.args.get('assignee_id')
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    
    task_type = request.args.get('type')
    if task_type:
        query = query.filter(Task.task_type == TaskType(task_type))
    
    priority = request.args.get('priority')
    if priority:
        query = query.filter(Task.priority == TaskPriority(priority))
    
    sprint_id = request.args.get('sprint_id')
    if sprint_id:
        query = query.filter(Task.sprint_id == sprint_id)
    
    # Busca por texto
    search = request.args.get('search')
    if search:
        query = query.filter(
            or_(
                Task.title.ilike(f'%{search}%'),
                Task.description.ilike(f'%{search}%'),
                Task.key.ilike(f'%{search}%')
            )
        )
    
    # Ordenação para Kanban (por coluna e posição)
    view_mode = request.args.get('view', 'kanban')
    if view_mode == 'kanban':
        query = query.order_by(Task.column_id, Task.board_position, Task.created_at)
    else:
        query = query.order_by(desc(Task.updated_at))
    
    # Eager loading
    query = query.options(
        joinedload(Task.assignee),
        joinedload(Task.reporter),
        joinedload(Task.parent_task)
    )
    
    include_details = request.args.get('include_details', 'false').lower() == 'true'
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 100)),  # Kanban precisa de mais tarefas
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda task: task.to_dict(include_details=include_details)
    )


@project_management_bp.route('/tasks', methods=['POST'])
@jwt_required()
@validate_json({
    'project_id': {'type': 'string', 'required': True},
    'title': {'type': 'string', 'required': True, 'maxlength': 300},
    'description': {'type': 'string', 'required': False},
    'task_type': {'type': 'string', 'required': True, 'enum': [t.value for t in TaskType]},
    'priority': {'type': 'string', 'required': False, 'enum': [p.value for p in TaskPriority]},
    'assignee_id': {'type': 'string', 'required': False},
    'due_date': {'type': 'string', 'required': False},
    'estimated_hours': {'type': 'number', 'required': False},
    'story_points': {'type': 'integer', 'required': False},
    'parent_task_id': {'type': 'string', 'required': False},
    'labels': {'type': 'list', 'required': False},
    'acceptance_criteria': {'type': 'list', 'required': False}
})
def create_task():
    """Cria nova tarefa"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar se projeto existe
    project = Project.query.get(data['project_id'])
    if not project:
        return jsonify({'error': 'Projeto não encontrado'}), 404
    
    # Verificar permissões no projeto
    user = User.query.get(user_id)
    if user.role not in ['ADMIN'] and project.owner_id != user_id and user_id not in project.team_members:
        return jsonify({'error': 'Sem permissão para criar tarefas neste projeto'}), 403
    
    # Gerar chave da tarefa
    last_task = Task.query.filter_by(project_id=data['project_id']).order_by(desc(Task.created_at)).first()
    if last_task and last_task.key:
        # Extrair número da última tarefa
        last_number = int(last_task.key.split('-')[1]) if '-' in last_task.key else 0
        task_number = last_number + 1
    else:
        task_number = 1
    
    task_key = f"{project.key}-{task_number}"
    
    # Validar assignee se fornecido
    if data.get('assignee_id'):
        assignee = User.query.get(data['assignee_id'])
        if not assignee:
            return jsonify({'error': 'Usuário assignee não encontrado'}), 404
    
    # Validar data se fornecida
    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data inválido'}), 400
    
    # Determinar posição no board
    last_position = db.session.query(func.max(Task.board_position)).filter_by(
        project_id=data['project_id'],
        column_id='backlog'
    ).scalar() or 0
    
    task = Task(
        project_id=data['project_id'],
        key=task_key,
        title=data['title'],
        description=data.get('description'),
        task_type=TaskType(data['task_type']),
        priority=TaskPriority(data.get('priority', 'medium')),
        assignee_id=data.get('assignee_id'),
        reporter_id=user_id,
        due_date=due_date,
        estimated_hours=data.get('estimated_hours'),
        story_points=data.get('story_points'),
        parent_task_id=data.get('parent_task_id'),
        labels=data.get('labels', []),
        acceptance_criteria=data.get('acceptance_criteria', []),
        board_position=last_position + 1
    )
    
    db.session.add(task)
    db.session.commit()
    
    return jsonify({
        'message': 'Tarefa criada com sucesso',
        'task': task.to_dict(include_details=True)
    }), 201


@project_management_bp.route('/tasks/<task_id>/move', methods=['PUT'])
@jwt_required()
@validate_json({
    'column_id': {'type': 'string', 'required': True},
    'position': {'type': 'integer', 'required': False}
})
def move_task(task_id):
    """Move tarefa no Kanban board"""
    
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': 'Tarefa não encontrada'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    project = task.project
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id and user_id not in project.team_members:
        return jsonify({'error': 'Sem permissão para mover esta tarefa'}), 403
    
    data = request.get_json()
    old_column = task.column_id
    new_column = data['column_id']
    
    # Mapear column_id para TaskStatus
    column_to_status = {
        'backlog': TaskStatus.BACKLOG,
        'todo': TaskStatus.TODO,
        'in_progress': TaskStatus.IN_PROGRESS,
        'review': TaskStatus.REVIEW,
        'done': TaskStatus.DONE,
        'blocked': TaskStatus.BLOCKED
    }
    
    new_status = column_to_status.get(new_column, TaskStatus.TODO)
    
    # Verificar se pode mover para o novo status
    can_move, reason = task.can_move_to_status(new_status)
    if not can_move:
        return jsonify({'error': reason}), 400
    
    # Atualizar status baseado na coluna
    task.status = new_status
    task.column_id = new_column
    
    # Definir timestamps importantes
    if new_status == TaskStatus.IN_PROGRESS and old_column != 'in_progress':
        task.start_date = datetime.utcnow()
    elif new_status == TaskStatus.DONE and task.status != TaskStatus.DONE:
        task.completed_date = datetime.utcnow()
    
    # Reordenar posições na nova coluna
    if 'position' in data:
        new_position = data['position']
        
        # Mover outras tarefas para acomodar a nova posição
        tasks_to_update = Task.query.filter(
            Task.project_id == task.project_id,
            Task.column_id == new_column,
            Task.id != task_id,
            Task.board_position >= new_position
        ).all()
        
        for t in tasks_to_update:
            t.board_position += 1
        
        task.board_position = new_position
    else:
        # Colocar no final da coluna
        max_position = db.session.query(func.max(Task.board_position)).filter_by(
            project_id=task.project_id,
            column_id=new_column
        ).scalar() or 0
        task.board_position = max_position + 1
    
    task.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Tarefa movida com sucesso',
        'task': task.to_dict(include_details=True)
    })


# =============================================================================
# COMENTÁRIOS
# =============================================================================

@project_management_bp.route('/tasks/<task_id>/comments', methods=['GET'])
@jwt_required()
def get_task_comments(task_id):
    """Lista comentários da tarefa"""
    
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': 'Tarefa não encontrada'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    project = task.project
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id and user_id not in project.team_members:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    comments = TaskComment.query.filter_by(task_id=task_id).options(
        joinedload(TaskComment.author)
    ).order_by(TaskComment.created_at).all()
    
    return jsonify({
        'comments': [comment.to_dict() for comment in comments]
    })


@project_management_bp.route('/tasks/<task_id>/comments', methods=['POST'])
@jwt_required()
@validate_json({
    'content': {'type': 'string', 'required': True, 'minlength': 1},
    'is_internal': {'type': 'boolean', 'required': False}
})
def create_task_comment(task_id):
    """Adiciona comentário à tarefa"""
    
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': 'Tarefa não encontrada'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    project = task.project
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id and user_id not in project.team_members:
        return jsonify({'error': 'Sem permissão para comentar nesta tarefa'}), 403
    
    data = request.get_json()
    
    comment = TaskComment(
        task_id=task_id,
        author_id=user_id,
        content=data['content'],
        is_internal=data.get('is_internal', False)
    )
    
    db.session.add(comment)
    db.session.commit()
    
    return jsonify({
        'message': 'Comentário adicionado com sucesso',
        'comment': comment.to_dict()
    }), 201


# =============================================================================
# REGISTRO DE TEMPO
# =============================================================================

@project_management_bp.route('/tasks/<task_id>/time', methods=['POST'])
@jwt_required()
@validate_json({
    'hours': {'type': 'number', 'required': True, 'min': 0.1, 'max': 24},
    'description': {'type': 'string', 'required': False},
    'date_worked': {'type': 'string', 'required': False}
})
def log_time_on_task(task_id):
    """Registra tempo trabalhado na tarefa"""
    
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': 'Tarefa não encontrada'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    project = task.project
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id and user_id not in project.team_members:
        return jsonify({'error': 'Sem permissão para registrar tempo nesta tarefa'}), 403
    
    data = request.get_json()
    
    # Validar data
    date_worked = date.today()
    if data.get('date_worked'):
        try:
            date_worked = datetime.strptime(data['date_worked'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data inválido'}), 400
    
    time_log = TimeLog(
        task_id=task_id,
        user_id=user_id,
        hours=data['hours'],
        description=data.get('description'),
        date_worked=date_worked
    )
    
    # Atualizar horas reais na tarefa
    task.actual_hours += data['hours']
    
    db.session.add(time_log)
    db.session.commit()
    
    return jsonify({
        'message': 'Tempo registrado com sucesso',
        'time_log': time_log.to_dict(),
        'task_actual_hours': task.actual_hours
    }), 201


# =============================================================================
# ESTATÍSTICAS
# =============================================================================

@project_management_bp.route('/projects/<project_id>/stats', methods=['GET'])
@jwt_required()
def get_project_stats(project_id):
    """Estatísticas do projeto"""
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Projeto não encontrado'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role not in ['ADMIN'] and project.owner_id != user_id and user_id not in project.team_members:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    # Estatísticas das tarefas
    tasks = Task.query.filter_by(project_id=project_id, is_archived=False).all()
    
    task_stats = {
        'total': len(tasks),
        'by_status': {},
        'by_type': {},
        'by_priority': {},
        'overdue': len([t for t in tasks if t.is_overdue]),
        'completed': len([t for t in tasks if t.status == TaskStatus.DONE])
    }
    
    # Contar por status
    for status in TaskStatus:
        task_stats['by_status'][status.value] = len([t for t in tasks if t.status == status])
    
    # Contar por tipo
    for task_type in TaskType:
        task_stats['by_type'][task_type.value] = len([t for t in tasks if t.task_type == task_type])
    
    # Contar por prioridade
    for priority in TaskPriority:
        task_stats['by_priority'][priority.value] = len([t for t in tasks if t.priority == priority])
    
    # Estatísticas de tempo
    total_estimated = sum(t.estimated_hours or 0 for t in tasks)
    total_actual = sum(t.actual_hours for t in tasks)
    
    time_stats = {
        'estimated_hours': total_estimated,
        'actual_hours': total_actual,
        'variance': total_actual - total_estimated if total_estimated > 0 else 0,
        'efficiency': (total_estimated / total_actual * 100) if total_actual > 0 else 0
    }
    
    # Velocidade (story points concluídos)
    completed_story_points = sum(t.story_points or 0 for t in tasks if t.status == TaskStatus.DONE and t.story_points)
    
    return jsonify({
        'project': project.to_dict(),
        'task_stats': task_stats,
        'time_stats': time_stats,
        'velocity': completed_story_points,
        'team_size': len(project.team_members) + 1  # +1 para o owner
    })


# Registrar blueprint
def init_app(app):
    """Registra o blueprint no app Flask"""
    app.register_blueprint(project_management_bp)