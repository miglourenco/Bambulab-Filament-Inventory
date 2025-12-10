# Melhorias da Interface de Utilizador e Gestão de EAN

**Data**: 2025-12-10
**Status**: ✅ Concluído

## Resumo

Implementadas melhorias significativas na interface de adicionar/editar filamentos e sistema de gestão de códigos EAN, com funcionalidades automáticas de atualização da base de dados.

## Melhorias Implementadas

### 1. **Interface Visual Melhorada - Diálogo de Adicionar Filamento**

#### Antes:
- Diálogo simples com largura fixa de 500px
- Campos básicos sem ícones
- Sem organização visual
- Botões simples sem destaque

#### Depois:
- **Diálogo mais largo (600px)** com scroll para melhor visualização
- **Cabeçalho estilizado** com fundo primary e ícone
- **Campos organizados por secções** com divisores visuais
- **Ícones em todos os campos** para melhor identificação:
  - `mdi-barcode` - EAN
  - `mdi-factory` - Fabricante
  - `mdi-cog` - Tipo de material
  - `mdi-tag-text` - Nome
  - `mdi-weight` - Tamanho
  - `mdi-gauge` - Percentagem restante
  - `mdi-palette` - Nome da cor
- **Layout responsivo** - campos lado-a-lado em desktop (md="6")
- **Botões melhorados** com ícones e cores apropriadas:
  - Cancelar: vermelho, outlined, com ícone `mdi-close`
  - Guardar: verde, elevated, com ícone `mdi-content-save`
- **Color picker centralizado** com título e elevação

### 2. **Campo EAN / Código de Barras**

Adicionado campo no topo do formulário para introdução manual ou automática de EAN:

**Características:**
- Campo opcional no início do formulário
- Ícone de barcode (`mdi-barcode`)
- Hint text: "Opcional - Código EAN do produto"
- Botão de scanner integrado (apenas em mobile)
- **Estados visuais**:
  - Normal: campo branco
  - Erro: vermelho quando EAN não encontrado
  - Mensagem: "EAN não encontrado na base de dados - será adicionado ao salvar"

**Integração com Scanner:**
- Quando um código é escaneado, preenche automaticamente o campo EAN
- Se o EAN existe na base de dados: preenche todos os campos
- Se o EAN não existe: mostra aviso mas permite continuar

### 3. **Sistema de Gestão de EAN na Base de Dados**

#### Novo Endpoint: `/materials/update-ean`

**Funcionalidade:**
Actualiza ou adiciona materiais com código EAN à `base_dados_completa.json`

**Lógica Inteligente:**

1. **EAN já existe**: Actualiza a entrada existente com novos dados
   ```javascript
   // Actualiza manufacturer, material, name, colorname, color
   return { action: 'updated', ean }
   ```

2. **Material existe mas sem EAN**: Adiciona EAN à entrada existente
   ```javascript
   // Procura por manufacturer + material + name + colorname + color
   // Adiciona EAN à entrada encontrada
   return { action: 'ean_added', ean }
   ```

3. **Material novo**: Cria nova entrada completa
   ```javascript
   {
     manufacturer: "BambuLab",
     material: "PLA",
     name: "Bambu PLA Matte",
     colorname: "Black",
     color: "#000000",
     distance: 98.4,
     note: "Custom",
     productType: "Spool",
     ean: "1234567890123"
   }
   return { action: 'created', ean }
   ```

#### Método `updateOrAddEAN()` em `materials-db.js`

