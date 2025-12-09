# Sistema Multi-Utilizador - Guia de Implementação

## ✅ O QUE JÁ FOI IMPLEMENTADO:

### Backend Completo:
1. **`src/database.js`** - Sistema de base de dados com:
   - Gestão de utilizadores com BCrypt
   - Gestão de filamentos por utilizador
   - Gestão de configurações AMS
   - Sistema de serial numbers
   - Associação automática de spools
   - Migração automática de dados antigos

2. **`src/hass-sync.js`** - Sincronização HASS:
   - Sync individual por utilizador
   - Suporte para 4 tipos de AMS
   - Associação inteligente de serial numbers

3. **`index.js`** - API REST completa

### Frontend Completo:
1. **`frontend/src/store/app.js`** - Store atualizado
2. **`frontend/src/views/RegisterView.vue`** - Página de registo
3. **`frontend/src/views/SettingsView.vue`** - Página de configurações

## 📋 O QUE PRECISA FAZER:

### 1. Adicionar Traduções

Edite `frontend/src/locale/en.js` e adicione:

```javascript
language.registerPage = {
  title: 'Register',
  username: 'Username',
  email: 'Email',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  register: 'Register',
  haveAccount: 'Already have an account?',
  loginLink: 'Login here',
  success: 'Registration successful!',
  error: 'Registration failed',
  usernameExists: 'Username already exists',
  invalidEmail: 'Invalid email address',
  passwordLength: 'Password must be at least 6 characters',
  passwordMismatch: 'Passwords do not match'
};

language.settings = {
  title: 'Settings',
  userInfo: 'User Information',
  username: 'Username',
  email: 'Email',
  role: 'Role',
  hassSettings: 'Home Assistant Settings',
  hassUrl: 'Home Assistant URL',
  hassToken: 'Access Token',
  hassSaved: 'Settings saved successfully',
  hassError: 'Error saving settings',
  amsConfig: 'AMS Configuration',
  addAMS: 'Add AMS',
  editAMS: 'Edit AMS',
  amsName: 'AMS Name',
  amsType: 'AMS Type',
  amsSensor: 'HASS Sensor',
  noAMS: 'No AMS configured. Add one to start syncing.',
  amsAdded: 'AMS added successfully',
  amsUpdated: 'AMS updated successfully',
  amsDeleted: 'AMS deleted successfully',
  amsToggled: 'AMS status updated',
  amsError: 'Error managing AMS',
  confirmDeleteAMS: 'Are you sure you want to delete this AMS?'
};
```

Edite `frontend/src/locale/de.js` e adicione:

```javascript
language.registerPage = {
  title: 'Registrieren',
  username: 'Benutzername',
  email: 'E-Mail',
  password: 'Passwort',
  confirmPassword: 'Passwort bestätigen',
  register: 'Registrieren',
  haveAccount: 'Haben Sie bereits ein Konto?',
  loginLink: 'Hier anmelden',
  success: 'Registrierung erfolgreich!',
  error: 'Registrierung fehlgeschlagen',
  usernameExists: 'Benutzername existiert bereits',
  invalidEmail: 'Ungültige E-Mail-Adresse',
  passwordLength: 'Passwort muss mindestens 6 Zeichen lang sein',
  passwordMismatch: 'Passwörter stimmen nicht überein'
};

language.settings = {
  title: 'Einstellungen',
  userInfo: 'Benutzerinformationen',
  username: 'Benutzername',
  email: 'E-Mail',
  role: 'Rolle',
  hassSettings: 'Home Assistant Einstellungen',
  hassUrl: 'Home Assistant URL',
  hassToken: 'Zugangstoken',
  hassSaved: 'Einstellungen erfolgreich gespeichert',
  hassError: 'Fehler beim Speichern der Einstellungen',
  amsConfig: 'AMS-Konfiguration',
  addAMS: 'AMS hinzufügen',
  editAMS: 'AMS bearbeiten',
  amsName: 'AMS-Name',
  amsType: 'AMS-Typ',
  amsSensor: 'HASS-Sensor',
  noAMS: 'Keine AMS konfiguriert. Fügen Sie eine hinzu, um die Synchronisierung zu starten.',
  amsAdded: 'AMS erfolgreich hinzugefügt',
  amsUpdated: 'AMS erfolgreich aktualisiert',
  amsDeleted: 'AMS erfolgreich gelöscht',
  amsToggled: 'AMS-Status aktualisiert',
  amsError: 'Fehler bei der AMS-Verwaltung',
  confirmDeleteAMS: 'Möchten Sie diese AMS wirklich löschen?'
};
```

### 2. Atualizar Router

Edite `frontend/src/router/index.js` e adicione as rotas:

```javascript
{
  path: '/register',
  name: 'Register',
  component: () => import('@/views/RegisterView.vue'),
  meta: {
    layout: 'LoginLayout'
  }
},
{
  path: '/settings',
  name: 'Settings',
  component: () => import('@/views/SettingsView.vue'),
  meta: {
    layout: 'DefaultLayout'
  }
}
```

### 3. Adicionar Link de Registo no Login

Edite `frontend/src/views/LoginView.vue` e adicione após o botão de login:

```vue
<v-divider class="my-4"></v-divider>

<div class="text-center">
  <span class="text-body-2">{{ t('$vuetify.loginPage.noAccount') }}</span>
  <v-btn
    variant="text"
    color="primary"
    @click="$router.push({ name: 'Register' })"
    class="ml-1"
  >
    {{ t('$vuetify.loginPage.registerLink') }}
  </v-btn>
</div>
```

