// ============================================================
// GET QR TOKEN FROM URL
// ============================================================

const urlParams =
    new URLSearchParams(window.location.search);

const qrToken =
    urlParams.get("token");


// ============================================================
// ELEMENTS
// ============================================================

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


// ============================================================
// VERIFY MEDICINE
// ============================================================

async function verifyMedicine() {

    // --------------------------------------------------------
    // CHECK TOKEN
    // --------------------------------------------------------

    if (!qrToken) {

        loading.style.display =
            "none";

        verificationError.style.display =
            "block";

        return;
    }


    // --------------------------------------------------------
    // CALL BACKEND
    // --------------------------------------------------------

    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/verify/${qrToken}`
            );


        const data =
            await response.json();


        // ----------------------------------------------------
        // HIDE LOADING
        // ----------------------------------------------------

        loading.style.display =
            "none";


        // ----------------------------------------------------
        // INVALID
        // ----------------------------------------------------

        if (
            data.result === "INVALID"
        ) {

            verificationError.style.display =
                "block";

            return;
        }


        // ----------------------------------------------------
        // SHOW RESULT
        // ----------------------------------------------------

        verificationResult.style.display =
            "block";


        medicineName.textContent =
            data.medicine_name || "Unknown";


        serialNumber.textContent =
            data.serial_number || "Unknown";


        batchNumber.textContent =
            data.batch_number || "Unknown";


        expiryDate.textContent =
            data.expiry_date || "Unknown";


        verificationMessage.textContent =
            data.message || "";


        // ----------------------------------------------------
        // RESULT STATUS
        // ----------------------------------------------------

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


    } catch (error) {

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
// START VERIFICATION
// ============================================================

verifyMedicine();