// Function to confirm user deletion with SweetAlert2
function confirmDeleteUser(userId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This will delete the user and all their posts!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete user!'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById(`deleteUserForm-${userId}`).submit();
        }
    });
}

// Function to confirm post deletion using SweetAlert2
function confirmDeletePost(postId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            // Find the correct form by ID and submit it
            document.getElementById(`deletePostForm-${postId}`).submit();
        }
    });
}

// Function to confirm post deletion using SweetAlert2
function confirmEditPost(postId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, edit it!'
    }).then((result) => {
        if (result.isConfirmed) {
            // Find the correct form by ID and submit it
            document.getElementById(`editPostForm-${postId}`).submit();
        }
    });
}

// Like button functionality with optimistic UI updates
document.addEventListener('DOMContentLoaded', () => {
    const likeButtons = document.querySelectorAll('.like-btn');

    likeButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            // Check if the button is interactive (only for logged-in users)
            if (!button.classList.contains('text-danger-emphasis') &&
                !button.classList.contains('btn-danger')) {
                event.preventDefault(); // Prevent the default link behavior
            } else {
                return; // Do nothing if it's the non-interactive version
            }

            const postId = button.dataset.postId;
            if (!postId) return;

            const url = `/post/post/${postId}/like`;
            const iconContainer = button.querySelector('.like-icon-container');

            // Optimistic UI update
            const isLiked = iconContainer.classList.contains('btn-danger');
            const icon = iconContainer.querySelector('i');
            const likesCountSpan = iconContainer.querySelector('.likes-count');
            let currentCount = parseInt(likesCountSpan.textContent);

            // Temporarily update UI based on current state
            if (isLiked) {
                iconContainer.classList.replace('btn-danger', 'text-danger-emphasis');
                icon.classList.replace('bi-heart-fill', 'bi-heart');
                likesCountSpan.textContent = currentCount - 1;
            } else {
                iconContainer.classList.replace('text-danger-emphasis', 'btn-danger');
                icon.classList.replace('bi-heart', 'bi-heart-fill');
                likesCountSpan.textContent = currentCount + 1;
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    // Correct the UI with the authoritative data from the server
                    likesCountSpan.textContent = data.likesCount;
                    // The icon classes should already be correct from the optimistic update
                }
            } catch (error) {
                console.error('Failed to toggle like:', error);
                // On error, revert the optimistic UI update
                if (isLiked) {
                    iconContainer.classList.replace('text-danger-emphasis', 'btn-danger');
                    icon.classList.replace('bi-heart', 'bi-heart-fill');
                    likesCountSpan.textContent = currentCount;
                } else {
                    iconContainer.classList.replace('btn-danger', 'text-danger-emphasis');
                    icon.classList.replace('bi-heart-fill', 'bi-heart');
                    likesCountSpan.textContent = currentCount;
                }
                alert('An error occurred. Please try again.');
            }
        });
    });
});

//enable user continue with where he was after logging in 
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginFormAjax');
    const loginModalElement = document.getElementById('loginModal');
    const loginModal = new bootstrap.Modal(loginModalElement);
    const errorAlert = document.getElementById('loginErrorAlert');
    const redirectUrlInput = document.getElementById('loginRedirectUrl');

    // Update the hidden input field with the current URL when the modal is opened
    loginModalElement.addEventListener('show.bs.modal', function () {
      redirectUrlInput.value = window.location.href;
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Reset error messages and validation state
            errorAlert.textContent = '';
            errorAlert.classList.add('d-none');
            loginForm.classList.remove('was-validated');

            const formData = new FormData(loginForm);
            
            try {
                const response = await fetch(loginForm.action, {
                    method: 'POST',
                    body: new URLSearchParams(formData),
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest', 
                    },
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        // Redirect to the URL received from the server
                        window.location.href = result.redirectUrl; 
                    }
                } else {
                    const errorData = await response.json();
                    if (errorData.errors && errorData.errors.length > 0) {
                        errorAlert.textContent = errorData.errors.join(' ');
                        errorAlert.classList.remove('d-none');
                    } else {
                        errorAlert.textContent = 'An unknown error occurred. Please try again.';
                        errorAlert.classList.remove('d-none');
                    }
                }
            } catch (error) {
                console.error('Login request failed:', error);
                errorAlert.textContent = 'Network error. Please check your connection.';
                errorAlert.classList.remove('d-none');
            }
        });
    }
});

