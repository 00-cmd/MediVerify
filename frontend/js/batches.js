const token = localStorage.getItem("token");


// ============================================================
// CHECK LOGIN
// ============================================================

if (!token) {
    window.location.href = "index.html";
}


// ============================================================
// LOAD MEDICINES INTO DROPDOWN
// ============================================================

async function loadMedicines() {

    const medicineSelect =
        document.getElementById("medicine_id");

    try {

        const response = await fetch(
            `${API_URL}/medicines/`,
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


        medicines.forEach(function (medicine) {

            const option =
                document.createElement("option");

            option.value = medicine.id;

            option.textContent =
                `${medicine.name} - ${medicine.manufacturer_name}`;

            medicineSelect.appendChild(option);

        });


    } catch (error) {

        console.error(error);

        medicineSelect.innerHTML =
            `<option value="">
                Could not load medicines
            </option>`;
    }
}


// ============================================================
// LOAD BATCHES
// ============================================================

async function loadBatches() {

    const batchList =
        document.getElementById("batchList");


    try {

        const response = await fetch(
            `${API_URL}/batches/`,
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

            throw new Error("Failed to load batches");
        }


        const batches = await response.json();


        // ----------------------------------------------------
        // NO BATCHES
        // ----------------------------------------------------

        if (batches.length === 0) {

            batchList.innerHTML =
                "<p>No batches created yet.</p>";

            return;
        }


        // ----------------------------------------------------
        // CLEAR OLD LIST
        // ----------------------------------------------------

        batchList.innerHTML = "";


        // ----------------------------------------------------
        // CREATE BATCH CARDS
        // ----------------------------------------------------

        batches.forEach(function (batch) {

            const card =
                document.createElement("div");

            card.className = "activity-card";


            card.innerHTML = `

                <div>

                    <strong>
                        ${batch.batch_number}
                    </strong>

                    <p>
                        Medicine ID:
                        ${batch.medicine_id}
                    </p>

                    <p>
                        Manufacturing:
                        ${batch.manufacturing_date}
                    </p>

                    <p>
                        Expiry:
                        ${batch.expiry_date}
                    </p>


                    <!-- SERIALIZATION BUTTON -->

                    <button
                        class="serialize-btn"
                    >
                        Serialize Medicines
                    </button>


                    <!-- QR BUTTON -->

                    <button
                        class="qr-btn"
                    >
                        Generate QR Codes
                    </button>


                    <!-- SERIALIZATION / QR MESSAGE -->

                    <div
                        class="serialization-area"
                        id="serialization-${batch.id}"
                    ></div>

                </div>


                <span>
                    ${batch.status}
                </span>

            `;


            batchList.appendChild(card);


            // ------------------------------------------------
            // SERIALIZE BUTTON
            // ------------------------------------------------

            const serializeButton =
                card.querySelector(".serialize-btn");


            serializeButton.addEventListener(
                "click",
                function () {

                    serializeBatch(batch.id);

                }
            );


            // ------------------------------------------------
            // QR BUTTON
            // ------------------------------------------------

            const qrButton =
                card.querySelector(".qr-btn");


            qrButton.addEventListener(
                "click",
                function () {

                    generateQRCodes(batch.id);

                }
            );

        });


    } catch (error) {

        console.error(error);

        batchList.innerHTML =
            "<p>Could not load batches.</p>";
    }
}


// ============================================================
// SHOW SERIALIZATION FORM
// ============================================================

function serializeBatch(batchId) {

    const area =
        document.getElementById(
            `serialization-${batchId}`
        );


    area.innerHTML = `

        <div class="serialization-form">

            <label>
                Number of medicines
            </label>


            <input
                type="number"
                id="quantity-${batchId}"
                min="1"
                placeholder="Example: 100"
            />


            <button
                class="generate-serial-btn"
            >
                Generate Serial Numbers
            </button>

        </div>

    `;


    // --------------------------------------------------------
    // GENERATE SERIAL BUTTON
    // --------------------------------------------------------

    const button =
        area.querySelector(".generate-serial-btn");


    button.addEventListener(
        "click",
        function () {

            submitSerialization(batchId);

        }
    );
}


// ============================================================
// SUBMIT SERIALIZATION
// ============================================================

async function submitSerialization(batchId) {

    const quantityInput =
        document.getElementById(
            `quantity-${batchId}`
        );


    const quantity =
        Number(quantityInput.value);


    // --------------------------------------------------------
    // VALIDATE QUANTITY
    // --------------------------------------------------------

    if (!quantity || quantity < 1) {

        alert(
            "Please enter a valid quantity."
        );

        return;
    }


    const area =
        document.getElementById(
            `serialization-${batchId}`
        );


    area.innerHTML =
        "<p>Generating serial numbers...</p>";


    try {

        const response = await fetch(

            `${API_URL}/batches/${batchId}/serialize`,

            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    quantity: quantity
                })
            }
        );


        const data =
            await response.json();


        // ----------------------------------------------------
        // ERROR
        // ----------------------------------------------------

        if (!response.ok) {

            if (response.status === 401) {

                localStorage.removeItem("token");

                window.location.href = "index.html";

                return;
            }


            area.innerHTML = `
                <p>
                    ${data.detail || "Serialization failed."}
                </p>
            `;

            return;
        }


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        area.innerHTML = `

            <p>
                <strong>
                    Serialization successful!
                </strong>
            </p>

            <p>
                ${data.count || quantity}
                medicines serialized.
            </p>

            <p>
                Serial numbers have been generated.
            </p>

        `;


        // Reload batches

        loadBatches();


    } catch (error) {

        console.error(error);

        area.innerHTML =
            "<p>Could not connect to the server.</p>";
    }
}


