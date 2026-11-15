/**
 * FitZone API Client
 * Handles all HTTP requests to the API with JWT token management
 */

class ApiClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
    }

    /**
     * Build URL with query string parameters
     */
    static buildUrl(path, params = {}) {
        const url = new URL(path, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] != null && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    /**
     * Get authorization header
     */
    getAuthHeader() {
        if (!this.token) return {};
        return { 'Authorization': `Bearer ${this.token}` };
    }

    /**
     * Set token from response
     */
    setToken(token, refreshToken) {
        this.token = token;
        this.refreshToken = refreshToken;
        localStorage.setItem('access_token', token);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
    }

    /**
     * Clear tokens
     */
    clearToken() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                this.clearToken();
                return false;
            }

            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (!response.ok) {
                this.clearToken();
                return false;
            }

            const data = await response.json();
            this.setToken(data.accessToken, data.refreshToken);
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearToken();
            return false;
        }
    }

    /**
     * Make HTTP request
     */
    async request(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeader(),
                ...options.headers
            }
        };

        let response = await fetch(fullUrl, config);

        // Handle 401 - try to refresh token
        if (response.status === 401 && this.token) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                config.headers = {
                    ...config.headers,
                    ...this.getAuthHeader()
                };
                response = await fetch(fullUrl, config);
            }
        }

        // Handle error responses
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.status = response.status;

            try {
                error.data = await response.json();
            } catch (e) {
                error.data = null;
            }

            throw error;
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return response.status === 204 ? null : response;
    }

    // GET
    get(url, params = {}) {
        const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params) : '';
        return this.request(url + queryString);
    }

    // POST
    post(url, body) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    // PUT
    put(url, body) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    // DELETE
    delete(url) {
        return this.request(url, { method: 'DELETE' });
    }

    // Auth endpoints
    auth = {
        register: (data) => this.post('/auth/register', data),
        login: (data) => this.post('/auth/login', data),
        sendVerificationCode: (data) => this.post('/auth/send-verification-code', data),
        verifyEmail: (data) => this.post('/auth/verify-email', data)
    };

    // Trainer endpoints
    trainers = {
        getAll: (params) => this.get('/trainers', params),
        getById: (id) => this.get(`/trainers/${id}`)
    };

    // Session endpoints
    sessions = {
        getAll: (params) => this.get('/training-sessions', params),
        getById: (id) => this.get(`/training-sessions/${id}`)
    };

    // Membership endpoints
    memberships = {
        getAll: () => this.get('/memberships'),
        getUserMembership: () => this.get('/memberships/current'),
        purchasePlan: (data) => this.post('/memberships/purchase', data)
    };

    // Profile endpoints
    profile = {
        get: () => this.get('/profile'),
        update: (data) => this.put('/profile', data)
    };

    // Booking endpoints
    bookings = {
        getAll: (params) => this.get('/bookings', params),
        create: (data) => this.post('/bookings', data),
        cancel: (id) => this.delete(`/bookings/${id}`)
    };

    // Visit endpoints
    visits = {
        getAll: (params) => this.get('/visit', params),
        create: (data) => this.post('/visit', data)
    };

    // User endpoints
    users = {
        getAll: (params) => this.get('/users', params),
        getById: (id) => this.get(`/users/${id}`),
        update: (id, data) => this.put(`/users/${id}`, data)
    };
}

// Create global instance
window.apiClient = new ApiClient();
