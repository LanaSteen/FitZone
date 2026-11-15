/**
 * FitZone Main Application
 * Handles routing and page management
 */

class FitZoneApp {
    constructor() {
        this.currentPage = null;
        this.isAuthenticated = !!localStorage.getItem('access_token');
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupRouting();
        this.loadPage();
    }

    setupNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navLinks = document.querySelector('.nav-links');

        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navLinks?.classList.toggle('show');
            });
        }

        // Update auth state in nav
        this.updateAuthNav();
    }

    updateAuthNav() {
        const authLink = document.getElementById('authLink');

        if (!authLink) return;

        if (this.isAuthenticated) {
            authLink.innerHTML = '<button class="btn-logout">Logout</button>';
            authLink.querySelector('.btn-logout').addEventListener('click', () => this.logout());
        } else {
            authLink.innerHTML = '<a href="#/login" class="btn-register">Login</a>';
        }
    }

    setupRouting() {
        window.addEventListener('hashchange', () => this.loadPage());

        // Intercept link clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.href.includes('#/')) {
                e.preventDefault();
                window.location.hash = e.target.getAttribute('href');
            }
        });
    }

    loadPage() {
        const hash = window.location.hash || '#/';
        const [route, ...params] = hash.slice(2).split('/');

        // Guard routes
        if (['profile', 'my-bookings', 'visits'].includes(route) && !this.isAuthenticated) {
            window.location.hash = '#/login';
            return;
        }

        this.renderPage(route, params);
    }

    async renderPage(route, params) {
        const app = document.getElementById('app');
        if (!app) return;

        try {
            let html = '';

            switch (route) {
                case '':
                case 'home':
                    html = await this.pages.home();
                    break;
                case 'login':
                    html = await this.pages.login();
                    break;
                case 'register':
                    html = await this.pages.register();
                    break;
                case 'trainers':
                    html = await this.pages.trainers();
                    break;
                case 'sessions':
                    html = await this.pages.sessions();
                    break;
                case 'memberships':
                    html = await this.pages.memberships();
                    break;
                case 'profile':
                    html = await this.pages.profile();
                    break;
                case 'my-bookings':
                    html = await this.pages.myBookings();
                    break;
                default:
                    html = '<div class="container"><h1>Page not found</h1><p><a href="#/">Go home</a></p></div>';
            }

            app.innerHTML = html;
            this.currentPage = route;

            // Attach event listeners
            this.attachPageListeners(route);

        } catch (error) {
            console.error('Error loading page:', error);
            app.innerHTML = '<div class="alert alert-danger">Error loading page</div>';
        }
    }

    attachPageListeners(route) {
        switch (route) {
            case 'login':
                this.attachLoginListeners();
                break;
            case 'register':
                this.attachRegisterListeners();
                break;
            case 'sessions':
                this.attachSessionsListeners();
                break;
            case 'memberships':
                this.attachMembershipsListeners();
                break;
        }
    }

    // Event handlers
    attachLoginListeners() {
        const form = document.getElementById('loginForm');
        form?.addEventListener('submit', (e) => this.handleLogin(e));
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const result = await window.apiClient.auth.login({ email, password });

            window.apiClient.setToken(result.accessToken, result.refreshToken);
            this.isAuthenticated = true;
            this.updateAuthNav();

            window.location.hash = '#/home';
        } catch (error) {
            this.showError(error.data?.message || 'Login failed');
        }
    }

    attachRegisterListeners() {
        const form = document.getElementById('registerForm');
        form?.addEventListener('submit', (e) => this.handleRegister(e));
    }

    async handleRegister(e) {
        e.preventDefault();

        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value
        };

        try {
            await window.apiClient.auth.register(formData);
            this.showSuccess('Registration successful! Please log in.');
            setTimeout(() => window.location.hash = '#/login', 2000);
        } catch (error) {
            this.showError(error.data?.message || 'Registration failed');
        }
    }

    attachSessionsListeners() {
        // Book session buttons
        document.querySelectorAll('.btn-book-session').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleBooking(e));
        });
    }

    async handleBooking(e) {
        if (!this.isAuthenticated) {
            window.location.hash = '#/login';
            return;
        }

        const sessionId = e.target.dataset.sessionId;
        try {
            await window.apiClient.bookings.create({ workoutSessionId: sessionId });
            this.showSuccess('Booking successful!');
            setTimeout(() => this.loadPage(), 1500);
        } catch (error) {
            this.showError(error.data?.message || 'Booking failed');
        }
    }

    attachMembershipsListeners() {
        document.querySelectorAll('.btn-purchase').forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePurchase(e));
        });
    }

    async handlePurchase(e) {
        if (!this.isAuthenticated) {
            window.location.hash = '#/login';
            return;
        }

        const planId = e.target.dataset.planId;
        try {
            await window.apiClient.memberships.purchasePlan({ planId });
            this.showSuccess('Membership purchased!');
            setTimeout(() => this.loadPage(), 1500);
        } catch (error) {
            this.showError(error.data?.message || 'Purchase failed');
        }
    }

    logout() {
        window.apiClient.clearToken();
        this.isAuthenticated = false;
        this.updateAuthNav();
        window.location.hash = '#/home';
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger';
        alert.textContent = message;
        document.querySelector('main')?.insertBefore(alert, document.querySelector('main').firstChild);
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = message;
        document.querySelector('main')?.insertBefore(alert, document.querySelector('main').firstChild);
        setTimeout(() => alert.remove(), 5000);
    }

    // Page templates
    pages = {
        home: async () => `
            <main>
                <section class="fz-hero">
                    <div>
                        <h1>Move more.<br>Train smarter.</h1>
                        <p class="lead">Pick a coach, book a group session and keep every gym visit in one place. Three or four sessions a week is enough to reach the 150 minutes of activity that health guidelines recommend.</p>
                        <div class="fz-hero-buttons">
                            <a href="#/sessions" class="btn btn-primary btn-lg">See sessions</a>
                            <a href="#/memberships" class="btn btn-outline btn-lg">Choose a membership</a>
                        </div>
                    </div>
                    <div class="fz-hero-art" aria-hidden="true">
                        <span class="ring r1"></span>
                        <span class="ring r2"></span>
                        <span class="ring r3"></span>
                        <i class="bolt">⚡</i>
                    </div>
                </section>

                <div class="container mt-5">
                    <div class="grid">
                        <a href="#/trainers" class="fz-tile t-violet">
                            <h3>Trainers</h3>
                            <p>Strength, cardio, yoga and more. See who coaches what and when they teach next.</p>
                            <span class="go">Meet the trainers</span>
                            <span class="big">👥</span>
                        </a>
                        <a href="#/sessions" class="fz-tile t-yellow">
                            <h3>Workout sessions</h3>
                            <p>Group sessions with limited places. Book yours before it fills up.</p>
                            <span class="go">Open the schedule</span>
                            <span class="big">📅</span>
                        </a>
                        <a href="#/memberships" class="fz-tile t-mint">
                            <h3>Memberships</h3>
                            <p>Monthly, quarterly or yearly, with a visit limit or unlimited.</p>
                            <span class="go">Compare plans</span>
                            <span class="big">💳</span>
                        </a>
                    </div>

                    <h2 class="mt-5 mb-3">How it works</h2>
                    <div class="grid">
                        <div class="fz-tile t-violet">
                            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">1</div>
                            <h3>Create an account</h3>
                            <p>Register and confirm your email with a 6-digit code.</p>
                        </div>
                        <div class="fz-tile t-yellow">
                            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">2</div>
                            <h3>Choose a membership</h3>
                            <p>Pick a plan that fits your schedule and budget.</p>
                        </div>
                        <div class="fz-tile t-mint">
                            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">3</div>
                            <h3>Book and attend</h3>
                            <p>Reserve your spot in group sessions and track your visits.</p>
                        </div>
                    </div>
                </div>
            </main>
        `,

        login: async () => `
            <main class="container mt-5">
                <div style="max-width: 400px; margin: 0 auto;">
                    <h1>Login</h1>
                    <form id="loginForm" class="mt-4">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">Login</button>
                    </form>
                    <p class="mt-3" style="text-align: center;">
                        Don't have an account? <a href="#/register">Register here</a>
                    </p>
                </div>
            </main>
        `,

        register: async () => `
            <main class="container mt-5">
                <div style="max-width: 400px; margin: 0 auto;">
                    <h1>Register</h1>
                    <form id="registerForm" class="mt-4">
                        <div class="form-group">
                            <label for="firstName">First Name</label>
                            <input type="text" id="firstName" name="firstName" required>
                        </div>
                        <div class="form-group">
                            <label for="lastName">Last Name</label>
                            <input type="text" id="lastName" name="lastName" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">Register</button>
                    </form>
                    <p class="mt-3" style="text-align: center;">
                        Already have an account? <a href="#/login">Login here</a>
                    </p>
                </div>
            </main>
        `,

        trainers: async () => {
            try {
                const trainers = await window.apiClient.trainers.getAll();
                const html = trainers.map(t => `
                    <div class="fz-tile t-violet">
                        <h3>${t.fullName}</h3>
                        <p><strong>Specialization:</strong> ${t.specialization}</p>
                        <p><strong>Experience:</strong> ${t.experienceYears} years</p>
                    </div>
                `).join('');

                return `
                    <main class="container mt-5">
                        <h1>Meet Our Trainers</h1>
                        <div class="grid mt-4">${html}</div>
                    </main>
                `;
            } catch (error) {
                return `<main class="container mt-5"><div class="alert alert-danger">${error.message}</div></main>`;
            }
        },

        sessions: async () => {
            try {
                const sessions = await window.apiClient.sessions.getAll();
                const html = sessions.map(s => `
                    <div class="fz-tile t-yellow">
                        <h3>${s.name}</h3>
                        <p><strong>Time:</strong> ${new Date(s.startTime).toLocaleString()}</p>
                        <p><strong>Duration:</strong> ${s.durationMinutes} minutes</p>
                        <p><strong>Capacity:</strong> ${s.currentParticipants}/${s.maxParticipants}</p>
                        <button class="btn btn-primary btn-book-session" data-session-id="${s.id}">Book Now</button>
                    </div>
                `).join('');

                return `
                    <main class="container mt-5">
                        <h1>Workout Sessions</h1>
                        <div class="grid mt-4">${html}</div>
                    </main>
                `;
            } catch (error) {
                return `<main class="container mt-5"><div class="alert alert-danger">${error.message}</div></main>`;
            }
        },

        memberships: async () => {
            try {
                const plans = await window.apiClient.memberships.getAll();
                const html = plans.map(p => `
                    <div class="fz-tile t-mint">
                        <h3>${p.name}</h3>
                        <p><strong>Price:</strong> $${p.price}</p>
                        <p><strong>Duration:</strong> ${p.durationInDays} days</p>
                        <p><strong>Visit Limit:</strong> ${p.visitLimit || 'Unlimited'}</p>
                        <button class="btn btn-primary btn-purchase" data-plan-id="${p.id}">Purchase</button>
                    </div>
                `).join('');

                return `
                    <main class="container mt-5">
                        <h1>Membership Plans</h1>
                        <div class="grid mt-4">${html}</div>
                    </main>
                `;
            } catch (error) {
                return `<main class="container mt-5"><div class="alert alert-danger">${error.message}</div></main>`;
            }
        },

        profile: async () => {
            try {
                const profile = await window.apiClient.profile.get();
                return `
                    <main class="container mt-5">
                        <h1>My Profile</h1>
                        <div class="fz-tile t-violet" style="max-width: 600px; margin-top: 2rem;">
                            <p><strong>Name:</strong> ${profile.firstName} ${profile.lastName}</p>
                            <p><strong>Email:</strong> ${profile.email}</p>
                            <p><strong>Phone:</strong> ${profile.phoneNumber || 'N/A'}</p>
                            <p><strong>Member Since:</strong> ${new Date(profile.createdAt).toLocaleDateString()}</p>
                        </div>
                    </main>
                `;
            } catch (error) {
                return `<main class="container mt-5"><div class="alert alert-danger">${error.message}</div></main>`;
            }
        },

        myBookings: async () => {
            try {
                const bookings = await window.apiClient.bookings.getAll();
                const html = bookings.map(b => `
                    <div style="padding: 1rem; border: 1px solid var(--fz-line); border-radius: 8px; margin-bottom: 1rem;">
                        <h3>${b.sessionName}</h3>
                        <p><strong>Date:</strong> ${new Date(b.sessionDate).toLocaleString()}</p>
                        <p><strong>Status:</strong> ${b.status}</p>
                        <button class="btn btn-outline" data-booking-id="${b.id}">Cancel</button>
                    </div>
                `).join('');

                return `
                    <main class="container mt-5">
                        <h1>My Bookings</h1>
                        <div class="mt-4">${html || '<p>No bookings yet.</p>'}</div>
                    </main>
                `;
            } catch (error) {
                return `<main class="container mt-5"><div class="alert alert-danger">${error.message}</div></main>`;
            }
        }
    };
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new FitZoneApp();
    });
} else {
    window.app = new FitZoneApp();
}
