# Major Improvements - Database Aggregation & Material Management

## Data: 2024-12-10

### Resumo
Implementadas melhorias significativas na gestão da base de dados de materiais, incluindo agregação de produtos duplicados, remoção do campo `productType`, e implementação completa de edição de materiais com salvamento automático na base de dados.

---

## 1. Agregação de Produtos e Remoção de `productType`

### Problema
A base de dados tinha produtos duplicados por causa da diferença entre `Spool` e `Refill` (mesmo material, mesma cor, mas diferentes `productType`). Isso causava:
- Listagens duplicadas no dropdown de colornames
- Dificuldade em gerenciar EANs
- Base de dados maior que o necessário

### Solução

#### 1.1 Script de Agregação
**Arquivo:** `scripts/database-maintenance/aggregate-products.js`

O script:
- Agrupa materiais por: `manufacturer + material + name + colorname + color`
- Combina múltiplos EANs em uma única string separada por vírgulas
- Remove o campo `productType` completamente
- Reduz duplicatas

**Resultado:**
```
- Antes: 240 materiais
- Depois: 185 materiais
- Removidos: 55 duplicatas
```

**Exemplo de agregação:**
```json
// Antes (2 entradas):
{
  "manufacturer": "BambuLab",
  "material": "ABS",
  "name": "Bambu ABS",
  "colorname": "Black",
  "color": "#000000",
  "productType": "Spool",
  "ean": "6975337032878"
}
{
  "manufacturer": "BambuLab",
  "material": "ABS",
  "name": "Bambu ABS",
  "colorname": "Black",
  "color": "#000000",
  "productType": "Refill",
  "ean": "6975337030331"
}

// Depois (1 entrada):
{
  "manufacturer": "BambuLab",
  "material": "ABS",
  "name": "Bambu ABS",
  "colorname": "Black",
  "color": "#000000",
  "ean": "6975337032878,6975337030331"
}
```

#### 1.2 Atualização de Funções
**Arquivo:** `src/materials-db.js`

Removidas todas as referências a `productType`:
- Linha 230: `addMaterial()` - removido `productType: "Spool"`
- Linha 293: `updateOrAddEAN()` - removido `productType: "Spool"`

---

## 2. Filtro de Colornames Duplicados

### Problema
A função `getColorsForMaterial()` retornava múltiplas entradas para a mesma `colorname`, causando duplicatas no dropdown.

### Solução
**Arquivo:** `src/materials-db.js` - Linhas 46-69

```javascript
getColorsForMaterial(materialType) {
  const colors = this.materials
    .filter(m => m.material === materialType)
    .map(m => ({
      colorname: m.colorname,
      color: m.color,
      distance: m.distance,
      note: m.note
    }));

  // Filter duplicates: keep only unique colornames
  const uniqueColors = [];
  const seenColorNames = new Set();

  for (const color of colors) {
    if (!seenColorNames.has(color.colorname)) {
      seenColorNames.add(color.colorname);
      uniqueColors.push(color);
    }
  }

  return uniqueColors;
}
```

**Resultado:** Cada colorname aparece apenas uma vez no dropdown, mesmo que existam múltiplos EANs.

---

## 3. Normalização Inteligente de Tipo de Material

### Problema
EANs retornavam tipos como "PLA Basic", "PLA Matte", mas a base de dados só tem "PLA". Isso causava falhas na procura de colornames.

**Exemplo de erro:**
```
[Product Search] Returning result from UPCItemDB: {
  "type": "PLA Basic",
  "name": "Bambu PLA Basic"
}
// ❌ Não encontra na base de dados que só tem "PLA"
```

### Solução
**Arquivo:** `index.js` - Linhas 524-577

Nova função `normalizeMaterialType(detectedType)` que:

1. **Tenta match exato** na base de dados
2. **Tenta match parcial** (e.g., "PLA Basic" contém "PLA")
3. **Extrai tipo base** se necessário ("PLA Basic" → "PLA")
4. **Verifica se o tipo base existe** na base de dados

