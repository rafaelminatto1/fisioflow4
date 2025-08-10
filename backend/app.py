"""
FisioFlow - Sistema de Gestão para Clínicas de Fisioterapia
Aplicação Flask principal
"""

from app import create_app, db

# Instância da aplicação para desenvolvimento
app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Cria as tabelas se não existirem (use alembic em produção)
        db.create_all()
    
    # Executa em modo debug para desenvolvimento
    app.run(debug=True, host='0.0.0.0', port=5000)