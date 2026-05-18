type LngLat = [number, number];

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentMeters(
  pointLat: number,
  pointLng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return haversineMeters(pointLat, pointLng, lat1, lng1);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointLng - lng1) * dx + (pointLat - lat1) * dy) / lenSq,
    ),
  );

  const projLat = lat1 + t * dy;
  const projLng = lng1 + t * dx;
  return haversineMeters(pointLat, pointLng, projLat, projLng);
}

function linesFromGeometry(geometry: GeoJSON.Geometry): LngLat[][] {
  if (geometry.type === "LineString") {
    return [geometry.coordinates as LngLat[]];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates as LngLat[][];
  }
  return [];
}

export function getStreetLabelFromPlanification(planif: {
  streetFeature?: { properties?: GeoJSON.GeoJsonProperties };
  coteRueId?: number;
}) {
  const props = planif.streetFeature?.properties;
  const nom = props?.NOM_VOIE as string | undefined;
  const type = props?.TYPE_F as string | undefined;
  if (nom && type) return `${nom} ${type}`;
  if (nom) return nom;
  if (planif.coteRueId != null) return `Côté de rue #${planif.coteRueId}`;
  return "Rue inconnue";
}

export function findNearestStreetPlanification(
  lat: number,
  lng: number,
  planifications: Array<{
    coteRueId: number;
    streetFeature?: GeoJSON.Feature;
  }>,
  maxDistanceMeters = 80,
) {
  let nearest: (typeof planifications)[number] | null = null;
  let minDistance = Infinity;

  for (const planif of planifications) {
    const geometry = planif.streetFeature?.geometry;
    if (!geometry) continue;

    for (const line of linesFromGeometry(geometry)) {
      for (let i = 0; i < line.length - 1; i++) {
        const [lng1, lat1] = line[i];
        const [lng2, lat2] = line[i + 1];
        const distance = pointToSegmentMeters(lat, lng, lat1, lng1, lat2, lng2);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = planif;
        }
      }
    }
  }

  if (!nearest || minDistance > maxDistanceMeters) {
    return null;
  }

  return { planification: nearest, distanceMeters: minDistance };
}