**Localização**: [src/materials-db.js](src/materials-db.js#L149-L203)

```javascript
async updateOrAddEAN(ean, materialData) {
  // 1. Verifica se EAN existe
  // 2. Verifica se material existe sem EAN
  // 3. Cria novo material se necessário
  // 4. Guarda alterações em base_dados_completa.json
}
```

### 4. **Confirmação da Lógica HASS→Manual**

Verificada e confirmada a lógica existente em [src/hass-sync.js](src/hass-sync.js#L70-L89):

**Como funciona:**
1. HASS detecta novo filamento na impressora (com serial RFID)
2. Sistema procura filamento manual não-assignado do **mesmo utilizador**
3. Comparação por: `tipo + fabricante + nome + cor`
4. Se encontrar correspondência:
   - Elimina entrada manual
   - Cria nova entrada com serial RFID
   - Mantém tracking activo
   - Actualiza quantidade restante

**Importante:**
- ✅ Funcionalidade já está correcta
- ✅ Respeita separação por utilizador
- ✅ Apenas substitui se for do mesmo utilizador

### 5. **Melhorias nas Funções JavaScript**

#### Nova função `scanEAN()`
Abre o scanner especificamente para captura de EAN

#### Nova função `closeAddDialog()`
Limpa formulário e estado de erros ao fechar

#### Nova função `resetAddModel()`
Reset completo do modelo incluindo campo EAN

#### Função `addFilament()` actualizada
```javascript
// 1. Adiciona filamento ao inventário
// 2. Se tem EAN e é BambuLab:
//    - Chama /materials/update-ean
//    - Actualiza base_dados_completa.json
//    - Mostra toast de sucesso
// 3. Se é BambuLab mas sem EAN:
//    - Guarda apenas material/cor (como antes)
```

#### Função `handleCodeScanned()` actualizada
```javascript
// 1. Procura filamento existente
// 2. Se não encontrado:
//    - Tenta buscar info do EAN
//    - Preenche campo EAN
//    - Preenche dados do produto (se encontrado)
//    - Se não encontrado: mostra erro mas mantém EAN
//    - Abre diálogo para completar dados
```

### 6. **Traduções Adicionadas**

#### Inglês (`en.js`):
```javascript
ean: 'EAN / Barcode'
```

#### Alemão (`de.js`):
```javascript
ean: 'EAN / Barcode'
```

## Ficheiros Modificados

### Frontend:
1. **[frontend/src/views/HomeView.vue](frontend/src/views/HomeView.vue)**
   - Layout melhorado do diálogo (linhas 16-223)
   - Campo EAN adicionado (linhas 42-65)
   - Campos com ícones e variant outlined
   - Divisores visuais entre secções
   - Funções JavaScript actualizadas (linhas 456-620)

2. **[frontend/src/locale/en.js](frontend/src/locale/en.js)**
   - Tradução `ean: 'EAN / Barcode'` adicionada

3. **[frontend/src/locale/de.js](frontend/src/locale/de.js)**
   - Tradução `ean: 'EAN / Barcode'` adicionada

### Backend:
1. **[index.js](index.js#L846-L870)**
   - Endpoint `/materials/update-ean` adicionado

2. **[src/materials-db.js](src/materials-db.js#L149-L203)**
   - Método `updateOrAddEAN()` implementado

## Casos de Uso

### Caso 1: Utilizador escaneia EAN conhecido
1. Scanner lê código `6975337031338`
2. Sistema encontra na base de dados: "Bambu PLA Matte - Charcoal"
3. Formulário preenche automaticamente:
   - EAN: `6975337031338`
   - Fabricante: `BambuLab`
   - Tipo: `PLA`
   - Nome: `Bambu PLA Matte`
   - Cor: `Charcoal` (#000000)
4. Utilizador completa tamanho e percentagem
5. Ao guardar: nada é adicionado à base de dados (já existe)

### Caso 2: Utilizador escaneia EAN desconhecido
1. Scanner lê código `9999999999999`
2. Sistema não encontra na base de dados
3. Formulário mostra:
   - EAN: `9999999999999` (com aviso amarelo)
   - Campos vazios para preencher manualmente
4. Utilizador preenche todos os dados
5. Ao guardar: **novo material é adicionado à base_dados_completa.json**

### Caso 3: Utilizador adiciona EAN a material existente
1. Material "PLA Basic - Red" existe na base mas sem EAN
2. Utilizador introduz manualmente EAN `1234567890123`
3. Preenche dados correspondentes ao material existente
4. Ao guardar: **EAN é adicionado à entrada existente**

### Caso 4: Filamento manual é colocado na impressora
1. Utilizador adiciona filamento manualmente (sem RFID)
   - Tipo: PLA, Fabricante: BambuLab, Nome: Bambu PLA, Cor: Black
2. Coloca o filamento na impressora AMS
3. HASS detecta novo RFID com mesmas características
4. Sistema **automáticamente**:
   - Remove entrada manual
   - Cria entrada com RFID
   - Mantém dados do utilizador
   - Activa tracking automático

## Testes Recomendados

### ✅ Interface:
- [ ] Diálogo abre com layout melhorado
- [ ] Campos têm ícones correctos
- [ ] Responsivo em mobile e desktop
- [ ] Divisores visuais funcionam
- [ ] Botões com cores apropriadas

### ✅ Campo EAN:
- [ ] Campo aceita input manual
- [ ] Botão de scanner aparece em mobile
- [ ] Estado de erro mostra mensagem correcta
- [ ] Hint text visível

### ✅ Scanner Integration:
- [ ] Scanner preenche campo EAN
- [ ] EAN conhecido preenche todos os campos
- [ ] EAN desconhecido mostra aviso
- [ ] Diálogo abre após scan

### ✅ Backend:
- [ ] Endpoint `/materials/update-ean` responde
- [ ] EAN existente é actualizado
- [ ] EAN novo é adicionado a material existente
- [ ] Material novo é criado com EAN
- [ ] Alterações são guardadas em `base_dados_completa.json`

### ✅ HASS Sync:
- [ ] Filamento manual é substituído por HASS
- [ ] Apenas filamentos do mesmo utilizador são afectados
- [ ] Dados do filamento são preservados

## Benefícios

1. **Melhor UX**: Interface mais moderna e intuitiva
2. **Base de Dados Auto-expandível**: EANs são automaticamente adicionados
3. **Menos Repetição**: EANs conhecidos preenchem tudo automaticamente
4. **Integração HASS**: Transição suave de manual para tracked
5. **Multiutilizador**: Sistema respeita separação de utilizadores

## Próximos Passos Sugeridos

1. Melhorar diálogo de edição de filamento com mesmo layout
2. Adicionar campo EAN no diálogo de detalhes do filamento
3. Permitir edição de EAN em filamentos existentes
4. Adicionar validação de formato EAN (13 dígitos)
5. Histórico de EANs escaneados
6. Exportar base de dados de EANs

## Conclusão

Todas as funcionalidades foram implementadas com sucesso:
- ✅ Interface visual melhorada
- ✅ Campo EAN integrado
- ✅ Sistema de gestão de EAN na base de dados
- ✅ Lógica HASS→Manual confirmada e funcional
- ✅ Traduções adicionadas

O sistema agora permite gestão completa de códigos EAN com actualização automática da base de dados `base_dados_completa.json`, mantendo a integridade e expandibilidade do sistema.
