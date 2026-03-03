import fs from 'fs';
import { ROAD_EDGES, CITIES } from '../src/data/turkeyGraph.ts';

const cityMap = new Map(CITIES.map(c => [c.id, { lat: c.lat, lng: c.lng }]));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const outputPath = './src/data/routeGeometries_v2.json';

async function fetchGeometry(fromId, toId) {
    const from = cityMap.get(fromId);
    const to = cityMap.get(toId);
    if (!from || !to) return null;

    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            return { coords: data.routes[0].geometry.coordinates, distance: data.routes[0].distance };
        }
    } catch (e) {
        console.error(`Failed to fetch ${fromId} -> ${toId}:`, e.message);
    }
    return null;
}

async function main() {
    let geometries = {};
    try {
        geometries = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        console.log(`Loaded ${Object.keys(geometries).length} existing geometries`);
    } catch (e) { }

    console.log(`Starting to fetch geometries for ${ROAD_EDGES.length} edges...`);

    for (let i = 0; i < ROAD_EDGES.length; i++) {
        const edge = ROAD_EDGES[i];
        const k1 = `${edge.from}-${edge.to}`;
        const k2 = `${edge.to}-${edge.from}`;

        if (!geometries[k1] && !geometries[k2]) {
            console.log(`Fetching ${i + 1}/${ROAD_EDGES.length}: ${k1}`);
            const data = await fetchGeometry(edge.from, edge.to);
            if (data) {
                geometries[k1] = data;
                fs.writeFileSync(outputPath, JSON.stringify(geometries)); // Save progress
            }
            await delay(300);
        }
    }
    console.log(`\nSuccessfully cached ${Object.keys(geometries).length} route geometries + distances to ${outputPath}`);
}

main().catch(console.error);
