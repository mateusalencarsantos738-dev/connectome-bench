# Como Obter e Configurar o Token do Codex

**ATENÇÃO: Nunca compartilhe seu token. Nunca o commite no Git.**

---

## 1. Obter o token

1. Acesse [https://codex.flywire.ai/](https://codex.flywire.ai/)
2. Faça login com sua conta Google
3. Vá para [https://codex.flywire.ai/account](https://codex.flywire.ai/account)
4. Copie seu **API token** da página de conta

---

## 2. Configurar no terminal (sessão atual)

```bash
export CODEX_API_TOKEN="cole_seu_token_aqui"
```

---

## 3. Configurar permanentemente (opcional)

Adicione ao seu `~/.bashrc` ou `~/.zshrc`:

```bash
export CODEX_API_TOKEN="cole_seu_token_aqui"
```

Depois recarregue:

```bash
source ~/.bashrc
```

> **Atenção**: Se usar `.bashrc`, certifique-se de que o arquivo não é versionado nem compartilhado.

---

## 4. Usar no script de download

```bash
# Verificar token configurado
echo $CODEX_API_TOKEN

# Executar download
python src/data/download_codex.py

# Ou apenas validar arquivos locais (sem token)
python src/data/validate_local.py
```

---

## 5. Regras de segurança

| ❌ NUNCA faça | ✅ SEMPRE faça |
|---|---|
| Colocar o token em código-fonte | Usar `CODEX_API_TOKEN` env var |
| Commitar o token no Git | Verificar `.gitignore` antes de commitar |
| Salvar o token em `AGENTS.md` | Guardar o token apenas no terminal ou gerenciador de senhas |
| Colocar o token em notebooks | Carregar o token via `os.environ.get()` |
| Postar o token em logs | Mascarar o token nos logs (`***`) |

---

## 6. Verificar que o .gitignore protege o projeto

O `.gitignore` atual exclui:
- `data/raw/*` — datasets brutos
- `*.csv.gz`, `*.parquet` — arquivos de dados
- `.env` — arquivos de variáveis de ambiente

O token **não deve estar** em nenhum arquivo dentro do repositório.
