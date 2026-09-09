const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const registerButton = document.getElementById("registerButton");

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const role = document.getElementById("role").value;

    registerMessage.textContent = "";

    if (!name || !email || !password || !confirmPassword || !role) {
        registerMessage.textContent = "Please fill in all fields.";
        return;
    }

    if (password !== confirmPassword) {
        registerMessage.textContent = "Passwords do not match.";
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Creating Account...";

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                role: role
            })
        });

        const data = await response.json();

        if (!response.ok) {
            let errorMessage = "Registration failed.";

            if (data.detail) {
                if (Array.isArray(data.detail)) {
                    errorMessage = data.detail
                        .map(error => error.msg)
                        .join(", ");
                } else {
                    errorMessage = data.detail;
                }
            }

            registerMessage.textContent = errorMessage;
            registerButton.disabled = false;
            registerButton.textContent = "Create Account";
            return;
        }

        // Show success popup
        alert(
            "Account created successfully!\n\n" +
            "Head towards the login page to login."
        );

        // Redirect to login page
        window.location.href = "index.html";

    } catch (error) {
        console.error("Registration error:", error);

        registerMessage.textContent =
            "Unable to connect to server. Please try again.";

        registerButton.disabled = false;
        registerButton.textContent = "Create Account";
    }
});