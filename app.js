document.addEventListener('DOMContentLoaded', () => {
  const authContainer = document.getElementById('auth-container');
  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');
  const toggleToSignUp = document.getElementById('toggle-to-signup');
  const toggleToSignIn = document.getElementById('toggle-to-signin');
  
  const signupForm = document.getElementById('signup-form');
  const signinForm = document.getElementById('signin-form');

  // 1. SLIDING PANELS & MOBILE NAVIGATION
  const setPanelActive = (isActive) => {
    if (isActive) {
      authContainer.classList.add('right-panel-active');
    } else {
      authContainer.classList.remove('right-panel-active');
    }
  };

  signUpButton.addEventListener('click', () => setPanelActive(true));
  signInButton.addEventListener('click', () => setPanelActive(false));
  toggleToSignUp.addEventListener('click', () => setPanelActive(true));
  toggleToSignIn.addEventListener('click', () => setPanelActive(false));


  // 2. SHOW / HIDE PASSWORD TOGGLE
  const setupPasswordToggles = () => {
    const toggleBtns = document.querySelectorAll('.toggle-password-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = 'HIDE';
          btn.setAttribute('aria-label', 'Hide password');
          btn.setAttribute('title', 'Hide password');
        } else {
          input.type = 'password';
          btn.textContent = 'SHOW';
          btn.setAttribute('aria-label', 'Show password');
          btn.setAttribute('title', 'Show password');
        }
      });
    });
  };
  setupPasswordToggles();


  // 3. PASSWORD COMPLEXITY REAL-TIME FEEDBACK
  const signupPasswordInput = document.getElementById('signup-password');
  const rules = {
    length: document.getElementById('rule-length'),
    uppercase: document.getElementById('rule-uppercase'),
    number: document.getElementById('rule-number'),
    special: document.getElementById('rule-special')
  };

  const validatePasswordRealtime = () => {
    const val = signupPasswordInput.value;
    
    // Check individual criteria
    const criteria = {
      length: val.length >= 8,
      uppercase: /[A-Z]/.test(val),
      number: /\d/.test(val),
      special: /[\W_]/.test(val)
    };

    // Toggle styling classes based on meeting criteria
    for (const key in criteria) {
      if (criteria[key]) {
        rules[key].classList.add('valid');
        rules[key].classList.remove('invalid-active');
      } else {
        rules[key].classList.remove('valid');
      }
    }
  };

  signupPasswordInput.addEventListener('input', validatePasswordRealtime);


  // 4. ACCESSIBILITY: SYNC ARIA-INVALID WITH VISUAL `:user-invalid` STATE
  const syncAria = (el) => {
    if (!el || !el.matches) return;
    const isInvalid = el.matches(':user-invalid') || el.classList.contains('user-invalid-fallback');
    el.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
  };

  document.addEventListener('blur', (e) => syncAria(e.target), true);
  document.addEventListener('input', (e) => {
    if (e.target.hasAttribute('aria-invalid')) {
      syncAria(e.target);
    }
  });


  // 5. CROSS-PLATFORM INTERACTION FALLBACK FOR `:user-invalid` / `:user-valid`
  // Tracks user interaction using WeakMap to match CSS behavior when `:user-invalid` is unsupported
  const UserInvalidFallback = (() => {
    const dirtyState = new WeakMap();

    const updateState = (input) => {
      const isValid = input.checkValidity();
      input.classList.toggle('user-invalid-fallback', !isValid);
      input.classList.toggle('user-valid-fallback', isValid);
      
      // Update ARIA
      if (!isValid) {
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.removeAttribute('aria-invalid');
      }
    };

    const handleEvent = (event) => {
      const input = event.target;
      if (event.type === 'reset') {
        const controls = input.elements || [];
        for (const control of controls) {
          dirtyState.delete(control);
          control.classList.remove('user-invalid-fallback', 'user-valid-fallback');
          control.removeAttribute('aria-invalid');
        }
        return;
      }

      if (!input.checkValidity) return;

      if (event.type === 'input' || event.type === 'change') {
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasInteracted = true;
        dirtyState.set(input, state);
        if (state.hasBlurred) {
          updateState(input);
        }
      } else if (event.type === 'blur') {
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasBlurred = true;
        dirtyState.set(input, state);
        if (state.hasInteracted) {
          updateState(input);
        }
      }
    };

    const init = (root = document) => {
      if (CSS.supports('selector(:user-invalid)')) return; // Exit if browser supports native selector

      root.addEventListener('blur', handleEvent, true);
      root.addEventListener('input', handleEvent);
      root.addEventListener('change', handleEvent);
      root.addEventListener('reset', handleEvent, true);
    };

    return { init, updateState };
  })();

  UserInvalidFallback.init(signupForm);
  UserInvalidFallback.init(signinForm);


  // 6. TOAST NOTIFICATION UTILITY
  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : '❌';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);

    // Auto-remove toast after 4.5 seconds
    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  };


  // 7. FORM SUBMISSION HANDLERS WITH MOCK API EFFECTS
  const triggerFormSubmitValidation = (form) => {
    const inputs = form.querySelectorAll('input');
    let firstInvalidInput = null;

    inputs.forEach(input => {
      // Force inputs to mark as dirty & trigger validation feedback
      input.classList.add('user-invalid-fallback');
      UserInvalidFallback.updateState(input);
      
      if (!input.checkValidity() && !firstInvalidInput) {
        firstInvalidInput = input;
      }
    });

    if (firstInvalidInput) {
      firstInvalidInput.focus();
      return false;
    }
    return true;
  };

  // Quick Demo Chips
  const demoChips = document.querySelectorAll('.demo-chip');
  demoChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const email = chip.getAttribute('data-email');
      const emailInput = document.getElementById('signin-email');
      const passInput = document.getElementById('signin-password');
      if (emailInput && passInput) {
        emailInput.value = email;
        passInput.value = 'password123';
        showToast(`Logging in as ${chip.textContent.trim()}...`, 'success');
        setTimeout(() => {
          signinForm.requestSubmit();
        }, 300);
      }
    });
  });

  // Sign In submit
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isValid = triggerFormSubmitValidation(signinForm);
    if (isValid) {
      const email = document.getElementById('signin-email').value.trim();
      const password = document.getElementById('signin-password').value;
      
      const res = await window.API.login(email, password);
      if (res && res.status === 'success') {
        const user = res.user;
        localStorage.setItem('dailygrind_current_user', JSON.stringify(user));
        localStorage.setItem('tgd_current_user', JSON.stringify(user));
        sessionStorage.setItem('tgd_current_user', JSON.stringify(user));
        showToast(`Welcome back, ${user.name}! Redirecting to portal...`, 'success');
        signinForm.reset();
        setTimeout(() => {
          if (user.role === 'admin') {
            window.location.href = 'admin.html';
          } else if (user.role === 'barista') {
            window.location.href = 'barista.html';
          } else if (user.role === 'staff' || user.role === 'cashier') {
            window.location.href = 'staff.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        }, 1000);

      } else {
        showToast(res && res.message ? res.message : 'Invalid email address or password.', 'error');
      }
    } else {
      showToast('Please correct the highlighted errors.', 'error');
    }
  });

  // Sign Up submit
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isValid = triggerFormSubmitValidation(signupForm);
    if (isValid) {
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const role = document.getElementById('signup-role')?.value || 'customer';
      
      const res = await window.API.signup(name, email, password, role);
      if (res && res.status === 'success') {
        const user = res.user;
        localStorage.setItem('dailygrind_current_user', JSON.stringify(user));
        localStorage.setItem('tgd_current_user', JSON.stringify(user));
        sessionStorage.setItem('tgd_current_user', JSON.stringify(user));
        showToast(`Account successfully created! Welcome, ${name}!`, 'success');
        signupForm.reset();
        
        // Update rules checklist to neutral
        for (const key in rules) {
          rules[key]?.classList.remove('valid', 'invalid-active');
        }

        // Transition to appropriate portal
        setTimeout(() => {
          if (user.role === 'admin') {
            window.location.href = 'admin.html';
          } else if (user.role === 'barista') {
            window.location.href = 'barista.html';
          } else if (user.role === 'staff' || user.role === 'cashier') {
            window.location.href = 'staff.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        }, 1200);
      } else {
        showToast(res && res.message ? res.message : 'Signup failed. Please try again.', 'error');
      }
    } else {
      // Highlight unmet password rules when attempting to submit invalid form
      const val = signupPasswordInput.value;
      const criteria = {
        length: val.length >= 8,
        uppercase: /[A-Z]/.test(val),
        number: /\d/.test(val),
        special: /[\W_]/.test(val)
      };

      for (const key in criteria) {
        if (!criteria[key]) {
          rules[key]?.classList.add('invalid-active');
        }
      }
      showToast('Please satisfy all password complexity rules.', 'error');
    }
  });
});
