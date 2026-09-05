const urlParams =
new URLSearchParams(window.location.search);

const qrToken =
urlParams.get("token");

const loading =
document.getElementById("loading");

const verificationResult =
document.getElementById(
"verificationResult"
);

const verificationError =
document.getElementById(
"verificationError"
);

const resultStatus =
document.getElementById(
"resultStatus"
);

const medicineName =
document.getElementById(
"medicineName"
);

const serialNumber =
document.getElementById(
"serialNumber"
);

const batchNumber =
document.getElementById(
"batchNumber"
);

const expiryDate =
document.getElementById(
"expiryDate"
);

const verificationMessage =
document.getElementById(
"verificationMessage"
);

const lifecycleSection =
document.getElementById(
"lifecycleSection"
);

const lifecycleTimeline =
document.getElementById(
"lifecycleTimeline"
);

// ============================================================
// DISPLAY LIFECYCLE
// ============================================================

function displayLifecycle(events) {


if (
    !events ||
    events.length === 0
) {

    lifecycleSection.style.display =
        "block";

    lifecycleTimeline.innerHTML =
        `<p>
            No lifecycle events recorded yet.
        </p>`;

    return;
}


lifecycleSection.style.display =
    "block";


lifecycleTimeline.innerHTML =
    "";


events.forEach(
    function (event, index) {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "public-lifecycle-item";


        const timestamp =
            event.timestamp
                ? new Date(
                    event.timestamp
                ).toLocaleString()
                : "Unknown time";


        item.innerHTML = `

            <div class="lifecycle-dot">
                ${index + 1}
            </div>

            <div class="lifecycle-content">

                <h3>
                    ${event.event_type}
                </h3>

                <p>
                    <strong>
                        Location:
                    </strong>

                    ${event.location ||
                    "Not specified"}
                </p>

                <p>
                    <strong>
                        Time:
                    </strong>

                    ${timestamp}
                </p>

                ${
                    event.notes
                    ?
                    `
                    <p>
                        <strong>
                            Notes:
                        </strong>

                        ${event.notes}
                    </p>
                    `
                    :
                    ""
                }

            </div>

        `;


        lifecycleTimeline.appendChild(
            item
        );


        // Add arrow between events

        if (
            index <
            events.length - 1
        ) {

            const arrow =
                document.createElement(
                    "div"
                );


            arrow.className =
                "lifecycle-arrow";


            arrow.textContent =
                "↓";


            lifecycleTimeline.appendChild(
                arrow
            );

        }

    }
);


}

// ============================================================
// VERIFY MEDICINE
// ============================================================

async function verifyMedicine() {


if (!qrToken) {

    loading.style.display =
        "none";

    verificationError.style.display =
        "block";

    return;
}


try {

    const response =
        await fetch(
            `${API_URL}/verify/${qrToken}`
        );


    const data =
        await response.json();


    loading.style.display =
        "none";


    // ====================================================
    // INVALID
    // ====================================================

    if (
        data.result === "INVALID"
    ) {

        verificationError.style.display =
            "block";

        return;
    }


    // ====================================================
    // SHOW RESULT
    // ====================================================

    verificationResult.style.display =
        "block";


    medicineName.textContent =
        data.medicine_name ||
        "Unknown";


    serialNumber.textContent =
        data.serial_number ||
        "Unknown";


    batchNumber.textContent =
        data.batch_number ||
        "Unknown";


    expiryDate.textContent =
        data.expiry_date ||
        "Unknown";


    verificationMessage.textContent =
        data.message ||
        "";


    // ====================================================
    // STATUS
    // ====================================================

    if (
        data.result === "AUTHENTIC"
    ) {

        resultStatus.textContent =
            "✓ AUTHENTIC MEDICINE";

        resultStatus.className =
            "verification-authentic";

    }

    else if (
        data.result === "EXPIRED"
    ) {

        resultStatus.textContent =
            "⚠ EXPIRED MEDICINE";

        resultStatus.className =
            "verification-expired";

    }

    else if (
        data.result === "RECALLED"
    ) {

        resultStatus.textContent =
            "⚠ RECALLED MEDICINE";

        resultStatus.className =
            "verification-recalled";

    }

    else {

        resultStatus.textContent =
            "✕ INVALID MEDICINE";

        resultStatus.className =
            "verification-invalid";

    }


    // ====================================================
    // LIFECYCLE
    // ====================================================

    displayLifecycle(
        data.lifecycle
    );


}

catch (error) {

    console.error(
        "Verification error:",
        error
    );


    loading.style.display =
        "none";


    verificationError.style.display =
        "block";

}


}

// ============================================================
// START
// ============================================================

verifyMedicine();