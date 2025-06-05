/**
 * Script to convert ESRI GeoJSON to standard GeoJSON format
 * and filter to only Musanze district data
 *
 * Run with:
 * node scripts/convert-rwanda-geo.js
 */

const fs = require('fs');
const path = require('path');

// Path to the original ESRI JSON file
const INPUT_FILE = path.join(__dirname, '../public/rwanda_geo.json');
// Path for the optimized output file
const OUTPUT_FILE = path.join(__dirname, '../public/musanze_geo.json');
// District to filter for
const TARGET_DISTRICT = 'Musanze';

/**
 * Converts ESRI JSON format to standard GeoJSON format
 */
function convertEsriToGeoJSON(esriData) {
    if (!esriData || !esriData.features) {
        return null;
    }

    return {
        type: "FeatureCollection",
        features: esriData.features.map((f) => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [f.geometry.x, f.geometry.y],
            },
            properties: f.attributes,
        })),
    };
}

/**
 * Filters GeoJSON to only include features in the target district
 */
function filterByDistrict(geoJSON, district) {
    if (!geoJSON || !geoJSON.features) {
        return null;
    }

    return {
        type: "FeatureCollection",
        features: geoJSON.features.filter((feature) =>
            feature.properties.ADM2_EN &&
            feature.properties.ADM2_EN.toLowerCase() === district.toLowerCase()
        ),
    };
}

// Main execution
try {
    console.log(`Reading ESRI GeoJSON file from ${INPUT_FILE}...`);

    // Read the input file
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const esriData = JSON.parse(rawData);

    // Convert to standard GeoJSON
    console.log('Converting to standard GeoJSON format...');
    const standardGeoJSON = convertEsriToGeoJSON(esriData);

    // Filter to only Musanze district
    console.log(`Filtering to only ${TARGET_DISTRICT} district...`);
    const filteredGeoJSON = filterByDistrict(standardGeoJSON, TARGET_DISTRICT);

    // Calculate size reduction
    const originalFeatureCount = standardGeoJSON.features.length;
    const filteredFeatureCount = filteredGeoJSON.features.length;

    console.log(`Original feature count: ${originalFeatureCount}`);
    console.log(`Filtered feature count: ${filteredFeatureCount}`);
    console.log(`Reduced by: ${originalFeatureCount - filteredFeatureCount} features (${((originalFeatureCount - filteredFeatureCount) / originalFeatureCount * 100).toFixed(2)}%)`);

    // Save the optimized file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filteredGeoJSON, null, 2));

    // Calculate file size reduction
    const originalSize = Buffer.byteLength(rawData, 'utf8');
    const optimizedSize = Buffer.byteLength(JSON.stringify(filteredGeoJSON), 'utf8');

    console.log(`Original file size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Optimized file size: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Size reduction: ${((originalSize - optimizedSize) / originalSize * 100).toFixed(2)}%`);

    console.log(`Successfully saved optimized GeoJSON to ${OUTPUT_FILE}`);
} catch (error) {
    console.error('Error processing GeoJSON file:', error);
}