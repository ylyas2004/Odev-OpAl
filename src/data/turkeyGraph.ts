// Turkey major cities with lat/lng coordinates and road distance edges
// Distances in kilometers based on approximate road distances

export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RoadEdge {
  from: string;
  to: string;
  distance: number; // km
}

// Import real road geometries to override static distances
import rawRouteGeometries from './routeGeometries_v2.json';
type RouteData = { coords: number[][]; distance: number };
const routeGeometries = rawRouteGeometries as Record<string, RouteData>;

export const CITIES: City[] = [
  { id: 'IST', name: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { id: 'ANK', name: 'Ankara', lat: 39.9334, lng: 32.8597 },
  { id: 'IZM', name: 'İzmir', lat: 38.4189, lng: 27.1287 },
  { id: 'BRS', name: 'Bursa', lat: 40.1826, lng: 29.0665 },
  { id: 'ADN', name: 'Adana', lat: 37.0, lng: 35.3213 },
  { id: 'KON', name: 'Konya', lat: 37.8746, lng: 32.4932 },
  { id: 'ANT', name: 'Antalya', lat: 36.8969, lng: 30.7133 },
  { id: 'SAM', name: 'Samsun', lat: 41.2867, lng: 36.33 },
  { id: 'GAZ', name: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
  { id: 'KOC', name: 'Kocaeli', lat: 40.7654, lng: 29.9408 },
  { id: 'MER', name: 'Mersin', lat: 36.8, lng: 34.6333 },
  { id: 'DYB', name: 'Diyarbakır', lat: 37.9144, lng: 40.2306 },
  { id: 'HAT', name: 'Hatay', lat: 36.4018, lng: 36.3498 },
  { id: 'MAN', name: 'Manisa', lat: 38.6191, lng: 27.4289 },
  { id: 'KAY', name: 'Kayseri', lat: 38.7312, lng: 35.4787 },
  { id: 'ESK', name: 'Eskişehir', lat: 39.7767, lng: 30.5206 },
  { id: 'SAN', name: 'Şanlıurfa', lat: 37.1591, lng: 38.7969 },
  { id: 'MAL', name: 'Malatya', lat: 38.3552, lng: 38.3095 },
  { id: 'ELA', name: 'Elazığ', lat: 38.6810, lng: 39.2264 },
  { id: 'ERZ', name: 'Erzurum', lat: 39.9055, lng: 41.2658 },
  { id: 'TRZ', name: 'Trabzon', lat: 41.005, lng: 39.7178 },
  { id: 'VAN', name: 'Van', lat: 38.4891, lng: 43.4089 },
  { id: 'BAL', name: 'Balıkesir', lat: 39.6484, lng: 27.8826 },
  { id: 'TEK', name: 'Tekirdağ', lat: 40.9781, lng: 27.5115 },
  { id: 'DEN', name: 'Denizli', lat: 37.7765, lng: 29.0864 },
  { id: 'AFY', name: 'Afyonkarahisar', lat: 38.7507, lng: 30.5567 },
  { id: 'KUT', name: 'Kütahya', lat: 39.4242, lng: 29.9833 },
  { id: 'AYD', name: 'Aydın', lat: 37.8444, lng: 27.8458 },
  { id: 'MUG', name: 'Muğla', lat: 37.2154, lng: 28.3639 },
  { id: 'MAR', name: 'Mardin', lat: 37.3212, lng: 40.7245 },
  { id: 'KAH', name: 'Kahramanmaraş', lat: 37.5858, lng: 36.9371 },
  { id: 'OSM', name: 'Osmaniye', lat: 37.0742, lng: 36.2461 },
  { id: 'NIL', name: 'Niğde', lat: 37.9667, lng: 34.6833 },
  { id: 'NEV', name: 'Nevşehir', lat: 38.6939, lng: 34.6857 },
  { id: 'AKS', name: 'Aksaray', lat: 38.3687, lng: 34.0370 },
  { id: 'SIV', name: 'Sivas', lat: 39.7477, lng: 37.0179 },
  { id: 'TOK', name: 'Tokat', lat: 40.3167, lng: 36.55 },
  { id: 'AMA', name: 'Amasya', lat: 40.6499, lng: 35.8353 },
  { id: 'CAR', name: 'Çankırı', lat: 40.6013, lng: 33.6134 },
  { id: 'KRK', name: 'Kırıkkale', lat: 39.8468, lng: 33.5153 },
  { id: 'COR', name: 'Çorum', lat: 40.5506, lng: 34.9556 },
  { id: 'YOZ', name: 'Yozgat', lat: 39.82, lng: 34.8147 },
  { id: 'KRS', name: 'Kırşehir', lat: 39.1425, lng: 34.1709 },
  { id: 'BOL', name: 'Bolu', lat: 40.7394, lng: 31.6061 },
  { id: 'ZON', name: 'Zonguldak', lat: 41.4561, lng: 31.7987 },
  { id: 'BAR', name: 'Bartın', lat: 41.6344, lng: 32.3375 },
  { id: 'KAS', name: 'Kastamonu', lat: 41.3887, lng: 33.7827 },
  { id: 'SIN', name: 'Sinop', lat: 42.0231, lng: 35.1531 },
  { id: 'ORS', name: 'Ordu', lat: 40.9862, lng: 37.8797 },
  { id: 'GIR', name: 'Giresun', lat: 40.9128, lng: 38.3895 },
  { id: 'RIZ', name: 'Rize', lat: 41.0201, lng: 40.5234 },
  { id: 'ART', name: 'Artvin', lat: 41.1828, lng: 41.8183 },
  { id: 'ARD', name: 'Ardahan', lat: 41.1105, lng: 42.7022 },
  { id: 'KRS2', name: 'Kars', lat: 40.6013, lng: 43.0975 },
  { id: 'AGR', name: 'Ağrı', lat: 39.7191, lng: 43.0503 },
  { id: 'IGD', name: 'Iğdır', lat: 39.9167, lng: 44.0450 },
  { id: 'MUS', name: 'Muş', lat: 38.9462, lng: 41.7539 },
  { id: 'BIT', name: 'Bitlis', lat: 38.4002, lng: 42.1095 },
  { id: 'SII', name: 'Siirt', lat: 37.9333, lng: 41.9500 },
  { id: 'SRN', name: 'Şırnak', lat: 37.5164, lng: 42.4611 },
  { id: 'HAK', name: 'Hakkari', lat: 37.5744, lng: 43.7408 },
  { id: 'TUN', name: 'Tunceli', lat: 39.1079, lng: 39.5479 },
  { id: 'BNG', name: 'Bingöl', lat: 38.8853, lng: 40.4983 },
  { id: 'BUT', name: 'Burdur', lat: 37.7265, lng: 30.2917 },
  { id: 'ISP', name: 'Isparta', lat: 37.7648, lng: 30.5566 },
  { id: 'USK', name: 'Uşak', lat: 38.6823, lng: 29.4082 },
  { id: 'KRE', name: 'Karaman', lat: 37.1759, lng: 33.2287 },
  { id: 'ADY', name: 'Adıyaman', lat: 37.7648, lng: 38.2786 },
  { id: 'GAZ2', name: 'Antep Bölgesi', lat: 37.3, lng: 37.7 },
  { id: 'KLI', name: 'Kilis', lat: 36.7184, lng: 37.1212 },
  { id: 'KRB', name: 'Karabük', lat: 41.2061, lng: 32.6204 },
  { id: 'EDR', name: 'Edirne', lat: 41.6818, lng: 26.5623 },
  { id: 'KRK2', name: 'Kırklareli', lat: 41.7333, lng: 27.2167 },
  { id: 'CAN', name: 'Çanakkale', lat: 40.1553, lng: 26.4142 },
  { id: 'GAL', name: 'Yalova', lat: 40.6500, lng: 29.2667 },
  { id: 'NIT', name: 'Düzce', lat: 40.8438, lng: 31.1565 },
  { id: 'ELA2', name: 'Elâzığ (2)', lat: 38.5, lng: 39.4 },
];

// Road edges with distances in km
export const ROAD_EDGES: RoadEdge[] = [
  // Istanbul connections
  { from: 'IST', to: 'KOC', distance: 90 },
  { from: 'IST', to: 'TEK', distance: 140 },
  { from: 'IST', to: 'EDR', distance: 235 },
  { from: 'IST', to: 'GAL', distance: 60 },
  { from: 'IST', to: 'BRS', distance: 155 },
  { from: 'IST', to: 'KRK2', distance: 200 },

  // Ankara connections
  { from: 'ANK', to: 'ESK', distance: 235 },
  { from: 'ANK', to: 'KON', distance: 261 },
  { from: 'ANK', to: 'KAY', distance: 320 },
  { from: 'ANK', to: 'SIV', distance: 450 },
  { from: 'ANK', to: 'YOZ', distance: 258 },
  { from: 'ANK', to: 'KRS', distance: 210 },
  { from: 'ANK', to: 'CAR', distance: 135 },
  { from: 'ANK', to: 'KRK', distance: 78 },
  { from: 'ANK', to: 'BOL', distance: 200 },
  { from: 'ANK', to: 'COR', distance: 245 },
  { from: 'ANK', to: 'AMA', distance: 330 },

  // Bursa connections
  { from: 'BRS', to: 'KOC', distance: 100 },
  { from: 'BRS', to: 'BAL', distance: 115 },
  { from: 'BRS', to: 'ESK', distance: 150 },
  { from: 'BRS', to: 'KUT', distance: 105 },
  { from: 'BRS', to: 'CAN', distance: 165 },

  // İzmir connections
  { from: 'IZM', to: 'MAN', distance: 40 },
  { from: 'IZM', to: 'AYD', distance: 100 },
  { from: 'IZM', to: 'BAL', distance: 225 },
  { from: 'IZM', to: 'USK', distance: 225 },
  { from: 'IZM', to: 'DEN', distance: 250 },

  // Edirne / NW connections
  { from: 'EDR', to: 'TEK', distance: 130 },
  { from: 'EDR', to: 'KRK2', distance: 60 },
  { from: 'KRK2', to: 'TEK', distance: 95 },
  { from: 'TEK', to: 'KOC', distance: 140 },

  // Marmara / West
  { from: 'CAN', to: 'BAL', distance: 135 },
  { from: 'BAL', to: 'MAN', distance: 115 },
  { from: 'BAL', to: 'KUT', distance: 100 },
  { from: 'GAL', to: 'KOC', distance: 38 },
  { from: 'GAL', to: 'BRS', distance: 75 },

  // Aegean
  { from: 'MAN', to: 'AYD', distance: 105 },
  { from: 'MAN', to: 'USK', distance: 145 },
  { from: 'AYD', to: 'DEN', distance: 120 },
  { from: 'AYD', to: 'MUG', distance: 155 },
  { from: 'DEN', to: 'AFY', distance: 190 },
  { from: 'DEN', to: 'MUG', distance: 185 },
  { from: 'DEN', to: 'BUT', distance: 108 },
  { from: 'MUG', to: 'ANT', distance: 250 },
  { from: 'MUG', to: 'BUT', distance: 135 },
  { from: 'USK', to: 'AFY', distance: 100 },
  { from: 'USK', to: 'KUT', distance: 100 },

  // Central Aegean / Mediterranean
  { from: 'AFY', to: 'KUT', distance: 130 },
  { from: 'AFY', to: 'ESK', distance: 155 },
  { from: 'AFY', to: 'KON', distance: 225 },
  { from: 'AFY', to: 'ISP', distance: 95 },
  { from: 'ISP', to: 'BUT', distance: 44 },
  { from: 'ISP', to: 'ANT', distance: 215 },
  { from: 'ISP', to: 'KON', distance: 195 },

  // Antalya region
  { from: 'ANT', to: 'BUT', distance: 173 },
  { from: 'ANT', to: 'KON', distance: 320 },
  { from: 'ANT', to: 'MER', distance: 330 },
  { from: 'ANT', to: 'KRE', distance: 280 },

  // Central Anatolia
  { from: 'KON', to: 'KAY', distance: 260 },
  { from: 'KON', to: 'AKS', distance: 145 },
  { from: 'KON', to: 'NIL', distance: 190 },
  { from: 'KON', to: 'KRE', distance: 197 },
  { from: 'KAY', to: 'SIV', distance: 210 },
  { from: 'KAY', to: 'NEV', distance: 85 },
  { from: 'KAY', to: 'NIL', distance: 130 },
  { from: 'KAY', to: 'MAL', distance: 225 },
  { from: 'KAY', to: 'ADN', distance: 340 },
  { from: 'NEV', to: 'AKS', distance: 80 },
  { from: 'NEV', to: 'NIL', distance: 85 },
  { from: 'AKS', to: 'KRE', distance: 165 },
  { from: 'KRE', to: 'NIL', distance: 120 },
  { from: 'KRE', to: 'ADN', distance: 215 },
  { from: 'NIL', to: 'ADN', distance: 165 },
  { from: 'NIL', to: 'OSM', distance: 130 },
  { from: 'KRS', to: 'KAY', distance: 155 },
  { from: 'KRS', to: 'YOZ', distance: 120 },
  { from: 'KRS', to: 'NEV', distance: 155 },

  // Yozgat / Kırıkkale area
  { from: 'YOZ', to: 'KRK', distance: 105 },
  { from: 'YOZ', to: 'SIV', distance: 196 },
  { from: 'YOZ', to: 'TOK', distance: 170 },
  { from: 'KRK', to: 'CAR', distance: 110 },
  { from: 'CAR', to: 'COR', distance: 130 },
  { from: 'CAR', to: 'KAS', distance: 200 },

  // Black Sea
  { from: 'BOL', to: 'ZON', distance: 74 },
  { from: 'BOL', to: 'KOC', distance: 200 },
  { from: 'BOL', to: 'NIT', distance: 55 },
  { from: 'NIT', to: 'KOC', distance: 150 },
  { from: 'ZON', to: 'BAR', distance: 55 },
  { from: 'ZON', to: 'KRB', distance: 82 },
  { from: 'KRB', to: 'KAS', distance: 92 },
  { from: 'BAR', to: 'KAS', distance: 100 },
  { from: 'KAS', to: 'SIN', distance: 185 },
  { from: 'KAS', to: 'AMA', distance: 235 },
  { from: 'SIN', to: 'SAM', distance: 175 },
  { from: 'SAM', to: 'ORS', distance: 140 },
  { from: 'SAM', to: 'AMA', distance: 142 },
  { from: 'SAM', to: 'TOK', distance: 200 },
  { from: 'ORS', to: 'GIR', distance: 65 },
  { from: 'GIR', to: 'TRZ', distance: 155 },
  { from: 'TRZ', to: 'RIZ', distance: 75 },
  { from: 'RIZ', to: 'ART', distance: 117 },
  { from: 'ART', to: 'ARD', distance: 210 },
  { from: 'ARD', to: 'KRS2', distance: 100 },
  { from: 'KRS2', to: 'ERZ', distance: 212 },
  { from: 'KRS2', to: 'AGR', distance: 225 },
  { from: 'KRS2', to: 'IGD', distance: 295 },
  { from: 'AGR', to: 'IGD', distance: 120 },
  { from: 'AGR', to: 'VAN', distance: 220 },
  { from: 'AGR', to: 'MUS', distance: 200 },

  // Sivas / East
  { from: 'SIV', to: 'TOK', distance: 188 },
  { from: 'SIV', to: 'MAL', distance: 220 },
  { from: 'SIV', to: 'ERZ', distance: 315 },
  { from: 'TOK', to: 'AMA', distance: 108 },
  { from: 'AMA', to: 'COR', distance: 113 },
  { from: 'COR', to: 'SAM', distance: 145 },

  // East Anatolia
  { from: 'ERZ', to: 'TRZ', distance: 325 },
  { from: 'ERZ', to: 'ELA', distance: 190 },
  { from: 'ERZ', to: 'MUS', distance: 295 },
  { from: 'ERZ', to: 'AGR', distance: 285 },
  { from: 'ERZ', to: 'TUN', distance: 265 },
  { from: 'ELA', to: 'MAL', distance: 103 },
  { from: 'ELA', to: 'DYB', distance: 128 },
  { from: 'ELA', to: 'TUN', distance: 100 },
  { from: 'ELA', to: 'BNG', distance: 130 },
  { from: 'MAL', to: 'ADY', distance: 200 },
  { from: 'MAL', to: 'KAH', distance: 190 },
  { from: 'TUN', to: 'BNG', distance: 132 },
  { from: 'BNG', to: 'MUS', distance: 175 },
  { from: 'MUS', to: 'BIT', distance: 75 },
  { from: 'BIT', to: 'VAN', distance: 115 },
  { from: 'VAN', to: 'HAK', distance: 215 },
  { from: 'VAN', to: 'SII', distance: 200 },
  { from: 'SII', to: 'SRN', distance: 110 },
  { from: 'SRN', to: 'HAK', distance: 245 },
  { from: 'DYB', to: 'MAR', distance: 95 },
  { from: 'DYB', to: 'SAN', distance: 200 },
  { from: 'DYB', to: 'SII', distance: 165 },
  { from: 'DYB', to: 'BNG', distance: 165 },
  { from: 'MAR', to: 'SII', distance: 150 },
  { from: 'MAR', to: 'SAN', distance: 225 },

  // Southeast
  { from: 'SAN', to: 'GAZ', distance: 148 },
  { from: 'SAN', to: 'ADY', distance: 210 },
  { from: 'GAZ', to: 'ADN', distance: 205 },
  { from: 'GAZ', to: 'KAH', distance: 140 },
  { from: 'GAZ', to: 'OSM', distance: 175 },
  { from: 'GAZ', to: 'KLI', distance: 63 },
  { from: 'GAZ', to: 'HAT', distance: 200 },
  { from: 'KAH', to: 'ADY', distance: 155 },
  { from: 'KAH', to: 'ADN', distance: 200 },
  { from: 'KAH', to: 'OSM', distance: 88 },
  { from: 'OSM', to: 'ADN', distance: 100 },
  { from: 'ADN', to: 'MER', distance: 65 },
  { from: 'ADN', to: 'HAT', distance: 190 },
  { from: 'MER', to: 'NIL', distance: 180 },
  { from: 'MER', to: 'KRE', distance: 213 },
  { from: 'MER', to: 'HAT', distance: 198 },
  { from: 'HAT', to: 'KLI', distance: 130 },

  // Extra cross-connects
  { from: 'ESK', to: 'BOL', distance: 165 },
  { from: 'ESK', to: 'KUT', distance: 80 },
  { from: 'KUT', to: 'AFY', distance: 130 },
  { from: 'ADY', to: 'SAN', distance: 210 },
];

export function buildGraph(): Map<string, Map<string, number>> {
  const graph = new Map<string, Map<string, number>>();
  for (const city of CITIES) {
    graph.set(city.id, new Map());
  }
  for (const edge of ROAD_EDGES) {
    // Try to get real road distance from OSRM cache
    const k1 = `${edge.from}-${edge.to}`;
    const k2 = `${edge.to}-${edge.from}`;
    const realData = routeGeometries[k1] || routeGeometries[k2];

    // OSRM returns distance in meters, convert to km. Fallback to hardcoded edge if missing.
    const actualDistance = realData ? realData.distance / 1000 : edge.distance;

    graph.get(edge.from)?.set(edge.to, actualDistance);
    graph.get(edge.to)?.set(edge.from, actualDistance);
  }
  return graph;
}

// Compute full distance matrix using Dijkstra from each city
export function computeDistanceMatrix(cityIds: string[]): Map<string, Map<string, number>> {
  const graph = buildGraph();
  const matrix = new Map<string, Map<string, number>>();

  for (const startId of cityIds) {
    const dist = dijkstra(graph, startId, cityIds);
    matrix.set(startId, dist);
  }
  return matrix;
}

function dijkstra(
  graph: Map<string, Map<string, number>>,
  start: string,
  targets: string[]
): Map<string, number> {
  const dist = new Map<string, number>();
  const visited = new Set<string>();

  for (const city of CITIES) {
    dist.set(city.id, Infinity);
  }
  dist.set(start, 0);

  // Simple priority queue using array
  const queue: Array<{ id: string; d: number }> = [{ id: start, d: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const { id: u } = queue.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);

    const neighbors = graph.get(u);
    if (!neighbors) continue;
    for (const [v, w] of neighbors) {
      const alt = dist.get(u)! + w;
      if (alt < dist.get(v)!) {
        dist.set(v, alt);
        queue.push({ id: v, d: alt });
      }
    }
  }

  // Return only target cities
  const result = new Map<string, number>();
  for (const t of targets) {
    result.set(t, dist.get(t) ?? Infinity);
  }
  return result;
}

export function getCityById(id: string): City | undefined {
  return CITIES.find(c => c.id === id);
}
