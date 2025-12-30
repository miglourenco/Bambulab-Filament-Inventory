# Database Migrations - Variation Field

## Overview

Este sistema inclui migrações automáticas que são executadas sempre que o serviço inicia, garantindo que os dados existentes sejam atualizados com o novo campo `variation`.

## O que é Migrado

### 1. Base de Dados de Materiais (`data/base_dados_completa.json`)
- Adiciona campo `variation` a todos os materiais BambuLab
- Extrai a variation do campo `name` (ex: "Bambu PLA Matte" → variation: "Matte")
- Variações identificadas: Basic, Matte, Silk+, HF, Translucent, FR, Wood, Metal, Marble, 95A HF

### 2. Base de Dados de Utilizadores (`data/database.json`)
- Adiciona campo `variation` a todos os filamentos existentes
- Extrai a variation do campo `name` de cada filamento
- Mantém compatibilidade com filamentos não-BambuLab

## Como Funciona

### Execução Automática
Quando inicia o serviço Docker:
```bash
docker-compose up -d
```

O script de migração executa automaticamente **antes** do servidor iniciar:
1. Verifica se os campos `variation` já existem
2. Se não existirem, extrai e adiciona
3. Se já existirem, não faz nada (operação idempotente)

### Execução Manual
Pode executar as migrações manualmente a qualquer momento:

```bash
# Executar apenas as migrações
npm run migrate

# Ou executar migrações + iniciar servidor
npm start
```

## Segurança dos Dados

### Idempotência
O script pode ser executado múltiplas vezes sem causar problemas:
- Verifica se o campo já existe antes de atualizar
- Não sobrescreve dados existentes
- Seguro para executar em produção

### Backups Automáticos
Os scripts individuais criaram backups:
- `data/base_dados_completa.backup.json`
- `data/database.backup.json`

## Scripts Disponíveis

### 1. `scripts/init-migrations.cjs`
Script principal executado no início do serviço Docker.
- **Quando**: Automaticamente no `npm start`
- **O que faz**: Executa todas as migrações necessárias
- **Seguro**: Pode ser executado múltiplas vezes

### 2. `extract-variations.cjs`
Script standalone para extrair variações da base de materiais.
- **Quando**: Executar manualmente se necessário
- **O que faz**: Atualiza `base_dados_completa.json` com campo variation
- **Backup**: Cria `base_dados_completa.backup.json`

```bash
node extract-variations.cjs
```

### 3. `migrate-user-filaments-variations.cjs`
Script standalone para migrar filamentos de utilizadores.
- **Quando**: Executar manualmente se necessário
- **O que faz**: Atualiza `database.json` com campo variation nos filamentos
- **Backup**: Cria `database.backup.json`

```bash
node migrate-user-filaments-variations.cjs
```

## Estrutura dos Dados

### Antes da Migração
```json
{
  "manufacturer": "BambuLab",
  "material": "PLA",
  "name": "Bambu PLA Matte",
  "colorname": "Black",
  "color": "#000000"
}
```

### Depois da Migração
```json
{
  "manufacturer": "BambuLab",
  "material": "PLA",
  "variation": "Matte",
  "name": "Bambu PLA Matte",
  "colorname": "Black",
  "color": "#000000"
}
```

## Verificação

Para verificar se as migrações foram executadas com sucesso:

1. Verifique os logs do container:
```bash
docker-compose logs -f
```

2. Procure por estas mensagens:
```
============================================================
Starting Database Migrations...
============================================================

[MIGRATION 1] Materials Database - Adding variation field
------------------------------------------------------------
✅ Materials database migration complete
   - Total materials: 185
   - Updated: XXX
   - Already had variation: XXX

[MIGRATION 2] User Filaments - Adding variation field
------------------------------------------------------------
✅ User filaments migration complete
   - Total filaments: XXX
   - Updated: XXX
   - Already had variation: XXX

============================================================
✨ All migrations completed successfully!
============================================================
```

## Rollback

Se necessário fazer rollback:

1. Parar o container:
```bash
docker-compose down
```

2. Restaurar os backups:
```bash
cp data/base_dados_completa.backup.json data/base_dados_completa.json
cp data/database.backup.json data/database.json
```

3. Reiniciar o container:
```bash
docker-compose up -d
```

## Notas Importantes

- ✅ **Seguro em produção**: O script não altera dados existentes
- ✅ **Automático**: Executa a cada restart do container
- ✅ **Idempotente**: Pode executar múltiplas vezes sem problemas
- ✅ **Compatível**: Mantém compatibilidade com dados antigos
- ⚠️ **Volumes**: Certifique-se que o volume `./data` está montado corretamente no docker-compose.yml
