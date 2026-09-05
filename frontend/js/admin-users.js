// ============================================================
// GET TOKEN
// ============================================================

const token = localStorage.getItem("token");


// ============================================================
// CHECK LOGIN
// ============================================================

if (!token) {

    window.location.href = "index.html";

}


// ============================================================
// ELEMENTS
// ============================================================

const usersTableBody =
    document.getElementById("usersTableBody");

const message =
    document.getElementById("message");


// ============================================================
// LOAD USERS
// ============================================================

async function loadUsers() {

    message.textContent = "";


    try {

        const response = await fetch(
            `${API_URL}/admin/users`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        // ====================================================
        // UNAUTHORIZED
        // ====================================================

        if (response.status === 401) {

            localStorage.removeItem("token");

            window.location.href =
                "index.html";

            return;

        }


        // ====================================================
        // FORBIDDEN
        // ====================================================

        if (response.status === 403) {

            message.textContent =
                "Access denied. Admin privileges required.";

            return;

        }


        if (!response.ok) {

            throw new Error(
                "Failed to load users"
            );

        }


        const users = await response.json();


        renderUsers(users);

    }

    catch (error) {

        console.error(error);

        message.textContent =
            "Unable to load users.";

    }

}


// ============================================================
// RENDER USERS
// ============================================================

function renderUsers(users) {

    usersTableBody.innerHTML = "";


    if (users.length === 0) {

        usersTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    No users found.
                </td>
            </tr>
        `;

        return;

    }


    users.forEach(function (user) {

        const row =
            document.createElement("tr");


        const status =
            user.is_active
                ? "ACTIVE"
                : "INACTIVE";


        const actionButton =
            user.is_active
                ? `
                    <button
                        class="user-action-btn"
                        onclick="deactivateUser(${user.id})"
                    >
                        Deactivate
                    </button>
                  `
                : `
                    <button
                        class="user-action-btn"
                        onclick="activateUser(${user.id})"
                    >
                        Activate
                    </button>
                  `;


        row.innerHTML = `

            <td>
                ${user.id}
            </td>

            <td>
                ${user.name}
            </td>

            <td>
                ${user.email}
            </td>

            <td>
                ${user.role}
            </td>

            <td>
                ${status}
            </td>

            <td>
                ${actionButton}
            </td>

        `;


        usersTableBody.appendChild(row);

    });

}


// ============================================================
// DEACTIVATE USER
// ============================================================

async function deactivateUser(userId) {

    const confirmed =
        confirm(
            "Are you sure you want to deactivate this user?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response = await fetch(
            `${API_URL}/admin/users/${userId}/deactivate`,
            {
                method: "PATCH",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            message.textContent =
                data.detail ||
                "Failed to deactivate user.";

            return;

        }


        message.textContent =
            data.message;


        await loadUsers();

    }

    catch (error) {

        console.error(error);

        message.textContent =
            "Unable to deactivate user.";

    }

}


// ============================================================
// ACTIVATE USER
// ============================================================

async function activateUser(userId) {

    const confirmed =
        confirm(
            "Are you sure you want to activate this user?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response = await fetch(
            `${API_URL}/admin/users/${userId}/activate`,
            {
                method: "PATCH",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            message.textContent =
                data.detail ||
                "Failed to activate user.";

            return;

        }


        message.textContent =
            data.message;


        await loadUsers();

    }

    catch (error) {

        console.error(error);

        message.textContent =
            "Unable to activate user.";

    }

}


// ============================================================
// LOGOUT
// ============================================================

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        function () {

            localStorage.removeItem("token");

            window.location.href =
                "index.html";

        }
    );


// ============================================================
// START
// ============================================================

loadUsers();