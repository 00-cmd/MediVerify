const token = localStorage.getItem("token");


// ------------------------------------------------------------
// CHECK LOGIN
// ------------------------------------------------------------

if (!token) {
    window.location.href = "index.html";
}


// ------------------------------------------------------------
// LOAD MEDICINES
// ------------------------------------------------------------

async function loadMedicines() {

    const medicineList = document.getElementById("medicineList");

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/medicines/",
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (!response.ok) {

            if (response.status === 401) {

                localStorage.removeItem("token");

                window.location.href = "index.html";

                return;
            }

            throw new Error("Failed to load medicines");
        }


        const medicines = await response.json();


        // No medicines

        if (medicines.length === 0) {

            medicineList.innerHTML =
                "<p>No medicines registered yet.</p>";

            return;
        }


        // Create medicine cards

        medicineList.innerHTML = "";


        medicines.forEach(function (medicine) {

            const card = document.createElement("div");

            card.className = "activity-card";


            card.innerHTML = `
                <div>
                    <strong>${medicine.name}</strong>

                    <p>
                        Manufacturer:
                        ${medicine.manufacturer_name}
                    </p>

                    <p>
                        Composition:
                        ${medicine.composition || "Not provided"}
                    </p>
                </div>

                <span>
                    ID: ${medicine.id}
                </span>
            `;


            medicineList.appendChild(card);

        });


    } catch (error) {

        console.error(error);

        medicineList.innerHTML =
            "<p>Could not load medicines.</p>";
    }
}


// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

document.getElementById("logoutBtn").addEventListener(
    "click",
    function () {

        localStorage.removeItem("token");

        window.location.href = "index.html";

    }
);


// ------------------------------------------------------------
// INITIAL LOAD
// ------------------------------------------------------------

loadMedicines();


// ------------------------------------------------------------
// CREATE MEDICINE
// ------------------------------------------------------------

document.getElementById("medicineForm").addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const message =
            document.getElementById("medicineMessage");

        const name =
            document.getElementById("name").value;

        const manufacturer_name =
            document.getElementById("manufacturer_name").value;

        const composition =
            document.getElementById("composition").value;

        const description =
            document.getElementById("description").value;


        message.textContent = "Creating medicine...";


        try {

            const response = await fetch(
                "http://127.0.0.1:8000/medicines/",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        name: name,
                        manufacturer_name: manufacturer_name,
                        composition: composition || null,
                        description: description || null
                    })
                }
            );


            const data = await response.json();


            if (!response.ok) {

                if (response.status === 401) {

                    localStorage.removeItem("token");

                    window.location.href = "index.html";

                    return;
                }

                message.textContent =
                    data.detail || "Failed to create medicine.";

                return;
            }


            message.textContent =
                "Medicine created successfully!";


            // Clear form

            document.getElementById("medicineForm").reset();


            // Reload medicine list

            loadMedicines();


        } catch (error) {

            console.error(error);

            message.textContent =
                "Could not connect to the server.";
        }

    }
);