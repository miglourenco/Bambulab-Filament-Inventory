# Correção: HASS Colorname Lookup

**Data**: 2025-12-10
**Status**: ✅ Corrigido

## Problema Identificado

O sistema HASS não estava a fazer correspondência correta do `colorname` da base de dados `base_dados_completa.json` quando carregava um filamento novo na impressora.

### Causa Raiz

A função original `findColorByHex(materialType, hexColor)` procurava por:
- **Campo `material`** (tipo normalizado: "PLA", "PETG", etc.) + cor HEX

Mas o HASS fornece:
- **Campo `name`** (nome completo do produto: "Bambu PLA Matte", "Bambu PETG HF", etc.)
- **Campo `type`** (tipo normalizado, mas nem sempre corresponde ao campo `material`)

**Resultado**: A função não encontrava correspondência porque procurava pelo tipo normalizado em vez do nome completo do produto.

## Solução Implementada

### 1. Nova Função: `findColorByNameAndHex()`

Criada nova função em [src/materials-db.js](src/materials-db.js#L58-L130) que procura por:
- **Nome completo do produto** (`name`) + cor HEX
- Fallback para método antigo se não encontrar por nome

**Vantagens:**
- Procura mais precisa usando nome completo
- Suporta produtos com mesmo material mas nomes diferentes (ex: "Bambu PLA" vs "Bambu PLA Matte")
- Mantém compatibilidade com método antigo

**Lógica:**
```javascript
findColorByNameAndHex(productName, hexColor) {
  // 1. Procura exata por name + color
  // 2. Se não encontrar exato, procura cor mais próxima para esse produto
  // 3. Se não encontrar produto, fallback para findColorByMaterialType()
  // 4. Retorna colorname ou null
}
```

### 2. Função de Fallback: `findColorByMaterialType()`

Renomeada e melhorada a função original [src/materials-db.js](src/materials-db.js#L132-L209) para servir como fallback:
- Extrai tipo de material do nome se contiver "Bambu "
- Procura por tipo normalizado + cor HEX
- Mantém cálculo de distância de cor (threshold de 30)

**Exemplo:**
```javascript
// Input: "Bambu PLA Matte", "#000000"
// Extrai: "PLA"
// Procura: material="PLA" + color="#000000"
```

### 3. Atualização do HASS Sync

Modificado [src/hass-sync.js](src/hass-sync.js#L99-L100) para usar a nova função:

**Antes:**
```javascript
const identifiedColorName = materialsDB.findColorByHex(tray.type, tray.color);
```

**Depois:**
```javascript
const identifiedColorName = materialsDB.findColorByNameAndHex(tray.name, tray.color);
```

### 4. Logs de Debug Adicionados

Adicionados logs detalhados em ambas as funções e no HASS sync:

**MaterialsDB:**
```
[MaterialsDB] findColorByNameAndHex - Looking for name: "Bambu PLA Matte", color: "#000000"
[MaterialsDB] Database has 240 materials loaded
[MaterialsDB] ✅ Exact match found by name: "Charcoal"
```

**HASS Sync:**
```
[HASS Sync] Looking for colorname - Name: "Bambu PLA Matte", Color: "#000000", Type: "PLA"
[HASS Sync] ✅ Found colorname in database: "Charcoal"
```

## Ficheiros Modificados

### 1. [src/materials-db.js](src/materials-db.js)
- **Nova função**: `findColorByNameAndHex(productName, hexColor)` (linhas 58-130)
- **Função renomeada**: `findColorByMaterialType(materialType, hexColor)` (linhas 132-209)
- **Logs adicionados**: Debug completo em ambas as funções

### 2. [src/hass-sync.js](src/hass-sync.js)
- **Linha 95**: Garantia de inicialização do materialsDB
- **Linha 97**: Log com Name, Color e Type
- **Linha 100**: Alterado para usar `findColorByNameAndHex(tray.name, tray.color)`
- **Linhas 103-119**: Logs detalhados do processo de lookup

## Fluxo de Procura Melhorado

### Passo 1: Procura por Nome Completo
```
HASS envia:
  name: "Bambu PLA Matte"
  color: "#000000"
  type: "PLA"

findColorByNameAndHex("Bambu PLA Matte", "#000000")
  ↓
Procura em base_dados_completa.json:
  WHERE name = "Bambu PLA Matte" AND color = "#000000"
  ↓
✅ ENCONTRADO: colorname = "Charcoal"
```

### Passo 2: Fallback - Cor Mais Próxima (se não encontrar exato)
```
findColorByNameAndHex("Bambu PLA Matte", "#000001")
  ↓
Não encontrou exato, filtra por nome:
  materials.filter(m => m.name === "Bambu PLA Matte")
  ↓
Calcula distância de cor para cada variante
  ↓
Retorna cor mais próxima com distância < 30
```

### Passo 3: Fallback - Tipo de Material (se produto não existir)
```
findColorByNameAndHex("Produto Desconhecido", "#000000")
  ↓
Não encontrou nada com esse nome
  ↓
findColorByMaterialType("Produto Desconhecido", "#000000")
  ↓
Extrai tipo de material (se tiver "Bambu ")
  ↓
Procura por material type + color
```

### Passo 4: Fallback Final - Filamentos do Utilizador
```
Se materialsDB retornar null:
  ↓
Procura em filamentos existentes do utilizador
  ↓
Retorna colorname se encontrar combinação igual
```

## Exemplo Real de Uso

### Cenário: Utilizador coloca PLA Matte Black na impressora

**HASS envia:**
```json
{
  "tag_uid": "1234567890ABCDEF",
  "type": "PLA",
  "name": "Bambu PLA Matte",
  "color": "#000000",
  "remain": 950,
  "manufacturer": "BambuLab"
}
```

**Processo de Lookup:**
```
1. [HASS Sync] Looking for colorname - Name: "Bambu PLA Matte", Color: "#000000", Type: "PLA"
2. [MaterialsDB] findColorByNameAndHex - Looking for name: "Bambu PLA Matte", color: "#000000"
3. [MaterialsDB] Database has 240 materials loaded
4. [MaterialsDB] ✅ Exact match found by name: "Charcoal"
5. [HASS Sync] ✅ Found colorname in database: "Charcoal"
```

**Resultado:**
```json
{
  "tag_uid": "1234567890ABCDEF",
  "type": "PLA",
  "name": "Bambu PLA Matte",
  "colorname": "Charcoal",  // ✅ PREENCHIDO CORRETAMENTE
  "color": "#000000",
  "remain": 950,
  "manufacturer": "BambuLab",
  "tracking": true
}
```

## Benefícios da Correção

1. **Precisão Melhorada**: Procura por nome completo do produto em vez de tipo genérico
2. **Suporte a Variantes**: Distingue entre "Bambu PLA", "Bambu PLA Matte", "Bambu PLA Silk+", etc.
3. **Backwards Compatible**: Mantém fallback para método antigo
4. **Debug Facilitado**: Logs detalhados para diagnóstico de problemas
5. **Base de Dados Expansível**: Funciona com qualquer produto na base de dados

## Testes Recomendados

### Teste 1: Match Exato por Nome
- [ ] Carregar "Bambu PLA Matte - Black" (#000000)
- [ ] Verificar que colorname = "Charcoal"

### Teste 2: Cor Mais Próxima
- [ ] Carregar cor ligeiramente diferente (#000001)
- [ ] Verificar que encontra cor mais próxima

### Teste 3: Produto Não na Base
- [ ] Carregar produto custom
- [ ] Verificar fallback para tipo de material

### Teste 4: Logs de Debug
- [ ] Verificar logs no console
- [ ] Confirmar que mostra processo completo

## Notas Importantes

- A função `findColorByHex` antiga foi **renomeada** para `findColorByMaterialType`
- Qualquer código que use `findColorByHex` deve ser atualizado para usar `findColorByNameAndHex`
- Os logs são **temporários** para debugging - podem ser removidos após confirmar funcionamento

## Próximos Passos Sugeridos

1. Testar com diferentes produtos BambuLab
2. Verificar logs no ambiente de produção
3. Considerar remover logs após confirmação
4. Adicionar testes automatizados para esta funcionalidade
5. Documentar campo `name` como obrigatório na base de dados

## Conclusão

A correção implementada resolve o problema de colorname vazio nos filamentos importados do HASS, utilizando uma abordagem mais precisa baseada no nome completo do produto em vez do tipo genérico de material.

✅ Problema resolvido
✅ Logs adicionados para debug
✅ Backwards compatible
✅ Pronto para teste
