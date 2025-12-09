import { de as language } from 'vuetify/locale';

language.loginPage = {
  title: 'Login',
  username: 'Benutzername',
  password: 'Passwort',
  login: 'Anmelden',
  error: 'Benutzername oder Passwort falsch'
};

language.defaultLayout = {
  title: 'Filament Inventar',
  logout: 'Abmelden',
  filamentFilter: 'Filament Filter',
  filamentFilterAll: 'Alle',
  settings: 'Einstellungen',
  myInventory: 'Mein Inventar',
  stockTotal: 'Gesamtbestand'
};

language.general = {
  save: 'Speichern',
  required: 'Pflichtfeld'
};

language.homeView = {
  search: 'Suche',
  form: {
    button: 'Hinzufügen',
    title: 'Filament hinzufügen',
    manufacturer: 'Hersteller',
    type: 'Typ',
    name: 'Name',
    size: 'Größe',
    remain: 'Verbleibend',
    color: 'Farbe',
    colorname: 'Farbname',
    spools: 'Spulen',
    actions: 'Aktionen'
  }
};

language.filamentDetails = {
  title: 'Filament Details',
  number: 'Nummer',
  name: 'Name',
  size: 'Größe',
  remain: 'Verbleibend',
  remaining: 'Restmenge',
  colorname: 'Farbname',
  actions: 'Aktionen',
  successDelete: 'Filament gelöscht',
  errorDelete: 'Fehler beim Löschen des Filaments',
  success: 'Filament aktualisiert',
  error: 'Fehler beim Aktualisieren des Filaments'
};

language.scanner = {
  title: 'Code Scanner',
  instructions: 'Positionieren Sie den Code im Bereich',
  startNFC: 'NFC-Lesung starten',
  stopNFC: 'Lesung stoppen',
  nfcReading: 'Bringen Sie den NFC-Tag nahe an das Gerät',
  nfcNotSupported: 'NFC wird auf diesem Gerät nicht unterstützt'
};

language.confirmEdit = {
  cancel: 'Abbrechen'
};

language.close = 'Schließen';

language.registerPage = {
  title: 'Registrieren',
  username: 'Benutzername',
  email: 'E-Mail',
  adminKey: 'Admin-Registrierungsschlüssel',
  password: 'Passwort',
  confirmPassword: 'Passwort bestätigen',
  register: 'Registrieren',
  haveAccount: 'Haben Sie bereits ein Konto?',
  loginLink: 'Hier anmelden',
  success: 'Registrierung erfolgreich!',
  error: 'Registrierung fehlgeschlagen',
  usernameExists: 'Benutzername existiert bereits',
  invalidAdminKey: 'Ungültiger Admin-Schlüssel. Wenden Sie sich an den Administrator.',
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
  trayName: 'Tray-Name',
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

language.stockTotal = {
  title: 'Gesamtbestand',
  filters: 'Filter',
  filterOwner: 'Nach Besitzer filtern',
  owner: 'Besitzer',
  inventory: 'Inventar',
  items: 'Artikel',
  weight: 'Gewicht',
  serialNumber: 'Seriennummer',
  manual: 'Manuell',
  noData: 'Keine Filamente verfügbar',
  tagUid: 'Tag-UID',
  spoolCount: 'Spulen',
  totalWeight: 'Gesamtgewicht',
  averageRemain: 'Durchschnittlich verbleibend',
  spoolDetails: 'Einzelne Spulen'
};

language.loginPage.noAccount = "Noch kein Konto?";
language.loginPage.registerLink = "Hier registrieren";

export default language;
