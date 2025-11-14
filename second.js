//
// second.js - for the results page
//

let chart = null;

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const barcode = params.get('barcode');
    const leftDiv = document.querySelector(".left");

    if (barcode) {
        try {
            const data = await generateNutritionData(barcode);
            displayProductInfo(data);
        } catch (error) {
            console.error("Error fetching or displaying product data:", error.message);
            leftDiv.innerHTML = `<h3>Product not found</h3><p>${error.message}</p>`;
        }
    } else {
        leftDiv.innerHTML = "<h3>No product specified.</h3>";
    }
});

function displayProductInfo(data) {
    const leftDiv = document.querySelector(".left");
    
    // ✅ NEW: Clear the .left div and rebuild it with the image and title
    leftDiv.innerHTML = ''; // Clear the "Scanned Product" default text

    // Create and add the product image if a URL exists
    if (data.imageUrl) {
        const productImg = document.createElement('img');
        productImg.src = data.imageUrl;
        productImg.alt = data.productName; // Important for accessibility
        productImg.classList.add('product-image'); // Add a class for styling
        
        // Hide the image element if the link is broken
        productImg.onerror = () => {
            productImg.style.display = 'none';
        };
        
        leftDiv.appendChild(productImg);
    }
    
    // Create and add the product name heading
    const productNameH3 = document.createElement('h3');
    productNameH3.textContent = data.productName;
    leftDiv.appendChild(productNameH3);
    
    // --- The rest of the function remains the same ---

    // Display the nutrition table
    document.querySelector(".table-box").innerHTML = `<h3>Nutrition Table</h3>${data.tableHTML}`;
    
    // Create the nutrition chart
    const ctx = document.getElementById('nutritionChart').getContext('2d');
    if (chart) {
        chart.destroy();
    }
    chart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Sugars", "Fat", "Carbs", "Protein", "Salt"],
            datasets: [{
                data: data.chartData,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
        }
    });
}