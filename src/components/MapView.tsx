import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CITIES, getCityById } from '../data/turkeyGraph';
import routeGeometries from '../data/routeGeometries_v2.json';
import turkeyBoundary from '../data/turkeyBoundary.json';

// Type for the new V2 JSON format
type RouteData = { coords: number[][]; distance: number };

interface MapViewProps {
    startCity: string | null;
    endCity: string | null;
    currentPath: string[];
    bestPath: string[];
    isRunning: boolean;
    onCityClick?: (cityId: string) => void;
}

const MapView: React.FC<MapViewProps> = ({
    startCity,
    endCity,
    currentPath,
    bestPath,
    isRunning,
    onCityClick,
}) => {
    // Helper to build real geometry coordinates from an array of city IDs
    const buildRealGeometry = (path: string[]) => {
        if (!path || path.length < 2) return [];
        let fullGeometry: [number, number][] = [];
        for (let i = 0; i < path.length - 1; i++) {
            const fromCity = path[i];
            const toCity = path[i + 1];
            const k1 = `${fromCity}-${toCity}`;
            const k2 = `${toCity}-${fromCity}`;

            const geometries = routeGeometries as Record<string, RouteData>;
            const data = geometries[k1] || geometries[k2];
            const coords = data?.coords;

            if (coords) {
                const leafletCoords = coords.map(c => [c[1], c[0]] as [number, number]);
                if (geometries[k2] && !geometries[k1]) {
                    leafletCoords.reverse();
                }
                fullGeometry.push(...leafletCoords);
            } else {
                const fromCoords = getCityById(fromCity);
                const toCoords = getCityById(toCity);
                if (fromCoords && toCoords) {
                    fullGeometry.push([fromCoords.lat, fromCoords.lng], [toCoords.lat, toCoords.lng]);
                }
            }
        }
        return fullGeometry;
    };

    const [detailedCurrentCoords, setDetailedCurrentCoords] = useState<[number, number][]>([]);
    const [detailedBestCoords, setDetailedBestCoords] = useState<[number, number][] | null>(null);

    useEffect(() => {
        if (currentPath.length > 1) {
            setDetailedCurrentCoords(buildRealGeometry(currentPath));
        } else {
            setDetailedCurrentCoords([]);
        }
    }, [currentPath.join(',')]);

    useEffect(() => {
        if (bestPath.length > 1) {
            let fullGeometry: [number, number][] = [];

            for (let i = 0; i < bestPath.length - 1; i++) {
                const fromCity = bestPath[i];
                const toCity = bestPath[i + 1];
                const k1 = `${fromCity}-${toCity}`;
                const k2 = `${toCity}-${fromCity}`;

                const geometries = routeGeometries as Record<string, RouteData>;
                const data = geometries[k1] || geometries[k2];
                const coords = data?.coords;

                if (coords) {
                    // Coordinates in JSON are [lon, lat], convert to [lat, lon] for Leaflet
                    const leafletCoords = coords.map(c => [c[1], c[0]] as [number, number]);

                    // If we matched the reversed key (k2), the geometry coordinates are likely backward
                    // We need the road in the direction from->to
                    // For simply drawing a polyline, direction doesn't visually matter much, but for connectedness:
                    if (geometries[k2] && !geometries[k1]) {
                        leafletCoords.reverse();
                    }

                    fullGeometry.push(...leafletCoords);
                } else {
                    // Fallback to straight line if geometry not found
                    const fromCoords = getCityById(fromCity);
                    const toCoords = getCityById(toCity);
                    if (fromCoords && toCoords) {
                        fullGeometry.push([fromCoords.lat, fromCoords.lng], [toCoords.lat, toCoords.lng]);
                    }
                }
            }

            setDetailedBestCoords(fullGeometry.length > 0 ? fullGeometry : null);
        } else {
            setDetailedBestCoords(null);
        }
    }, [bestPath.join(',')]);

    const getCityColor = (cityId: string) => {
        if (cityId === startCity) return '#14B8A6'; // Teal
        if (cityId === endCity) return '#FB7185'; // Coral
        if (bestPath.includes(cityId)) return '#3b82f6'; // Blue
        if (currentPath.includes(cityId)) return '#ef4444'; // Red trial
        return '#64748b';
    };

    const getCityRadius = (cityId: string) => {
        if (cityId === startCity || cityId === endCity) return 10;
        if (currentPath.includes(cityId) || bestPath.includes(cityId)) return 7;
        return 5;
    };

    return (
        <MapContainer
            center={[39.0, 35.5]}
            zoom={6}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                className="map-tiles"
            />

            {/* Turkey Boundary Highlight */}
            {turkeyBoundary && (
                <GeoJSON
                    data={turkeyBoundary as any}
                    style={{
                        color: '#6366f1', // Subtle indigo border instead of bright red
                        weight: 2,
                        fillColor: 'transparent', // Transparent interior
                        opacity: 0.6,
                    }}
                />
            )}

            {/* City markers */}
            {CITIES.map(city => (
                <React.Fragment key={city.id}>
                    {/* Invisible larger clickable area (radius 18) for better UX */}
                    <CircleMarker
                        center={[city.lat, city.lng]}
                        radius={18}
                        pathOptions={{ color: 'transparent', fillColor: 'transparent' }}
                        eventHandlers={{
                            click: () => onCityClick?.(city.id),
                        }}
                    />

                    {/* Visible marker */}
                    <CircleMarker
                        center={[city.lat, city.lng]}
                        radius={getCityRadius(city.id)}
                        pathOptions={{
                            color: getCityColor(city.id),
                            fillColor: getCityColor(city.id),
                            fillOpacity: 0.9,
                            weight: city.id === startCity || city.id === endCity ? 3 : 1.5,
                        }}
                        eventHandlers={{
                            click: () => onCityClick?.(city.id),
                        }}
                    >
                        <Tooltip permanent={city.id === startCity || city.id === endCity} direction="top" offset={[0, -8]}>
                            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{city.name}</span>
                        </Tooltip>
                    </CircleMarker>
                </React.Fragment>
            ))}

            {/* Current generation route (red animated trial path) */}
            {isRunning && detailedCurrentCoords.length > 1 && (
                <Polyline
                    positions={detailedCurrentCoords}
                    pathOptions={{
                        color: '#ef4444',
                        weight: 2,
                        opacity: 0.5,
                        dashArray: '8 5',
                    }}
                />
            )}

            {/* Best route found */}
            {detailedBestCoords && detailedBestCoords.length > 1 && (
                <Polyline
                    positions={detailedBestCoords}
                    pathOptions={{
                        color: '#10b981', // Emerald green
                        weight: isRunning ? 2 : 5,
                        opacity: isRunning ? 0.5 : 1,
                        dashArray: isRunning ? '8 5' : '10 8',
                    }}
                />
            )}
        </MapContainer>
    );
};

export default MapView;