//enable registering and redirecting to the login modal
document.addEventListener('DOMContentLoaded', () => {
    // ---- Get elements for both login and register modals ----
    const loginForm = document.getElementById('loginFormAjax');
    const loginModalElement = document.getElementById('loginModal');
    const loginErrorAlert = document.getElementById('loginErrorAlert');
    const loginRedirectUrlInput = document.getElementById('loginRedirectUrl');

    const registerForm = document.getElementById('registerFormAjax');
    const registerModalElement = document.getElementById('registerModal');
    const registerErrorAlert = document.getElementById('registerErrorAlert');
    const registerRedirectUrlInput = document.getElementById('registerRedirectUrl');

    // Initialize Bootstrap modal instances, but only if the elements exist
    const loginModal = loginModalElement ? new bootstrap.Modal(loginModalElement) : null;
    const registerModal = registerModalElement ? new bootstrap.Modal(registerModalElement) : null;

    // ---- Event listener for login form submission ----
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Reset error messages and validation state
            if (loginErrorAlert) {
                loginErrorAlert.textContent = '';
                loginErrorAlert.classList.add('d-none');
            }
            loginForm.classList.remove('was-validated');

            const formData = new FormData(loginForm);

            try {
                const response = await fetch(loginForm.action, {
                    method: 'POST',
                    body: new URLSearchParams(formData),
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                const result = await response.json();

                if (response.ok) {
                    if (result.success) {
                        // On successful login, redirect to the URL from the server
                        window.location.href = result.redirectUrl;
                    }
                } else {
                    // Handle server-side validation errors
                    if (result.errors && loginErrorAlert) {
                        loginErrorAlert.textContent = result.errors.join(' ');
                        loginErrorAlert.classList.remove('d-none');
                    } else if (loginErrorAlert) {
                        loginErrorAlert.textContent = 'An unknown error occurred. Please try again.';
                        loginErrorAlert.classList.remove('d-none');
                    }
                }
            } catch (error) {
                console.error('Login request failed:', error);
                if (loginErrorAlert) {
                    loginErrorAlert.textContent = 'Network error. Please check your connection.';
                    loginErrorAlert.classList.remove('d-none');
                }
            }
        });
    }

    // ---- Event listener for register form submission ----
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Reset error messages and validation state
            if (registerErrorAlert) {
                registerErrorAlert.textContent = '';
                registerErrorAlert.classList.add('d-none');
            }
            registerForm.classList.remove('was-validated');

            // Client-side password matching check
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirmPassword');
           /* if (passwordInput && confirmPasswordInput && passwordInput.value != confirmPasswordInput.value) {
                if (registerErrorAlert) {
                    registerErrorAlert.textContent = 'Passwords do not match.';
                    registerErrorAlert.classList.remove('d-none');
                }
                // Also trigger Bootstrap's invalid state for the confirm password field
                confirmPasswordInput.setCustomValidity('Passwords do not match.');
                registerForm.classList.add('was-validated');
                return;
            }*/

            const formData = new FormData(registerForm);

            try {
                const response = await fetch(registerForm.action, {
                    method: 'POST',
                    body: new URLSearchParams(formData),
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                const result = await response.json();

                if (response.ok) {
                    if (result.success && result.showLogin) {
                        // After successful registration, close register modal and open login modal
                        registerModal?.hide();
                        loginModal?.show();
                    }
                } else {
                    // Handle server-side validation errors
                    if (result.errors && registerErrorAlert) {
                        registerErrorAlert.textContent = result.errors.join(' ');
                        registerErrorAlert.classList.remove('d-none');
                    } else if (registerErrorAlert) {
                        registerErrorAlert.textContent = 'An unknown error occurred. Please try again.';
                        registerErrorAlert.classList.remove('d-none');
                    }
                }
            } catch (error) {
                console.error('Register request failed:', error);
                if (registerErrorAlert) {
                    registerErrorAlert.textContent = 'Network error. Please check your connection.';
                    registerErrorAlert.classList.remove('d-none');
                }
            }
        });
    }

    // ---- Auto-show login modal if URL query parameter is present ----
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showLoginModal') === 'true') {
        if (loginModal) {
            loginModal.show();
        }
    }

    // ---- Event listeners for updating redirect URL inputs on modal show ----
    // This ensures the user is sent back to the correct page after a successful action.
    if (loginModalElement) {
        loginModalElement.addEventListener('show.bs.modal', function () {
            if (loginRedirectUrlInput) {
                loginRedirectUrlInput.value = window.location.href;
            }
        });
    }

    if (registerModalElement) {
        registerModalElement.addEventListener('show.bs.modal', function () {
            if (registerRedirectUrlInput) {
                registerRedirectUrlInput.value = window.location.href;
            }
        });
    }

    // ---- Bootstrap's default validation script (important for the non-AJAX case) ----
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Reset custom validity for password confirmation on input
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const passwordInput = document.getElementById('password');
            if (passwordInput?.value === confirmPasswordInput.value) {
                confirmPasswordInput.setCustomValidity('');
            }
        });
    }
});