```javascript
function normalizeMaterialType(detectedType) {
  // Exact match
  const exactMatch = eanDatabase.find(item =>
    item.material && item.material.toLowerCase() === detectedType.toLowerCase()
  );
  if (exactMatch) return exactMatch.material;

  // Partial match (e.g., "PLA Basic" -> "PLA")
  const partialMatch = eanDatabase.find(item => {
    const itemMaterial = item.material.toLowerCase();
    const detectedLower = detectedType.toLowerCase();
    return detectedLower.includes(itemMaterial) || itemMaterial.includes(detectedLower);
  });
  if (partialMatch) return partialMatch.material;

  // Extract base material
  const baseMaterials = ['PLA', 'PETG', 'ABS', 'TPU', ...];
  for (const baseMat of baseMaterials) {
    if (detectedType.toUpperCase().includes(baseMat)) {
      const baseMatch = eanDatabase.find(item =>
        item.material && item.material.toLowerCase() === baseMat.toLowerCase()
      );
      if (baseMatch) return baseMat;
    }
  }

  return detectedType; // Fallback
}
```

**Integrada em:**
- `parseAPIProductTitle()` para resultados de APIs
- Aplica-se tanto para produtos BambuLab quanto genéricos

**Resultado:**
```
[Type Normalization] Input type: "PLA Basic"
[Type Normalization] ✅ Partial match found: "PLA" (from "PLA Basic")
// ✅ Agora encontra colornames corretamente
```

---

## 4. Edição de Cor no FilamentDetails

### Problema
Não era possível editar a cor (HEX) dos filamentos, e as edições não eram salvas na base de dados.

### Solução

#### 4.1 Campo de Edição de Cor
**Arquivo:** `frontend/src/components/FilamentDetails.vue` - Linhas 24-93

Adicionada nova coluna com:
- Campo de texto para editar cor em HEX
- Preview visual da cor ao lado do campo
- Atualização automática com debounce

```vue
<td width="180">
  <v-text-field
    v-model="item.color"
    :label="t('$vuetify.filamentDetails.color') || 'Cor (HEX)'"
    variant="outlined"
    density="compact"
    @update:modelValue="debouncedUpdate(item)"
  >
    <template v-slot:prepend-inner>
      <div
        :style="{
          width: '24px',
          height: '24px',
          backgroundColor: item.color || '#FFFFFF',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }"
      ></div>
    </template>
  </v-text-field>
</td>
```

#### 4.2 Salvamento Automático na Base de Dados
**Arquivo:** `frontend/src/components/FilamentDetails.vue` - Linhas 232-256

```javascript
const update = async (filament) => {
  const result = await store.updateFilament(filament);

  if (result) {
    // Se for BambuLab, também atualizar/criar na base de dados de materiais
    if (filament.manufacturer && filament.manufacturer.toLowerCase().includes('bambu')) {
      try {
        await axios.post('/materials/update-from-filament', {
          manufacturer: filament.manufacturer,
          type: filament.type,
          name: filament.name,
          colorname: filament.colorname,
          color: filament.color
        });
        console.log('Material updated/created in database');
      } catch (error) {
        console.error('Error updating material in database:', error);
      }
    }

    toast.success(t('$vuetify.filamentDetails.success'));
  }
};
```

---

## 5. Sistema de Update/Create de Materiais

### Nova Função no MaterialsDB
**Arquivo:** `src/materials-db.js` - Linhas 258-310

```javascript
async updateOrCreateMaterial(filamentData) {
  const { manufacturer, type, name, colorname, color } = filamentData;

  // Check if material already exists
  const existing = this.materials.find(
    m => m.manufacturer === manufacturer &&
         m.material === type &&
         m.name === name &&
         m.colorname === colorname &&
         m.color.toUpperCase() === color.toUpperCase()
  );

  if (existing) {
    return { action: 'exists', material: existing };
  }

  // Check if we need to update color
  const toUpdate = this.materials.find(
    m => m.manufacturer === manufacturer &&
         m.material === type &&
         m.name === name &&
         m.colorname === colorname
  );

  if (toUpdate) {
    toUpdate.color = color.toUpperCase();
    await this.save();
    return { action: 'updated', material: toUpdate };
  }

  // Create new material
  const newMaterial = {
    manufacturer,
    material: type,
    name,
    colorname,
    color: color.toUpperCase(),
    distance: 98.4,
    note: "Custom",
    ean: ""
  };

  this.materials.push(newMaterial);
  await this.save();
  return { action: 'created', material: newMaterial };
}
```

### Novo Endpoint
**Arquivo:** `index.js` - Linhas 933-957