// ============================================================
// GENERATE QR CODES
// ============================================================

async function generateQRCodes(batchId) {

    const area =
        document.getElementById(
            `serialization-${batchId}`
        );


    area.innerHTML =
        "<p>Generating QR codes...</p>";


    try {

        const response = await fetch(

            `${API_URL}/batches/${batchId}/generate-qr`,

            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        // ----------------------------------------------------
        // ERROR
        // ----------------------------------------------------

        if (!response.ok) {

            if (response.status === 401) {

                localStorage.removeItem("token");

                window.location.href = "index.html";

                return;
            }


            area.innerHTML = `
                <p>
                    ${data.detail || "QR generation failed."}
                </p>
            `;

            return;
        }


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        area.innerHTML = `

            <p>
                <strong>
                    QR codes generated successfully!
                </strong>
            </p>

            <p>
                ${data.count || "QR codes"}
                generated.
            </p>

        `;


    } catch (error) {

        console.error(error);

        area.innerHTML =
            "<p>Could not connect to the server.</p>";
    }
}


// ============================================================
// CREATE BATCH
// ============================================================

document.getElementById("batchForm").addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const message =
            document.getElementById("batchMessage");


        const medicine_id =
            document.getElementById(
                "medicine_id"
            ).value;


        const batch_number =
            document.getElementById(
                "batch_number"
            ).value;


        const manufacturing_date =
            document.getElementById(
                "manufacturing_date"
            ).value;


        const expiry_date =
            document.getElementById(
                "expiry_date"
            ).value;


        message.textContent =
            "Creating batch...";


        try {

            const response = await fetch(

                `${API_URL}/batches/`,

                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        medicine_id:
                            Number(medicine_id),

                        batch_number:
                            batch_number,

                        manufacturing_date:
                            manufacturing_date,

                        expiry_date:
                            expiry_date

                    })
                }
            );


            const data =
                await response.json();


            // ------------------------------------------------
            // ERROR
            // ------------------------------------------------

            if (!response.ok) {

                if (response.status === 401) {

                    localStorage.removeItem("token");

                    window.location.href = "index.html";

                    return;
                }


                message.textContent =
                    data.detail ||
                    "Failed to create batch.";

                return;
            }


            // ------------------------------------------------
            // SUCCESS
            // ------------------------------------------------

            message.textContent =
                "Batch created successfully!";


            document
                .getElementById("batchForm")
                .reset();


            loadBatches();


        } catch (error) {

            console.error(error);

            message.textContent =
                "Could not connect to the server.";
        }

    }
);


// ============================================================
// LOGOUT
// ============================================================

document.getElementById("logoutBtn").addEventListener(
    "click",
    function () {

        localStorage.removeItem("token");

        window.location.href = "index.html";

    }
);


// ============================================================
// INITIAL LOAD
// ============================================================

loadMedicines();

loadBatches();