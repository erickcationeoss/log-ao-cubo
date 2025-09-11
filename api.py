from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from typing import Optional

app = FastAPI()
security = HTTPBearer()

# Configuração do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Função para verificar o token JWT
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Verifica o token com o Supabase
        user = supabase.auth.get_user(credentials.credentials)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não foi possível validar as credenciais",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Rota para obter estatísticas (protegida)
@app.get("/api/estatisticas")
async def get_estatisticas(user = Depends(verify_token)):
    try:
        # Entregas de hoje
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        entregas_hoje = supabase.table("entregas").select(
            "id", count="exact"
        ).gte("created_at", today.isoformat()).execute()
        
        # Entregas pendentes
        entregas_pendentes = supabase.table("entregas").select(
            "id", count="exact"
        ).eq("status", "pendente").execute()
        
        # Entregas concluídas
        entregas_concluidas = supabase.table("entregas").select(
            "id", count="exact"
        ).eq("status", "entregue").execute()
        
        return {
            "hoje": entregas_hoje.count,
            "pendentes": entregas_pendentes.count,
            "concluidas": entregas_concluidas.count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)