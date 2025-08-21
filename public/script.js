// Replace with your backend URL
const BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const res = await fetch(`${BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        alert('Login successful!');
        window.location.href = 'auctions.html'; // redirect
      } else {
        alert(data.error || 'Login failed');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;
      const role = document.getElementById('regRole').value;

      const res = await fetch(`${BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Registration successful. You can now log in.');
        window.location.href = 'login.html';
      } else {
        alert(data.error || 'Registration failed');
      }
    });
  }
});