```javascript
app.post('/materials/update-from-filament', async (req, res) => {
  try {
    const { manufacturer, type, name, colorname, color } = req.body;

    if (!manufacturer || !type || !name || !colorname || !color) {
      return res.status(400).json({
        error: 'Manufacturer, type, name, colorname, and color are required'
      });
    }

    const result = await materialsDB.updateOrCreateMaterial({
      manufacturer, type, name, colorname, color
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Update material from filament error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 6. Atualização da Lógica de Adicionar Filamento

### Problema
Ao adicionar um novo filamento BambuLab sem EAN, apenas salvava `material + colorname + color`, sem `manufacturer` e `name`.

### Solução
**Arquivo:** `frontend/src/views/HomeView.vue` - Linhas 515-533

```javascript
} else if (isBambuLab.value) {
  // If BambuLab but no EAN, save complete material info
  try {
    let hexColor = addModel.value.color;
    if (hexColor.length === 9) {
      hexColor = hexColor.substring(0, 7);
    }

    await axios.post('/materials/update-from-filament', {
      manufacturer: addModel.value.manufacturer,
      type: addModel.value.type,
      name: addModel.value.name,
      colorname: addModel.value.colorname,
      color: hexColor
    });
  } catch (error) {
    console.error('Error saving material to database:', error);
  }
}
```

**Resultado:** Todos os campos são salvos corretamente, permitindo lookups futuros mais precisos.

---

## 7. Melhorias no Sistema de EAN

### Atualização da função `updateOrAddEAN()`
**Arquivo:** `src/materials-db.js` - Linhas 312-372

Melhorias:
1. **Suporte para múltiplos EANs:** Verifica se EAN já existe em lista separada por vírgulas
2. **Append de EAN:** Se material existe com outro EAN, adiciona o novo à lista
3. **Evita duplicatas:** Só adiciona EAN se não estiver na lista

```javascript
// Check if EAN already exists in database
const existingByEAN = this.materials.find(m =>
  m.ean && m.ean.split(',').includes(ean)
);

// ...

if (existingByMaterial) {
  // Found matching material, add or append EAN to it
  if (existingByMaterial.ean && existingByMaterial.ean !== '') {
    const eans = existingByMaterial.ean.split(',');
    if (!eans.includes(ean)) {
      existingByMaterial.ean = [...eans, ean].join(',');
    }
  } else {
    existingByMaterial.ean = ean;
  }
  await this.save();
  return { action: 'ean_added', ean };
}
```

---

## Arquivos Modificados

### Backend
1. `src/materials-db.js` - Sistema de gestão de materiais
2. `index.js` - Novos endpoints e normalização de tipo
3. `scripts/database-maintenance/aggregate-products.js` - Script de agregação

### Frontend
1. `frontend/src/components/FilamentDetails.vue` - Edição de cor e salvamento
2. `frontend/src/views/HomeView.vue` - Salvamento completo ao adicionar

### Database
1. `data/base_dados_completa.json` - Agregada de 240 para 185 materiais
2. Backup criado: `base_dados_completa.json.backup-before-aggregation-*`

---

## Benefícios

1. **Base de dados mais limpa:** -23% de entradas (240 → 185)
2. **Dropdowns sem duplicatas:** Cada cor aparece apenas uma vez
3. **EAN lookup melhorado:** Normalização automática de tipos
4. **Gestão completa de materiais:** Edição de cor com salvamento automático
5. **Consistência de dados:** Todos os campos salvos corretamente
6. **Múltiplos EANs suportados:** Um material pode ter vários códigos de barras

---

## Como Executar o Script de Agregação

```bash
node scripts/database-maintenance/aggregate-products.js
```

**⚠️ Atenção:** O script cria um backup automático antes de fazer alterações.

---

## Testes Recomendados

1. ✅ Verificar dropdown de colornames (sem duplicatas)
2. ✅ Testar EAN lookup com "PLA Basic" → deve normalizar para "PLA"
3. ✅ Editar cor de um filamento → deve salvar na base de dados
4. ✅ Adicionar novo filamento BambuLab → deve salvar todos os campos
5. ✅ Verificar que múltiplos EANs são separados por vírgula

---

## Próximos Passos (Opcional)

1. Adicionar validação de cor HEX no frontend
2. Implementar color picker visual para edição de cor
3. Adicionar histórico de alterações de materiais
4. Implementar sincronização automática de EANs de APIs externas
