/**
 * login.js – Nexus HR Admin Authentication Logic
 */

// Auth Mode State (false = Sign In, true = Sign Up)
let isSignUpMode = false;

const loginForm = document.getElementById('loginForm');
const signInBtn = document.getElementById('signInBtn');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');


const nameGroup = document.getElementById('nameGroup');
const fullnameInput = document.getElementById('fullname');
const cardTitle = document.getElementById('cardTitle');
const cardSubtitle = document.getElementById('cardSubtitle');
const forgotLink = document.getElementById('forgotLink');
const rememberGroup = document.getElementById('rememberGroup');
const ssoDivider = document.getElementById('ssoDivider');
const ssoButtons = document.getElementById('ssoButtons');
const toggleText = document.getElementById('toggleText');
const toggleAuthMode = document.getElementById('toggleAuthMode');

// Toggle between Sign In and Sign Up modes
if (toggleAuthMode) {
    toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;

        // Clear existing error banners
        const existingAlert = document.querySelector('.login-alert');
        if (existingAlert) existingAlert.remove();

        if (isSignUpMode) {
            cardTitle.textContent = 'Create Account';
            cardSubtitle.textContent = 'Get started with your Enterprise HR Suite';
            nameGroup.style.display = 'block';
            fullnameInput.required = true;
            forgotLink.style.display = 'none';
            rememberGroup.style.display = 'none';
            ssoDivider.style.display = 'none';
            ssoButtons.style.display = 'none';
            signInBtn.textContent = 'Sign Up';
            toggleText.textContent = 'Already have an account?';
            toggleAuthMode.textContent = 'Sign In';
        } else {
            cardTitle.textContent = 'Welcome Back';
            cardSubtitle.textContent = 'Please enter your details to sign in';
            nameGroup.style.display = 'none';
            fullnameInput.required = false;
            fullnameInput.value = '';
            forgotLink.style.display = 'inline-block';
            rememberGroup.style.display = 'flex';
            ssoDivider.style.display = 'flex';
            ssoButtons.style.display = 'flex';
            signInBtn.textContent = 'Sign In';
            toggleText.textContent = "Don't have an account?";
            toggleAuthMode.textContent = 'Sign Up';
        }
    });
}

// Toggle Password Visibility
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        if (type === 'text') {
            togglePassword.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
        } else {
            togglePassword.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        }
    });
}

// Form Submission - Real Auth (Supports Login and Registration)
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = passwordInput.value;
        const fullname = fullnameInput.value.trim();

        // Clear existing errors
        const existingAlert = document.querySelector('.login-alert');
        if (existingAlert) existingAlert.remove();

        // Validate fields
        if (isSignUpMode) {
            if (!fullname || !email || !password) {
                showLoginError('Please fill in all fields.');
                return;
            }
            if (password.length < 6) {
                showLoginError('Password must be at least 6 characters.');
                return;
            }
        } else {
            if (!email || !password) {
                showLoginError('Please fill in all fields.');
                return;
            }
        }

        const originalText = signInBtn.innerText;
        signInBtn.disabled = true;
        signInBtn.innerText = isSignUpMode ? 'Registering...' : 'Authenticating...';

        try {
            const url = isSignUpMode ? '/api/auth/register' : '/api/auth/login';
            const bodyData = isSignUpMode 
                ? { name: fullname, email, password }
                : { email, password };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            const SESSION_KEY = 'nexus_admin_session';
            const sessionData = {
                user: data.name,
                role: data.role,
                email: data.email,
                timestamp: Date.now()
            };

            const rememberMe = document.getElementById('remember').checked;
            if (!isSignUpMode && rememberMe) {
                localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
            } else {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
            }

            window.location.replace('/index.html');
        } catch (err) {
            signInBtn.disabled = false;
            signInBtn.innerText = originalText;
            showLoginError(err.message);
        }
    });
}

function showLoginError(msg) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'login-alert';
    errorDiv.style.cssText = `
        background-color: #FEE2E2;
        color: #DC2626;
        border: 1px solid #FCA5A5;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 0.85rem;
        font-weight: 500;
        text-align: center;
    `;
    errorDiv.innerText = msg;
    loginForm.insertBefore(errorDiv, loginForm.firstChild);
}

// SSO Buttons mock
window.handleSSO = async function(provider) {
    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span style="font-size:0.8rem">Connecting to ${provider}...</span>`;
    
    // For local development, simulate success by signing in with seeded admin
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: 'admin@nexushr.com', password: 'Admin@123' })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        const SESSION_KEY = 'nexus_admin_session';
        const sessionData = {
            user: data.name,
            role: data.role,
            email: data.email,
            timestamp: Date.now()
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        window.location.replace('/index.html');
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        alert(`SSO Connection failed: ${err.message}`);
    }
};


