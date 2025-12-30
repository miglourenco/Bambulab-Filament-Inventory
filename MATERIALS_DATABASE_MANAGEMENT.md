# Materials Database Management

## Nova Funcionalidade

Foi criada uma página completa de gestão da base de dados de materiais, acessível através do menu principal da aplicação.

---

## Acesso

### Web Interface
1. Aceder à aplicação web
2. Clicar no tab **"Materials DB"** no menu superior
3. Ou usar o menu lateral (mobile): **"Materials Database"**

### URL Direta
```
http://localhost:3000/#/materials-database
```

---

## Funcionalidades

### 📊 Dashboard de Estatísticas

No topo da página, 4 cards mostram:
- **Total Materials**: Número total de materiais na base de dados
- **Material Types**: Número de tipos diferentes (PLA, ABS, PETG, etc.)
- **With EAN**: Quantos materiais têm códigos EAN
- **Duplicate EANs**: Número de EANs que aparecem em múltiplas cores (alerta de problemas)

### 🔍 Pesquisa e Filtros

- **Barra de pesquisa**: Pesquisa por qualquer campo (manufacturer, material, colorname, etc.)
- **Filtro por Material Type**: Dropdown para filtrar apenas um tipo (PLA, ABS, etc.)
- **Pesquisa em tempo real**: Resultados aparecem instantaneamente

### 📋 Tabela de Materiais

Colunas exibidas:
- **Manufacturer**: Fabricante (BambuLab, etc.)
- **Material**: Tipo de material (PLA, ABS, PETG, etc.)
- **Name**: Nome do produto completo
- **Color Name**: Nome da cor
- **Color**: Preview visual da cor + código HEX
- **EAN**: Códigos de barras (múltiplos EANs mostrados como chips)
- **Note**: Status/nota (Custom, Official, Verified, etc.)
- **Actions**: Botões de ação (Editar, Apagar, Duplicar)

### ➕ Adicionar Novo Material

**Botão:** "Add Material" (verde, topo direito)

**Campos do formulário:**
1. **Manufacturer** ⚠️ Obrigatório
   - Fabricante do material
   - Exemplo: `BambuLab`

2. **Material Type** ⚠️ Obrigatório
   - Tipo de material (combobox com sugestões)
   - Exemplos: `PLA`, `ABS`, `PETG`, `TPU`
   - Aceita valores personalizados

3. **Product Name** ⚠️ Obrigatório
   - Nome completo do produto
   - Exemplo: `Bambu PLA Basic`

4. **Color Name** ⚠️ Obrigatório
   - Nome da cor
   - Exemplos: `Black`, `Blue`, `Bambu Green`

5. **Color HEX** ⚠️ Obrigatório
   - Código hexadecimal da cor
   - Formato: `#000000`
   - **Color Picker integrado**: Clica no quadrado de preview para escolher a cor visualmente

6. **EAN Codes** (opcional)
   - Códigos de barras EAN
   - Múltiplos EANs separados por vírgula
   - Exemplo: `6975337032878, 6975337030331`

7. **Note/Status** (opcional)
   - Status do material
   - Opções: Vazio, `Custom`, `Official`, `Verified`, `Unverified`

**Validação:**
- Campos obrigatórios não podem ficar vazios
- Color HEX deve estar no formato correto (`#RRGGBB`)
- Sistema verifica se material já existe (mesmo manufacturer + material + name + colorname + color)

### ✏️ Editar Material

**Ação:** Clica no ícone de lápis (azul) na linha do material

- Abre o mesmo formulário do "Add Material"
- Campos pré-preenchidos com dados atuais
- Permite alterar qualquer campo
- Validação idêntica ao adicionar

**Casos de uso:**
- Corrigir cor HEX incorreta
- Adicionar/atualizar EAN
- Mudar status/nota
- Corrigir nome de cor

### 🗑️ Apagar Material

**Ação:** Clica no ícone de lixo (vermelho) na linha do material

- Mostra diálogo de confirmação
- Exibe nome completo do material a apagar
- **⚠️ Aviso:** Ação irreversível!
- Requer confirmação explícita

