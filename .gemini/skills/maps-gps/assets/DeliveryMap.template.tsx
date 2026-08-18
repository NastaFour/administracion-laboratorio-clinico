import React, { memo } from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Coordinates } from '@org/contracts/location';

interface DeliveryMapProps {
  coords: Coordinates | null;
  route?: Array<{ latitude: number; longitude: number }>;
  courierPin?: any;
  destinationPin?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

/**
 * Pure presentational map component.
 * Receives coords and route as props. NO socket subscriptions, NO state, NO side effects.
 * Wrap in React.memo to prevent re-renders from parent state changes.
 */
function DeliveryMapBase({
  coords,
  route = [],
  courierPin,
  destinationPin,
  initialRegion,
}: DeliveryMapProps) {
  const region = coords
    ? { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : initialRegion ?? { latitude: 0, longitude: 0, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={{ flex: 1 }}
      initialRegion={region}
      region={coords ? { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 } : undefined}
    >
      {coords && (
        <Marker
          coordinate={coords}
          image={courierPin}
          tracksViewChanges={false}
          title="Courier"
        />
      )}
      {route.length > 0 && <Polyline coordinates={route} strokeWidth={4} strokeColor="#3b82f6" />}
      {destinationPin && <Marker coordinate={destinationPin} title="Destination" />}
    </MapView>
  );
}

export const DeliveryMap = memo(DeliveryMapBase);
