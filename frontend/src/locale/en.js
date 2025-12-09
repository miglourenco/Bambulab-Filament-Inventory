import { en as language } from 'vuetify/locale';

language.general = {
  save: 'Save',
  required: 'Required'
};

language.loginPage = {
  title: 'Login',
  username: 'Username',
  password: 'Password',
  login: 'Login',
  error: 'Username or password wrong'
};

language.defaultLayout = {
  title: 'Filament Inventory',
  logout: 'Logout',
  filamentFilter: 'Filament Filter',
  filamentFilterAll: 'All',
  settings: 'Settings',
  myInventory: 'My Inventory',
  stockTotal: 'Stock Total'
};

language.homeView = {
  search: 'Search',
  form: {
    button: 'Add',
    title: 'Add Filament',
    manufacturer: 'Manufacturer',
    type: 'Type',
    name: 'Name',
    size: 'Size',
    remain: 'Remaining',
    color: 'Color',
    colorname: 'Colorname',
    spools: 'Spools',
    actions: 'Actions'
  }
};

language.filamentDetails = {
  title: 'Filament Details',
  number: 'Number',
  name: 'Name',
  size: 'Size',
  remain: 'Remaining',
  colorname: 'Colorname',
  remaining: 'Remaining amount',
  actions: 'Actions',
  successDelete: 'Filament deleted successfully',
  errorDelete: 'Error deleting filament',
  success: 'Filament updated successfully',
  error: 'Error updating filament'
};

language.scanner = {
  title: 'Code Scanner',
  instructions: 'Position the code within the area',
  startNFC: 'Start NFC Reading',
  stopNFC: 'Stop Reading',
  nfcReading: 'Bring the NFC tag close to the device',
  nfcNotSupported: 'NFC not supported on this device'
};

language.confirmEdit = {
  cancel: 'Cancel'
};

language.close = 'Close';

language.registerPage = {
  title: 'Register',
  username: 'Username',
  email: 'Email',
  adminKey: 'Admin Registration Key',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  register: 'Register',
  haveAccount: 'Already have an account?',
  loginLink: 'Login here',
  success: 'Registration successful!',
  error: 'Registration failed',
  usernameExists: 'Username already exists',
  invalidAdminKey: 'Invalid admin key. Contact administrator.',
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
  trayName: 'Tray Name',
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

language.stockTotal = {
  title: 'Stock Total',
  filters: 'Filters',
  filterOwner: 'Filter by Owner',
  owner: 'Owner',
  inventory: 'Inventory',
  items: 'items',
  weight: 'Weight',
  serialNumber: 'Serial Number',
  manual: 'Manual',
  noData: 'No filaments available',
  tagUid: 'Tag UID',
  spoolCount: 'Spools',
  totalWeight: 'Total Weight',
  averageRemain: 'Average Remaining',
  spoolDetails: 'Individual Spools'
};

language.loginPage.noAccount = "Don't have an account?";
language.loginPage.registerLink = "Register here";

export default language;