//admin login form
const adminLoginForm = document.getElementById('adminLoginFormAjax');
const adminLoginModalElement = document.getElementById('adminLoginModal');
const adminLoginErrorAlert = document.getElementById('adminLoginErrorAlert');

const adminLoginModal = adminLoginModalElement ? new bootstrap.Modal(adminLoginModalElement) : null;

if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (adminLoginErrorAlert) {
            adminLoginErrorAlert.textContent = '';
            adminLoginErrorAlert.classList.add('d-none');
        }
        adminLoginForm.classList.remove('was-validated');

        const formData = new FormData(adminLoginForm);

        try {
            const response = await fetch(adminLoginForm.action, {
                method: 'POST',
                body: new URLSearchParams(formData),
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const result = await response.json();

            if (response.ok) {
                if (result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                }
            } else {
                if (result.errors && adminLoginErrorAlert) {
                    adminLoginErrorAlert.textContent = result.errors.join(' ');
                    adminLoginErrorAlert.classList.remove('d-none');
                } else if (adminLoginErrorAlert) {
                    adminLoginErrorAlert.textContent = 'An unknown error occurred. Please try again.';
                    adminLoginErrorAlert.classList.remove('d-none');
                }
            }
        } catch (error) {
            console.error('Admin login request failed:', error);
            if (adminLoginErrorAlert) {
                adminLoginErrorAlert.textContent = 'Network error. Please check your connection.';
                adminLoginErrorAlert.classList.remove('d-none');
            }
        }
    });
}

//read more button on search result page
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.read-more-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const postId = e.target.getAttribute('data-post-id');
            const shortText = document.getElementById(`short-text-${postId}`);
            const fullText = document.getElementById(`full-text-${postId}`);
            
            if (shortText.classList.contains('d-none')) {
                // If full text is visible, hide it and show short text
                shortText.classList.remove('d-none');
                fullText.classList.add('d-none');
                e.target.textContent = 'Read more';
            } else {
                // If short text is visible, hide it and show full text
                shortText.classList.add('d-none');
                fullText.classList.remove('d-none');
                e.target.textContent = 'Read less';
            }
        });
    });
});


//sweet alert for deleting post
function confirmDeletePost(postId, postTitle) {
    Swal.fire({
        title: 'Are you sure?',
        html: `You are about to delete your post titled "<strong>${postTitle}</strong>". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById(`deletePostForm-${postId}`).submit();
        }
    });
}

//ADMIN: alert for confirming delete of user
function confirmDeleteUser(userId, username) {
    Swal.fire({
        title: 'Are you sure?',
        html: `You are about to delete user "<strong>${username}</strong>". This will also delete all their posts, comments, and likes. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById(`deleteUserForm-${userId}`).submit();
        }
    });
}

//ADMIN: alert for confirming delete of post
function confirmDeletePost(postId, postTitle) {
    Swal.fire({
        title: 'Are you sure?',
        html: `You are about to delete the post titled "<strong>${postTitle}</strong>". This will also delete all its comments and likes. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById(`deletePostForm-${postId}`).submit();
        }
    });
}

//autoscrolling chat page to the bottom
document.addEventListener('DOMContentLoaded', () => {
    const messageContainer = document.querySelector('.message-container');
    if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
});
















