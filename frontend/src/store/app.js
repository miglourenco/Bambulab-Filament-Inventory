import { defineStore } from 'pinia'
import axios from 'axios';
import router from '../router';

const host = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Setup axios interceptor to handle 401 errors globally
let interceptorSetup = false;

function setupAxiosInterceptor(store) {
  if (interceptorSetup) return;
  interceptorSetup = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        store.login = null;
        store.user = null;
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');

        // Redirect to login page
        if (router.currentRoute.value.path !== '/login') {
          router.push('/login');
        }
      }
      return Promise.reject(error);
    }
  );
}

export const useAppStore = defineStore('app', {
  state: () => ({
    login: sessionStorage.getItem('token') || null,
    user: JSON.parse(sessionStorage.getItem('user') || 'null'),
    filaments: [],
    filter: null,
    amsConfigs: [],
    viewAll: false
  }),
  getters: {
    isLoggedIn: (state) => !!state.login,
    isAdmin: (state) => state.user?.role === 'admin',
    autocomplete: (state) => {
      return (key) => state.filaments.map((filament) => filament[key]).filter((value, index, self) => self.indexOf(value) === index);
    },
    filamentList: (state) => {
      let filaments = state.filaments.filter(e => {
        if (!state.filter) {
          return true;
        }

        return e.type === state.filter;
      }).reduce((acc, filament) => {
        let key = filament.color + filament.type + filament.name + filament.manufacturer;

        if (!acc[key]) {
          acc[key] = {
            type: filament.type,
            manufacturer: filament.manufacturer,
            remain: filament.size / 100 * filament.remain,
            filaments: [filament],
            color: filament.color,
            colorname: filament.colorname,
            name: filament.name
          }
        } else {
          acc[key].remain += filament.size / 100 * filament.remain;
          acc[key].filaments.push(filament);
        }

        return acc;
      }, {});

      return Object.keys(filaments).map(key => filaments[key]);
    }
  },
  actions: {
    setFilter(filter) {
      this.filter = filter;
    },
    setViewAll(value) {
      this.viewAll = value;
      if (this.isLoggedIn) {
        this.getFilaments();
      }
    },
    async deleteFilament(tag_uid) {
      try {
        if (!this.isLoggedIn) {
          return false;
        }

        const { data } = await axios.post(host + '/delete', { tag_uid }, {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        this.filaments = data;

        return true;
      } catch (error) {
        console.log(error);
      }

      return false;
    },
    async updateFilament(filament) {
      try {
        if (!this.isLoggedIn) {
          return false;
        }

        const { data } = await axios.post(host + '/update', filament, {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        this.filaments = data;

        return true;
      } catch (error) {
        console.log(error);
      }

      return false;
    },

    async getFilaments() {
      try {
        if (!this.isLoggedIn) {
          return;
        }

        const params = this.viewAll && this.isAdmin ? { viewAll: 'true' } : {};

        const { data } = await axios.get(host + '/filaments', {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
          params
        });

        this.filaments = data;
      } catch (error) {
        if (error.response?.status === 401) {
          this.login = null;
          this.user = null;
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      }
    },
    async searchFilamentByCode(code) {
      try {
        if (!this.isLoggedIn) {
          return null;
        }

        const { data } = await axios.get(host + `/filaments/search/${code}`, {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        // Find in filamentList
        const filament = this.filamentList.find(f =>
          f.filaments.some(fil => fil.tag_uid === code || fil.serialNumber === code)
        );

        return filament;
      } catch (error) {
        console.log(error);
        return null;
      }
    },
    async addFilament(filament) {
      try {
        if (!this.isLoggedIn) {
          return false;
        }

        const { data } = await axios.post(host + '/update', filament, {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        this.filaments = data;

        return true;
      } catch (error) {
        console.log(error);
      }

      return false;
    },
    init() {
      // Setup axios interceptor when store is initialized
      setupAxiosInterceptor(this);
    },
    async checkLogin(username, password) {
      try {
        // Ensure interceptor is setup
        setupAxiosInterceptor(this);

        const { data } = await axios.post(host + '/oauth/token', {
          grant_type: 'password',
          username,
          password
        });

        this.login = data.access_token;
        this.user = data.user;

        sessionStorage.setItem('token', data.access_token);
        sessionStorage.setItem('user', JSON.stringify(data.user));

        await this.getFilaments();
        await this.getAMSConfigs();

        return true;
      } catch (error) {
        console.log(error);
      }

      return false;
    },
    async register(username, password, email, adminKey) {
      try {
        await axios.post(host + '/register', {
          username,
          password,
          email,
          adminKey
        });

        return true;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getUserInfo() {
      try {
        if (!this.isLoggedIn) {
          return null;
        }

        const { data } = await axios.get(host + '/user/me', {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        this.user = data;
        sessionStorage.setItem('user', JSON.stringify(data));

        return data;
      } catch (error) {
        console.log(error);
        return null;
      }
    },
    async updateSettings(settings) {
      try {
        if (!this.isLoggedIn) {
          return false;
        }

        const { data } = await axios.put(host + '/user/settings', settings, {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        this.user = { ...this.user, ...data };
        sessionStorage.setItem('user', JSON.stringify(this.user));

        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
    async getAMSConfigs() {
      try {
        if (!this.isLoggedIn) {
          return;
        }

        const { data } = await axios.get(host + '/ams-config', {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        this.amsConfigs = data;
      } catch (error) {
        console.log(error);
      }
    },
    async addAMSConfig(config) {
      try {
        if (!this.isLoggedIn) {
          return false;
        }

        await axios.post(host + '/ams-config', config, {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        await this.getAMSConfigs();
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
    async updateAMSConfig(amsId, updates) {
      try {
        if (!this.isLoggedIn) {
          return false;
        }

        await axios.put(host + `/ams-config/${amsId}`, updates, {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        await this.getAMSConfigs();
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
    async deleteAMSConfig(amsId) {
      try {
        if (!this.isLoggedIn) {
          return false;
        }

        await axios.delete(host + `/ams-config/${amsId}`, {
          headers: {
            Authorization: `Bearer ${this.login}`,
          },
        });

        await this.getAMSConfigs();
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
    logout() {
      this.login = null;
      this.user = null;
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
  }
});

setInterval(() => {
  const appStore = useAppStore();

  if (appStore.isLoggedIn) {
    appStore.getFilaments();
  }
}, 10000);
