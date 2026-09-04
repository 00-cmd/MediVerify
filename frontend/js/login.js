const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    message.textContent = "Logging in...";

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/auth/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            message.textContent =
                data.detail || "Login failed.";

            return;
        }

        // Save JWT token
        localStorage.setItem(
            "access_token",
            data.access_token
        );

        // Go to dashboard
        window.location.href = "dashboard.html";

    } catch (error) {

        console.error(error);

        message.textContent =
            "Could not connect to the server.";
    }
});