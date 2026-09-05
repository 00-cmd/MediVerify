
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");


loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    message.textContent = "";
    message.style.color = "";


    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;


    try {

        // ====================================================
        // LOGIN
        // ====================================================

        const loginResponse = await fetch(
            `${API_URL}/auth/login`,
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


        if (!loginResponse.ok) {

            const errorData = await loginResponse.json();

            message.textContent =
                errorData.detail || "Login failed.";

            return;
        }


        const loginData = await loginResponse.json();


        // ====================================================
        // SAVE JWT TOKEN
        // ====================================================

        localStorage.setItem(
            "token",
            loginData.access_token
        );


        // ====================================================
        // GET CURRENT USER
        // ====================================================

        const profileResponse = await fetch(
            `${API_URL}/auth/me`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${loginData.access_token}`
                }
            }
        );


        if (!profileResponse.ok) {

            localStorage.removeItem("token");

            message.textContent =
                "Could not get user information.";

            return;
        }


        const user = await profileResponse.json();


        console.log("Logged in user:", user);


        // ====================================================
        // ROLE-BASED REDIRECT
        // ====================================================

        if (user.role === "ADMIN") {

            window.location.href =
                "admin-dashboard.html";

        }

        else if (user.role === "MANUFACTURER") {

            window.location.href =
                "dashboard.html";

        }

        else if (user.role === "CHEMIST") {

            message.textContent =
                "Chemist dashboard is not available yet.";

            localStorage.removeItem("token");

        }

        else {

            message.textContent =
                "Unknown user role.";

            localStorage.removeItem("token");

        }

    }

    catch (error) {

        console.error("Login error:", error);

        message.textContent =
            "Unable to connect to the server.";

    }

});