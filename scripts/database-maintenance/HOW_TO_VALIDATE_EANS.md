# Como Validar EANs Duplicados

## Passo 1: Abrir Terminal

Abre um terminal (CMD ou PowerShell) na pasta do projeto:

```bash
cd c:\www\Bambulab-Filament-Inventory
```

## Passo 2: Executar o Script Interativo

```bash
node scripts/database-maintenance/validate-eans-interactive.js
```

## Passo 3: Seguir as Instruções

O script irá mostrar cada EAN duplicado, um de cada vez:

### Exemplo de Tela

```
========================================
  EAN 1 of 23
========================================

EAN: 6975337032861

This EAN appears in 2 different materials:

   1. Blue [#0A2CA5]
   2. Navy Blue [#0C2340]

Options:
  • Enter 1-2 to select the correct color
  • Enter 's' to skip this EAN
  • Enter 'q' to quit

Your choice:
```

### Como Responder

1. **Verificar a embalagem física** ou website da BambuLab
2. **Digite o número** da cor correta (1 ou 2)
3. O script remove automaticamente o EAN das outras cores

### Opções

- **1-N**: Seleciona a cor correta
- **s**: Pula este EAN (não faz alterações)
- **q**: Sai do script sem salvar

## Passo 4: Confirmar Alterações

Depois de validar todos os EANs, o script mostra um resumo:

```
========================================
  Validation Complete!
========================================

✓ Total changes: 5

Summary of changes:

1. EAN 6975337032861
   Kept in: Blue (#0A2CA5)
   Removed from:
     - Navy Blue (#0C2340)

...

⚠ This will modify the database!

Apply these changes? (yes/no):
```

Digite **yes** para aplicar ou **no** para descartar.

## Segurança

- ✅ **Backup automático** antes de qualquer alteração
- ✅ Podes **rever todas as mudanças** antes de confirmar
- ✅ Podes **cancelar** a qualquer momento (q)
- ✅ Podes **pular** EANs que não tens certeza (s)

## Depois da Validação

O script cria um backup em:
```
data/base_dados_completa.json.backup-before-manual-validation-[timestamp]
```

Se algo correr mal, podes restaurar:
```bash
cp data/base_dados_completa.json.backup-before-manual-validation-[timestamp] data/base_dados_completa.json
```

## Dicas

### Como Identificar a Cor Correta

1. **Embalagem física**: Escaneia o código de barras na embalagem e verifica a cor
2. **Website BambuLab**: Procura o EAN no site oficial
3. **Nome da cor**:
   - "Blue" geralmente é azul escuro/royal
   - "Navy Blue" é azul marinho (mais escuro)
   - "Lake Blue" é azul claro/céu

### Cores Difíceis de Distinguir

Para cores muito similares (ex: "Hot Pink" vs "Pink"), se não tens certeza:
- **Opção 1**: Pula (s) e valida depois com a embalagem física
- **Opção 2**: Deixa como está e corrige quando usares o produto

### Trabalhar em Sessões

Não precisas de validar todos os 23 EANs de uma vez:
- Valida alguns
- Confirma as alterações
- Corre o script novamente mais tarde para os restantes

O script sempre mostra quantos EANs duplicados ainda existem.

## Atalhos Rápidos

Se tiveres as embalagens físicas à mão:

```bash
# 1. Lista todos os EANs duplicados rapidamente
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('./data/base_dados_completa.json')); const map = {}; data.forEach(m => { if(m.ean) m.ean.split(',').forEach(e => { map[e] = (map[e]||0)+1; }); }); Object.entries(map).filter(([_,c]) => c > 1).forEach(([ean,count]) => console.log(ean));"

# 2. Corre o script interativo
node scripts/database-maintenance/validate-eans-interactive.js
```

## Troubleshooting

### "Cannot find module"
```bash
# Instala dependências
npm install
```

### Terminal não mostra cores
As cores são opcionais - o script funciona sem elas.

### Quero desfazer tudo
```bash
# Restaura do backup
cp data/base_dados_completa.json.backup-before-manual-validation-* data/base_dados_completa.json
```

---

## Lista de EANs Duplicados (Referência Rápida)

Podes usar esta lista para verificar as embalagens antes de correr o script:

### ABS
- 6975337032861, 6975337033783, 6975337030379, 6975337039587
  - Blue (#0A2CA5) vs Navy Blue (#0C2340)

### PC
- 6975337032205, 6975337031086
  - Black (#000000) vs Clear Black (#000000)

### PETG HF
- 6975337038269, 6977252424677
  - Blue (#002E96) vs Lake Blue (#1F79E5)
- 6977252424721
  - Forest Green (#39541A) vs Green (#00AE42)
- 6977252424684
  - Green (#00AE42) vs Lime Green (#6EE53C)

### PLA Basic (múltiplas cores)
- Ver DUPLICATE_EANS_REPORT.md para lista completa
