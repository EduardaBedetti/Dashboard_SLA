# Dashboard SLA V2

Versao em Python do dashboard de SLA, agora com:

- `pandas` para normalizacao e consolidacao dos tickets
- `Streamlit` para a interface
- integracao direta com o Google Sheets via API oficial
- filtros, metricas, alertas operacionais e exportacao em CSV

## Estrutura

- `app.py`: interface da aplicacao
- `dashboard_core.py`: regras de negocio, normalizacao e metricas
- `google_sheets.py`: autenticacao e leitura das planilhas
- `requirements.txt`: dependencias da v2

## Como rodar

### 1. Entrar na pasta da v2

No PowerShell:

```powershell
cd "C:\Users\Bedetti\Documents\ms pickles\evelyn\dashboard-sla\v2"
```

### 2. Criar um ambiente virtual

Se o comando `py` existir:

```powershell
py -m venv .venv
```

Se o seu Windows usa `python` no PATH:

```powershell
python -m venv .venv
```

### 3. Ativar o ambiente virtual

No PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Se o PowerShell bloquear a ativacao, rode antes:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

e tente de novo o `Activate.ps1`.

### 4. Instalar as dependencias

```bash
pip install -r requirements.txt
```

As dependencias usadas pela v2 estao em `requirements.txt`:

- `streamlit`
- `pandas`
- `numpy`
- `plotly`
- `google-api-python-client`
- `google-auth-httplib2`
- `google-auth-oauthlib`

### 5. Gerar o arquivo de credenciais do Google

Voce precisa de um destes arquivos:

- `credentials.json` para OAuth Desktop App
- `service_account.json` para conta de servico

Para o fluxo mais simples, siga o quickstart oficial do Google Sheets API e gere um `credentials.json` de **Desktop app**:

- https://developers.google.com/workspace/sheets/api/quickstart/python

Depois, coloque o arquivo dentro da pasta `v2` ou informe o caminho completo dele no painel lateral da app.

### 6. Rodar a aplicacao

```bash
streamlit run app.py
```

Se o `streamlit` nao estiver no PATH, use:

```powershell
python -m streamlit run app.py
```

ou:

```powershell
py -m streamlit run app.py
```

### 7. Abrir no navegador

Quando o servidor subir, o terminal vai mostrar algo assim:

```text
Local URL: http://localhost:8501
```

Abra esse endereco no navegador.

### 8. Preencher os campos da sidebar

Na aplicacao, preencha:

1. `Arquivo de credenciais`
2. `Arquivo de token`
3. `Fontes da planilha`

O `token.json` sera criado automaticamente na primeira autenticacao quando voce usar OAuth.

### 9. Carregar as fontes

Clique em `Carregar dashboard`. Se estiver tudo certo, a v2 vai:

- ler os ranges das planilhas no Google Sheets
- normalizar as colunas com `pandas`
- calcular SLA, atrasos e alertas operacionais
- montar grafico, metricas e tabela consolidada

### Exemplo completo de execucao

```powershell
cd "C:\Users\Bedetti\Documents\ms pickles\evelyn\dashboard-sla\v2"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

### Problemas comuns

- `py` nao encontrado:
  tente `python` no lugar de `py`.
- `streamlit` nao encontrado:
  confirme se o ambiente virtual esta ativado antes de rodar.
- tela abre mas nao carrega dados:
  confira se a URL/ID da planilha e o `range` estao corretos.
- erro de permissao no Google Sheets:
  confirme se a conta autenticada tem acesso a planilha.
- usando `service_account.json`:
  compartilhe a planilha com o email da conta de servico.

## Formato das fontes

### Formato simples

Agora voce pode usar apenas o link da planilha:

```text
https://docs.google.com/spreadsheets/d/SEU_ID/edit#gid=0
```

Nesse modo, a aplicacao:

- extrai o `spreadsheetId` automaticamente
- lista as abas visiveis da planilha
- tenta ler cada aba em `A:ZZ`
- consolida tudo no dashboard

Esse e o formato recomendado se voce vai apenas mandar o link da planilha com permissao de leitura.

### Formato avancado opcional

No painel lateral, informe uma fonte por linha neste formato:

```text
nome_da_fonte|url_ou_id_da_planilha|aba!A:Z
```

Exemplo:

```text
Pluggy|https://docs.google.com/spreadsheets/d/SEU_ID/edit#gid=0|Tickets!A:Z
S1NC|1abcDEFghiJKLmnoPQRstuVWxyz1234567890|Backlog!A:Z
Winner|https://docs.google.com/spreadsheets/d/SEU_ID/edit#gid=0|Operacao!A:Z
```

Se a planilha nao tiver coluna `Area`, o sistema usa o nome da fonte como fallback.
No modo simples, o nome da aba vira a referencia principal da fonte.

## Autenticacao

Esta v2 suporta dois cenarios:

- `credentials.json` do OAuth Desktop App, com criacao automatica do `token.json`
- `service_account.json`, desde que a planilha tenha sido compartilhada com a conta de servico

## Referencias oficiais

- Python quickstart do Google Sheets API:
  https://developers.google.com/workspace/sheets/api/quickstart/python
- Leitura de valores no Google Sheets API:
  https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
