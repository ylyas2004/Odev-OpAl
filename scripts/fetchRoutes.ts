// Script to pre-fetch routing geometries from OSRM and save to a JSON file.
import fs from 'fs';
import { ROAD_EDGES, CITIES } from '../src/data/turkeyGraph.ts';

// Extract coordinates from CITIES
const cityMap = new Map(CITIES.map(c => [c.id, { lat: c.lat, lng: c.lng }]));

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGeometry(fromId, toId) {
    const from = cityMap.get(fromId);
    const to = cityMap.get(toId);
    if (!from || !to) return null;

    // OSRM expects lon,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            return data.routes[0].geometry.coordinates; // Array of [lon, lat] arrays
        }
    } catch (e) {
        console.error(`Failed to fetch ${fromId} -> ${toId}:`, e.message);
    }
    return null;
}

async function main() {
    console.log(`Starting to fetch geometries for ${ROAD_EDGES.length} edges...`);
    const geometries = {};

    for (let i = 0; i < ROAD_EDGES.length; i++) {
        const edge = ROAD_EDGES[i];
        // Create an undirected key
        const k1 = `${edge.from}-${edge.to}`;
        const k2 = `${edge.to}-${edge.from}`;

        if (!geometries[k1] && !geometries[k2]) {
            console.log(`Fetching ${i + 1}/${ROAD_EDGES.length}: ${k1}`);
            const coords = await fetchGeometry(edge.from, edge.to);
            if (coords) {
                geometries[k1] = coords;
            }
            // Be nice to the public demo server
            await delay(300);
        }
    }

    const outputPath = './src/data/routeGeometries.json';
    fs.writeFileSync(outputPath, JSON.stringify(geometries));
    console.log(`\nSuccessfully cached ${Object.keys(geometries).length} route geometries to ${outputPath}`);
}

main().catch(console.error);
