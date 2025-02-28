import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Debug check: Verify credentials are loaded
console.log("✅ Loaded Credentials:", `"${process.env.GENESIS_USERNAME}"`, `"${process.env.GENESIS_PASSWORD}"`);

const username = process.env.GENESIS_USERNAME;
const password = process.env.GENESIS_PASSWORD;

// API URLs
const API_URLS = [
    `https://www-genesis.destatis.de/genesisWS/rest/2020/data/table?username=${username}&password=${password}&name=61111-0006&area=all&compress=false&transpose=false&startyear=2020&endyear=2024&language=en&format=json&classifyingvariable1=CC13B1&classifyingkey1=CC13-65B&classifyingvariable2=MONAT&classifyingkey2=MONAT01,MONAT09`,
    `https://www-genesis.destatis.de/genesisWS/rest/2020/data/table?username=${username}&password=${password}&name=61111-0006&area=all&compress=false&transpose=false&startyear=2020&endyear=2024&language=en&format=json&classifyingvariable1=CC13Z1&classifyingkey1=CC13-0451010000,CC13-0452103000,CC13-0453001100&classifyingvariable2=MONAT&classifyingkey2=MONAT01,MONAT09`
];

// Function to fetch data and return only parsed information
const fetchData = async (url) => {
    try {
        console.log(`\n🔍 Fetching data from: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`❌ HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Data fetched successfully!");

        // Return parsed data, or empty array if API fails
        return data.Object && data.Object.Content ? parseTableData(data.Object.Content) : [];

    } catch (error) {
        console.error(`\n❌ Error fetching data from ${url}:`, error.message);
        return [];
    }
};

// Function to parse and extract useful information from the text content
const parseTableData = (textContent) => {
    if (!textContent) return [];

    const lines = textContent.split("\n");
    const extractedData = [];

    lines.forEach((line) => {
        const parts = line.split(";");

        if (parts.length >= 4) {
            const sector = parts[0].trim();
            const year = parts[1].trim();
            const month = parts[2].trim();
            let indexValue = parts[3].trim();

            if (indexValue.includes(",")) {
                indexValue = indexValue.replace(",", ".");
            }

            const index = parseFloat(indexValue);

            if (!isNaN(index)) {
                extractedData.push({ sector, year, month, index });
            }
        }
    });

    return extractedData;
};

// Main function to fetch from both APIs and save only parsed data
const fetchAndSaveData = async () => {
    console.log("\n🚀 Starting API data fetch...");

    const [data1, data2] = await Promise.all(API_URLS.map(fetchData));

    // Stop if no valid data is found
    if (data1.length === 0 && data2.length === 0) {
        console.error("\n❌ No valid data received. JSON file was not updated.");
        return;
    }

    // Combine only parsed data
    const combinedData = {
        source1: data1,
        source2: data2
    };

    // Save only structured parsed data to a JSON file
    fs.writeFileSync("destatis_parsed_data.json", JSON.stringify(combinedData, null, 4));
    console.log("\n📂 Data saved to destatis_parsed_data.json");

    // Display preview of extracted data in console
    console.log("\n📊 Extracted Data Preview:\n", JSON.stringify(combinedData, null, 4));
};

// Run the fetch and save process
fetchAndSaveData();