**Quando usar:**
- Material duplicado
- Entrada errada
- Material descontinuado

### 📋 Duplicar Material

**Ação:** Clica no ícone de cópia (azul claro) na linha do material

- Copia todos os campos do material
- Adiciona " (Copy)" ao nome da cor
- **Remove o EAN** (evita duplicatas)
- Abre formulário para edição antes de salvar

**Casos de uso:**
- Criar variante de cor similar
- Adicionar Spool quando só existe Refill (ou vice-versa)
- Rapidamente adicionar materiais similares

---

## Backend API Endpoints

### GET `/materials/all`
Retorna todos os materiais da base de dados

**Response:**
```json
[
  {
    "manufacturer": "BambuLab",
    "material": "ABS",
    "name": "Bambu ABS",
    "colorname": "Black",
    "color": "#000000",
    "note": "",
    "ean": "6975337032878,6975337030331"
  }
]
```

### POST `/materials/add`
Adiciona novo material à base de dados

**Body:**
```json
{
  "manufacturer": "BambuLab",
  "material": "PLA",
  "name": "Bambu PLA Basic",
  "colorname": "Custom Blue",
  "color": "#0000FF",
  "note": "Custom",
  "ean": "1234567890123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Material added successfully"
}
```

### PUT `/materials/update`
Atualiza material existente

**Body:** Mesma estrutura do POST `/materials/add`

**Response:**
```json
{
  "success": true,
  "message": "Material updated successfully"
}
```

### DELETE `/materials/delete`
Apaga material da base de dados

**Body:**
```json
{
  "manufacturer": "BambuLab",
  "material": "PLA",
  "name": "Bambu PLA Basic",
  "colorname": "Custom Blue",
  "color": "#0000FF"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Material deleted successfully"
}
```

---

## Fluxo de Trabalho Típico

### 1. Adicionar Material Personalizado

```
1. Clica "Add Material"
2. Preenche:
   - Manufacturer: "Generic Brand"
   - Material Type: "PETG"
   - Product Name: "Generic PETG Plus"
   - Color Name: "Sky Blue"
   - Color HEX: (usa color picker para escolher)
   - EAN: "1234567890123"
   - Note: "Custom"
3. Clica "Save"
4. Material aparece na tabela
```

### 2. Corrigir EAN Duplicado

```
1. Filtra por material type (ex: "ABS")
2. Procura material com EAN incorreto
3. Clica ícone de editar (lápis)
4. Remove EAN incorreto do campo "EAN Codes"
5. Clica "Save"
6. Estatística "Duplicate EANs" diminui
```

### 3. Adicionar Variante de Cor

```
1. Encontra material base (ex: "Bambu PLA - Red")
2. Clica ícone de duplicar (cópia)
3. Modifica:
   - Color Name: "Maroon Red"
   - Color HEX: "#9D2235" (usa color picker)
   - EAN: "novo_ean_aqui"
4. Clica "Save"
5. Nova variante adicionada
```

---

## Dicas e Melhores Práticas

### 🎨 Escolher Cor Correta

1. **Color Picker Visual:**
   - Clica no quadrado colorido ao lado do campo HEX
   - Escolhe cor visualmente
   - HEX atualiza automaticamente

2. **Comparar com Embalagem:**
   - Usa uma foto da bobina
   - Abre color picker
   - Tenta aproximar a cor real

### 🔍 Verificar Duplicatas

1. **Antes de adicionar:**
   - Pesquisa por colorname primeiro
   - Filtra por material type
   - Verifica se cor similar já existe

2. **Usar estatística:**
   - Card "Duplicate EANs" mostra problemas
   - Se > 0, há EANs para corrigir

### 📦 Organização de EANs

**Formato recomendado:**
```
Spool EAN, Refill EAN
6975337032878, 6975337030331
```

**Não fazer:**
- ❌ Espaços extras: `6975337032878 ,  6975337030331`
- ❌ EANs iguais repetidos: `6975337032878, 6975337032878`
- ✅ Fazer: `6975337032878,6975337030331` (sem espaços ou com um espaço)

