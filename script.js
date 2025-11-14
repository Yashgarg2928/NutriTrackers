//
// Final Merged Script (for all pages)
//

//
// Page-Specific Logic
// Runs after the HTML document has been fully loaded.
//
document.addEventListener('DOMContentLoaded', () => {

    // --- LOGIC FOR THE INDEX PAGE (index.html) ---
    const searchButton = document.querySelector("#search-button");
    const productInput = document.querySelector("#product-input");

    if (searchButton && productInput) { // This code will only run on index.html
        searchButton.addEventListener("click", async () => {
            const productName = productInput.value;
            if (!productName) {
                alert("Please enter a product name to search.");
                return;
            }

            try {
                console.log(`Searching for product: ${productName}`);
                const barcode = await searchProductByName(productName);
                // Redirect to the results page with the found barcode
                window.location.href = `sec.html?barcode=${barcode}`;
            } catch (err) {
                console.error("An error occurred during product search:", err.message);
                alert(err.message); // Show user-friendly error
            }
        });
    }

    // --- LOGIC FOR THE SCANNER PAGE (scanner.html) ---
    const scanButton = document.querySelector("#scan-button");
    const videoElement = document.querySelector("#video"); // Element that only exists on scanner.html

    if (scanButton && videoElement) { // This code will only run on scanner.html
        const codeReader = new ZXing.BrowserMultiFormatReader();
        
        startScanner(codeReader)
            .then(barcode => {
                // After scanning, redirect to the results page
                window.location.href = `sec.html?barcode=${barcode}`;
            })
            .catch(err => {
                console.error("An error occurred during scanning:", err.message);
                alert(`Scan Error: ${err.message}`);
            });
    }
});


//
// Shared Functions (can be called from any page)
//

/**
 * Initiates the camera and resolves with a barcode when one is found.
 * @param {ZXing.BrowserMultiFormatReader} codeReader - An instance of the ZXing reader.
 * @returns {Promise<string>} A promise that resolves with the barcode string.
 */
function startScanner(codeReader) {
    return new Promise(async (resolve, reject) => {
        try {
            const devices = await codeReader.listVideoInputDevices();
            if (devices.length === 0) {
                return reject("No camera found");
            }

            const cameraId = devices[0].deviceId;
            console.log("Scanner starting...");

            codeReader.decodeFromVideoDevice(cameraId, 'video', (result, err) => {
                if (result) {
                    console.log("Barcode found:", result.text);
                    codeReader.reset(); // Stop the camera
                    resolve(result.text); // Success!
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    reject(err); // Handle errors
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Searches for a product by name using the Open Food Facts API.
 * @param {string} productName - The name of the product to search for.
 * @returns {Promise<string>} A promise that resolves with the barcode of the first found product.
 */
async function searchProductByName(productName) {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(productName)}&search_simple=1&action=process&json=1`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.products && data.products.length > 0) {
        return data.products[0].code; // Return the barcode of the first result
    } else {
        throw new Error(`No products found for "${productName}". Please try another search term.`);
    }
}


/**
 * Fetches and processes nutrition data for a given barcode.
 * This is used by the results page (sec.html).
 * @param {string} barcode - The product barcode.
 * @returns {Promise<object>} A promise that resolves with the processed product data.
 */
async function generateNutritionData(barcode) {
    if (!barcode) return;

    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.product) {
        throw new Error("Product data not found in the database.");
    }

    const product = data.product;
    const n = product.nutriments || {};

    // CO2 Calculation (self-invoking function)
    const co2 = (() => {
        try {
            if (product.ecoscore_data?.agribalyse?.co2) return Number(product.ecoscore_data.agribalyse.co2);
            if (product.agribalyse?.co2) return Number(product.agribalyse.co2);
        } catch {}
        const categories = (product.categories || "").toLowerCase();
        if (categories.includes("meat")) return 2.5;
        if (categories.includes("cheese")) return 1.2;
        if (categories.includes("fish")) return 1.5;
        const fat = Number(n.fat_100g || 0);
        const protein = Number(n.proteins_100g || 0);
        return Number((0.08 + protein * 0.02 + fat * 0.03).toFixed(2));
    })();

    // Eco-Points Calculation
    let ecoPoints = 5;
    if (co2 < 0.1) ecoPoints += 20;
    else if (co2 < 0.5) ecoPoints += 10;
    else if (co2 < 1.0) ecoPoints += 6;
    else ecoPoints += 2;
    const grade = (product.nutrition_grade_fr || "z").toLowerCase();
    if (grade === "a") ecoPoints += 10;
    else if (grade === "b") ecoPoints += 6;
    else if (grade === "c") ecoPoints += 2;

    return {
        productName: product.product_name || "Unknown Product",
        // ✅ NEW: Add the image URL to the returned object
        imageUrl: product.image_front_url || product.image_url, 
        tableHTML: `
            <table>
                <tr><th>Nutrient</th><th>Amount / 100g</th></tr>
                <tr><td>Energy</td><td>${n["energy-kcal_100g"] ?? "—"} kcal</td></tr>
                <tr><td>Fat</td><td>${n.fat_100g ?? "—"} g</td></tr>
                <tr><td>Saturated Fat</td><td>${n["saturated-fat_100g"] ?? "—"} g</td></tr>
                <tr><td>Carbs</td><td>${n.carbohydrates_100g ?? "—"} g</td></tr>
                <tr><td>Sugars</td><td>${n.sugars_100g ?? "—"} g</td></tr>
                <tr><td>Protein</td><td>${n.proteins_100g ?? "—"} g</td></tr>
                <tr><td>Salt</td><td>${n.salt_100g ?? "—"} g</td></tr>
                <tr><td>CO₂ Emission</td><td>${co2} kg / 100g</td></tr>
                <tr><td>Eco-Points Earned</td><td>${ecoPoints}</td></tr>
            </table>`,
        chartData: [n.sugars_100g||0, n.fat_100g||0, n.carbohydrates_100g||0, n.proteins_100g||0, n.salt_100g||0],
    };
}