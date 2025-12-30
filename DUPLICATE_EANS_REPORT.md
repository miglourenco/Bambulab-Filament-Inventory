# Relatório de EANs Duplicados

**Data:** 2024-12-10
**Total de EANs duplicados:** 23
**Materiais afetados:** 50+

## Resumo

Foram encontrados 23 EANs que aparecem em múltiplos materiais diferentes (cores diferentes). Isto indica erros na base de dados original.

---

## 1. ABS - Blue vs Navy Blue

**Problema:** 4 EANs duplicados entre duas cores diferentes

| EAN | Blue (#0A2CA5) | Navy Blue (#0C2340) |
|-----|----------------|---------------------|
| 6975337032861 | ✓ | ✓ |
| 6975337033783 | ✓ | ✓ |
| 6975337030379 | ✓ | ✓ |
| 6975337039587 | ✓ | ✓ |

**Recomendação:** Verificar na embalagem física ou website da BambuLab qual é a cor correta para cada EAN.

---

## 2. PC - Black vs Clear Black

**Problema:** 2 EANs duplicados entre duas variantes da mesma cor

| EAN | Black (#000000) | Clear Black (#000000) |
|-----|-----------------|----------------------|
| 6975337032205 | ✓ | ✓ |
| 6975337031086 | ✓ | ✓ |

**Nota:** Ambos têm o mesmo código de cor HEX (#000000), mas colornames diferentes. "Clear Black" sugere material translúcido.

**Recomendação:** Manter separados se forem produtos distintos (opaco vs translúcido).

---

## 3. PETG HF - Múltiplos Blues e Greens

### Blue vs Lake Blue

| EAN | Blue (#002E96) | Lake Blue (#1F79E5) |
|-----|----------------|---------------------|
| 6975337038269 | ✓ | ✓ |
| 6977252424677 | ✓ | ✓ |

### Forest Green vs Green

| EAN | Forest Green (#39541A) | Green (#00AE42) |
|-----|------------------------|-----------------|
| 6977252424721 | ✓ | ✓ |

### Green vs Lime Green

| EAN | Green (#00AE42) | Lime Green (#6EE53C) |
|-----|-----------------|----------------------|
| 6977252424684 | ✓ | ✓ |

**Recomendação:** Cores HEX são claramente diferentes, verificar embalagens.

---

## 4. PLA Basic - Múltiplas Cores Similares

### Blues (3 cores afetadas)

| EAN | Blue (#0A2989) | Blue Gray (#5B6579) | Cobalt Blue (#0056B8) |
|-----|----------------|---------------------|-----------------------|
| 6975337031406 | ✓ | ✓ | ✓ |
| 6975337032038 | ✓ | ✓ | ✓ |
| 6975337030232 | ✓ | ✓ | - |

**Nota:** 6975337030232 também aparece em Gray (#8E9089)

### Browns

| EAN | Brown (#9D432C) | Cocoa Brown (#6F5034) |
|-----|-----------------|----------------------|
| 6975337032373 | ✓ | ✓ |

### Pinks

| EAN | Hot Pink (#F5547C) | Pink (#F55A74) |
|-----|-------------------|----------------|
| 6975337032359 | ✓ | ✓ |

### Purples

| EAN | Indigo Purple (#482960) | Purple (#5E43B7) |
|-----|------------------------|------------------|
| 6975337031932 | ✓ | ✓ |
| 6975337037378 | ✓ | ✓ |

### Reds

| EAN | Maroon Red (#9D2235) | Red (#C12E1F) |
|-----|---------------------|---------------|
| 6975337031413 | ✓ | ✓ |
| 6975337030270 | ✓ | ✓ |

### Oranges

| EAN | Orange (#FF6A13) | Pumpkin Orange (#FF9016) |
|-----|------------------|--------------------------|
| 6975337032311 | ✓ | ✓ |
| 6975337030898 | ✓ | ✓ |

### Yellows

| EAN | Sunflower Yellow (#FEC600) | Yellow (#F4EE2A) |
|-----|---------------------------|------------------|
| 6975337031956 | ✓ | ✓ |
| 6975337030225 | ✓ | ✓ |

---

## Análise

### Padrão Identificado

A maioria dos EANs duplicados segue um padrão:
- **Cores similares mas distintas** (ex: Blue vs Navy Blue, Orange vs Pumpkin Orange)
- **Códigos HEX diferentes** confirmam que são cores fisicamente diferentes
- **Mesmo material e fabricante** (BambuLab)

### Causa Provável

1. **Erro de importação de dados**: Os EANs podem ter sido copiados incorretamente durante a criação da base de dados
2. **Mudança de nomenclatura**: BambuLab pode ter renomeado cores e os EANs não foram atualizados
3. **Produtos descontinuados**: Algumas cores podem ter sido substituídas mas EANs mantidos

---

## Recomendações

### Curto Prazo

1. **Manter dados como estão** até confirmação
2. **Durante EAN scan**: Sistema irá encontrar múltiplas correspondências
3. **Usuário escolhe manualmente** qual é a cor correta

### Longo Prazo

1. **Verificar cada EAN** no website oficial da BambuLab
2. **Escanear embalagens físicas** quando disponíveis
3. **Criar tabela de mapeamento** EAN → Cor confirmada
4. **Implementar sistema de votação**: Usuários confirmam qual EAN corresponde a qual cor

### Script de Validação Manual

Criar interface onde usuários podem:
1. Escanear EAN
2. Ver todas as cores associadas
3. Selecionar a cor correta
4. Submeter confirmação
5. Sistema aprende com múltiplas confirmações

---

## Estatísticas

- **Total de materiais na base de dados:** 185
- **Materiais com EAN único:** ~135
- **Materiais com EAN compartilhado:** ~50
- **Taxa de duplicação:** ~27%

---

## Próximos Passos

1. ✅ Identificar todos os EANs duplicados (FEITO)
2. ⏳ Validar com API (FALHOU - rate limit)
3. ⏳ Validação manual pendente
4. ⏳ Criar sistema de correção interativo
5. ⏳ Implementar votação da comunidade

---

## Notas Técnicas

### Como os dados foram agregados

O script `aggregate-products.js` agregou apenas produtos **exatamente iguais**:
- Mesmo manufacturer
- Mesmo material
- Mesmo name
- Mesmo colorname
- Mesmo color HEX

Portanto, os EANs duplicados **NÃO foram criados pela agregação**. Já existiam na base de dados original.

### Backup

Um backup foi criado antes da análise:
```
data/base_dados_completa.json.backup-before-ean-fix-1765383408977
```

---

## Solução Temporária

Enquanto os EANs não são corrigidos, o sistema continuará a funcionar:

1. **Durante scan de EAN duplicado**:
   - Sistema mostra todas as cores possíveis
   - Usuário escolhe manualmente
   - Material é adicionado com a cor escolhida

2. **Na adição manual**:
   - Usuário pode inserir EAN correto
   - Sistema salva na base de dados
   - Próximo scan do mesmo EAN terá mais opções

3. **Na edição**:
   - Usuário pode corrigir cor e EAN
   - Mudanças são salvas na base de dados

Isto permite que a base de dados seja **auto-corrigida gradualmente** com uso real.