E adicione nas traduções:
```javascript
// en.js
language.loginPage.noAccount = "Don't have an account?";
language.loginPage.registerLink = "Register here";

// de.js
language.loginPage.noAccount = "Noch kein Konto?";
language.loginPage.registerLink = "Hier registrieren";
```

### 4. Adicionar Link de Settings no Layout

Edite `frontend/src/layouts/DefaultLayout.vue` e adicione no app-bar:

```vue
<v-btn
  icon
  @click="$router.push({ name: 'Settings' })"
  v-if="!mobile"
>
  <v-icon color="white">mdi-cog</v-icon>
</v-btn>
```

E no drawer mobile, adicione antes do logout:

```vue
<v-list-item
  @click="$router.push({ name: 'Settings' })"
  prepend-icon="mdi-cog"
  title="Settings"
></v-list-item>
```

### 5. Atualizar FilamentDetails para mostrar Serial Number

Edite `frontend/src/components/FilamentDetails.vue` e adicione uma coluna:

```vue
<!-- Nos headers da tabela -->
<th class="text-left">
  {{ t('$vuetify.filamentDetails.serialNumber') }}
</th>

<!-- No corpo da tabela -->
<td width="200">
  <v-chip
    v-if="item.serialNumber"
    size="small"
    color="success"
    variant="tonal"
  >
    <v-icon start size="x-small">mdi-barcode</v-icon>
    {{ item.serialNumber }}
  </v-chip>
  <v-chip
    v-else
    size="small"
    color="warning"
    variant="tonal"
  >
    <v-icon start size="x-small">mdi-alert</v-icon>
    {{ t('$vuetify.filamentDetails.noSerial') }}
  </v-chip>
</td>
```

Traduções:
```javascript
// en.js
language.filamentDetails.serialNumber = 'Serial Number';
language.filamentDetails.noSerial = 'Not assigned';

// de.js
language.filamentDetails.serialNumber = 'Seriennummer';
language.filamentDetails.noSerial = 'Nicht zugewiesen';
```

### 6. Adicionar Vista Admin (Opcional)

No DefaultLayout.vue, adicione um toggle para admin:

```vue
<v-switch
  v-if="store.isAdmin"
  v-model="viewAll"
  :label="t('$vuetify.defaultLayout.viewAllUsers')"
  color="white"
  hide-details
  @update:modelValue="store.setViewAll($event)"
></v-switch>
```

### 7. Instalar Dependência BCrypt

```bash
npm install bcrypt
```

### 8. Testar o Sistema

1. Inicie o servidor:
```bash
npm install
node .
```

2. Build do frontend:
```bash
cd frontend
npm install
npm run build
```

3. Acesse http://localhost:3000
4. Crie uma nova conta
5. Configure HASS URL e Token
6. Adicione unidades AMS
7. Teste a sincronização

## 🎯 FUNCIONALIDADES IMPLEMENTADAS:

### Sistema Multi-User:
- ✅ Registo de utilizadores
- ✅ Login com base de dados
- ✅ Filamentos separados por utilizador
- ✅ Configuração HASS individual
- ✅ Gestão de AMS por utilizador

### Serial Numbers:
- ✅ Campo serialNumber em cada spool
- ✅ Associação automática quando spool manual é colocado na AMS
- ✅ Busca por serial number no scanner
- ✅ Exibição de serial number na interface

### Tipos de AMS:
- ✅ AMS (4 trays)
- ✅ AMS 2 Pro (4 trays)
- ✅ AMS HT (1 tray)
- ✅ AMS Lite (4 trays)

### Admin Features:
- ✅ Pode ver filamentos de todos os utilizadores
- ✅ Pode apagar qualquer filamento

## 📊 ESTRUTURA DA BASE DE DADOS:

```json
{
  "users": {
    "user-xxx": {
      "id": "user-xxx",
      "username": "john",
      "password": "hashed",
      "email": "john@example.com",
      "role": "user|admin",
      "hassUrl": "https://ha.local",
      "hassToken": "token"
    }
  },
  "filaments": {
    "tag_uid": {
      "userId": "user-xxx",
      "serialNumber": "ABC123" or null,
      "tracking": true|false,
      ...
    }
  },
  "amsConfigs": {
    "user-xxx": [
      {
        "id": "ams-xxx",
        "name": "AMS Principal",
        "type": "ams2pro",
        "sensor": "sensor.x1c_xxx_ams_1",
        "enabled": true
      }
    ]
  }
}
```

## 🔄 MIGRAÇÃO AUTOMÁTICA:

Quando executar pela primeira vez com dados antigos:
1. Cria utilizador admin com credenciais do .env
2. Move todos os filamentos para o admin
3. Cria configurações AMS baseadas no HASS_SENSORS do .env
4. Backup automático em `./data/hass-data.json.bak`

## 🚀 PRÓXIMOS PASSOS SUGERIDOS:

1. Adicionar alteração de password
2. Adicionar recuperação de password por email
3. Adicionar photos aos spools
4. Adicionar estatísticas de uso por utilizador
5. Adicionar partilha de filamentos entre utilizadores
6. Adicionar notificações quando filamento está a acabar
7. Adicionar export/import de inventário

## 📝 NOTAS IMPORTANTES:

- Todos os filamentos criados manualmente têm `serialNumber: null`
- Quando um filamento manual é colocado na AMS, o sistema:
  1. Procura filamento sem serial number que combine (tipo, fabricante, nome, cor)
  2. Apaga o manual e cria novo com o serial number da RFID
  3. Mantém todas as informações (colorname, etc)
- Serial numbers são únicos e correspondem ao tag_uid da RFID
- Admin pode ver tudo com toggle "View All Users"