### 🔒 Backup Automático

- **Sistema salva automaticamente** em `data/base_dados_completa.json`
- Scripts de manutenção criam backups
- Backup manual recomendado antes de edições massivas:
  ```bash
  cp data/base_dados_completa.json data/base_dados_completa.json.backup-manual
  ```

---

## Segurança e Permissões

⚠️ **Atenção:** Esta página permite modificar diretamente a base de dados de materiais!

**Recomendações:**
1. Apenas usuários autorizados devem ter acesso
2. Fazer backup antes de edições importantes
3. Validar EANs em websites oficiais antes de adicionar
4. Testar com scan de código de barras real antes de salvar

---

## Integração com Sistema Existente

### Como os Materiais são Usados

1. **Scan de EAN:**
   - Sistema procura EAN na base de dados
   - Retorna manufacturer, material, name, colorname, color
   - Pré-preenche formulário de adicionar filamento

2. **HASS Sync:**
   - Sistema usa `findColorByNameAndHex()` para identificar cor
   - Procura por name + color HEX
   - Retorna colorname correspondente

3. **Dropdown de Cores:**
   - Filtra cores por material type
   - Mostra apenas colornames únicos
   - Permite seleção rápida

4. **Edição de Filamento:**
   - Mudanças salvam automaticamente na base de dados
   - Novos materiais são adicionados
   - EANs são atualizados

---

## Troubleshooting

### "Material already exists"
**Problema:** Tentou adicionar material duplicado

**Solução:**
1. Pesquisa pelo material existente
2. Usa "Edit" para atualizar
3. Ou usa "Duplicate" se quer criar variante

### EAN não aparece no scan
**Problema:** EAN adicionado mas scan não encontra

**Solução:**
1. Verifica formato do EAN (13 dígitos, sem espaços extras)
2. Recarrega aplicação (Ctrl+F5)
3. Verifica se `base_dados_completa.json` foi atualizado

### Color Picker não funciona
**Problema:** Clicar no quadrado não abre picker

**Solução:**
1. Tenta novamente
2. Escreve HEX manualmente no formato `#RRGGBB`
3. Usa website externo para obter HEX: https://htmlcolorcodes.com/

### Alterações não salvam
**Problema:** Clica "Save" mas dados não atualizam

**Solução:**
1. Verifica campos obrigatórios (todos preenchidos?)
2. Verifica formato HEX (ex: `#000000` não `000000`)
3. Verifica console do browser (F12) para erros
4. Verifica logs do backend

---

## Arquivos Relacionados

### Frontend
- `frontend/src/views/MaterialsDatabaseView.vue` - Página principal
- `frontend/src/router/index.js` - Rota `/materials-database`
- `frontend/src/layouts/DefaultLayout.vue` - Menu de navegação

### Backend
- `index.js` - Endpoints API:
  - GET `/materials/all`
  - POST `/materials/add`
  - PUT `/materials/update`
  - DELETE `/materials/delete`
- `src/materials-db.js` - Gestão da base de dados

### Database
- `data/base_dados_completa.json` - Base de dados de materiais

---

## Próximas Melhorias (Sugestões)

1. **Import/Export:**
   - Exportar base de dados para CSV
   - Importar materiais de CSV
   - Backup/Restore com interface

2. **Validação de EAN:**
   - Verificar checksum do EAN
   - Lookup automático em APIs externas
   - Alertar se EAN inválido

3. **Histórico de Alterações:**
   - Log de quem alterou o quê
   - Desfazer última alteração
   - Ver histórico de um material

4. **Bulk Operations:**
   - Editar múltiplos materiais de uma vez
   - Apagar múltiplos materiais
   - Atualizar EANs em batch

5. **Validação de Cores:**
   - Sugerir nome de cor baseado em HEX
   - Alertar se cores muito similares
   - Agrupar cores por família

6. **Permissões:**
   - Níveis de acesso (view, edit, admin)
   - Aprovação de mudanças críticas
   - Auditoria de alterações
