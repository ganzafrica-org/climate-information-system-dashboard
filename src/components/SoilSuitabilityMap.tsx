import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SuitabilityData, SusceptibilityData, AdministrativeData } from '@/pages/soil-suitability';

const { BaseLayer, Overlay } = LayersControl;

const SUITABILITY_COLORS = {
  'Very Suitable': '#38A800',
  'Suitable': '#98E600',
  'Moderate Suitable': '#E9FFBE',
  'Less Suitable': '#FFEBAF',
  'Not Suitable': '#FF5500'
};

// Handle all variations of susceptibility class names from different GeoJSON files
const SUSCEPTIBILITY_COLORS = {
  // Correct names from mapping guidance
  'Extremely Susceptible': '#A80000',
  'Highly Susceptible': '#FF5500',
  'Moderate Susceptible': '#F5CA7A',
  'Slightly Susceptible': '#E1E1E1',
  // Variations with trailing spaces (flooding, soil erosion files)
  'Extremely Susceptible ': '#A80000',
  'Highly Susceptible ': '#FF5500',
  'Moderately Susceptible ': '#F5CA7A',
  'Slightly Susceptible ': '#E1E1E1',
  // Variations without trailing spaces but with "Moderately" (landslide file)
  'Moderately Susceptible': '#F5CA7A'
};

interface MapProps {
  suitabilityData: any;
  susceptibilityData: any;
  sectors: AdministrativeData | null;
  district: AdministrativeData | null;
  restrictedAreas: AdministrativeData | null;
  selectedSector: string;
  onSectorSelect: (sector: string) => void;
  activeLayer: string;
  selectedCrop?: string;
  selectedHazard?: string;
}

function MapUpdater({ sectors, selectedSector, onSectorSelect }: {
  sectors: AdministrativeData | null;
  selectedSector: string;
  onSectorSelect: (sector: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (sectors && selectedSector) {
      const selectedFeature = sectors.features.find(
        feature => feature.properties.NAME === selectedSector
      );

      if (selectedFeature) {
        const layer = L.geoJSON(selectedFeature);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      }
    } else if (sectors) {
      const layer = L.geoJSON(sectors);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [map, sectors, selectedSector]);

  return null;
}

export default function SoilSuitabilityMap({
  suitabilityData,
  susceptibilityData,
  sectors,
  district,
  restrictedAreas,
  selectedSector,
  onSectorSelect,
  activeLayer,
  selectedCrop,
  selectedHazard
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);

  const getSuitabilityStyle = (feature: any) => {
    const suitabilityClass = feature.properties?.Suitability_Class;
    const color = SUITABILITY_COLORS[suitabilityClass as keyof typeof SUITABILITY_COLORS] || '#CCCCCC';

    return {
      fillColor: color,
      weight: 0,
      opacity: 0,
      fillOpacity: 0.7,
      color: 'transparent'
    };
  };

  const getSusceptibilityStyle = (feature: any) => {
    const susceptibilityClass = feature.properties?.Susceptibility_Class;
    const color = SUSCEPTIBILITY_COLORS[susceptibilityClass as keyof typeof SUSCEPTIBILITY_COLORS] || '#CCCCCC';

    return {
      fillColor: color,
      weight: 0,
      opacity: 0,
      fillOpacity: 0.7,
      color: 'transparent'
    };
  };

  const getDistrictStyle = () => ({
    fillColor: 'transparent',
    weight: 2,
    opacity: 1,
    color: '#000000',
    fillOpacity: 0
  });

  const getSectorStyle = (feature: any) => {
    const isSelected = feature.properties?.NAME === selectedSector;
    return {
      fillColor: isSelected ? '#3B82F6' : 'transparent',
      weight: isSelected ? 2 : 0.5,
      opacity: 1,
      color: isSelected ? '#1E40AF' : '#000000',
      fillOpacity: isSelected ? 0.1 : 0
    };
  };

  const getRestrictedStyle = () => ({
    fillColor: '#DC2626',
    weight: 2,
    opacity: 1,
    color: '#000000',
    fillOpacity: 0.2
  });

  const onSectorClick = (feature: any, layer: L.Layer) => {
    const sectorName = feature.properties?.NAME;
    if (sectorName) {
      onSectorSelect(selectedSector === sectorName ? '' : sectorName);
    }
  };

  const createTooltipContent = (properties: any, type: 'suitability' | 'susceptibility') => {
    const className = type === 'suitability'
      ? properties.Suitability_Class
      : properties.Susceptibility_Class;
    const area = properties.Area_ha;
    const sector = properties.SECTOR || properties.Sector || properties.sector || 'Unknown';

    return `
      <div class="font-medium">
        <div><strong>Class:</strong> ${className || 'Unknown'}</div>
        <div><strong>Area:</strong> ${area ? area.toLocaleString() : 'Unknown'} ha</div>
        <div><strong>Sector:</strong> ${sector}</div>
      </div>
    `;
  };

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={[-1.95, 30.06]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <LayersControl position="topright">
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>

          <BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </BaseLayer>

          {/* District Boundary - Always visible */}
          {district && (
            <Overlay checked name="District Boundary">
              <GeoJSON
                key="district"
                data={district}
                style={getDistrictStyle}
                onEachFeature={(feature, layer) => {
                  if (feature.properties?.NAME) {
                    layer.bindTooltip(
                      `<div class="font-medium">District: ${feature.properties.NAME}</div>`,
                      { permanent: false, direction: 'top' }
                    );
                  }
                }}
              />
            </Overlay>
          )}

          {/* Sectors - Always visible, clickable */}
          {sectors && (
            <Overlay checked name="Sectors">
              <GeoJSON
                key={`sectors-${selectedSector}`}
                data={sectors}
                style={getSectorStyle}
                onEachFeature={(feature, layer) => {
                  if (feature.properties?.NAME) {
                    layer.bindTooltip(
                      `<div class="font-medium">Sector: ${feature.properties.NAME}</div>`,
                      { permanent: false, direction: 'top' }
                    );

                    layer.on('click', () => onSectorClick(feature, layer));
                    layer.on('mouseover', () => {
                      (layer as any).setStyle({ fillOpacity: 0.3 });
                    });
                    layer.on('mouseout', () => {
                      (layer as any).setStyle(getSectorStyle(feature));
                    });
                  }
                }}
              />
            </Overlay>
          )}

          {/* Restricted Areas */}
          {restrictedAreas && (
            <Overlay checked name="Restricted Areas">
              <GeoJSON
                key="restricted"
                data={restrictedAreas}
                style={getRestrictedStyle}
                onEachFeature={(feature, layer) => {
                  if (feature.properties?.NAME) {
                    layer.bindTooltip(
                      `<div class="font-medium">Restricted Area: ${feature.properties.NAME}</div>`,
                      { permanent: false, direction: 'top' }
                    );
                  }
                }}
              />
            </Overlay>
          )}

          {/* Suitability Layer */}
          {suitabilityData && activeLayer === 'suitability' && (
            <Overlay checked name="Crop Suitability">
              <GeoJSON
                key={`suitability-${selectedCrop}-${selectedSector}`}
                data={suitabilityData}
                style={getSuitabilityStyle}
                onEachFeature={(feature, layer) => {
                  layer.bindTooltip(
                    createTooltipContent(feature.properties, 'suitability'),
                    { permanent: false, direction: 'top' }
                  );
                }}
              />
            </Overlay>
          )}

          {/* Susceptibility Layer */}
          {susceptibilityData && activeLayer === 'susceptibility' && (
            <Overlay checked name="Hazard Susceptibility">
              <GeoJSON
                key={`susceptibility-${selectedHazard}-${selectedSector}`}
                data={susceptibilityData}
                style={getSusceptibilityStyle}
                onEachFeature={(feature, layer) => {
                  layer.bindTooltip(
                    createTooltipContent(feature.properties, 'susceptibility'),
                    { permanent: false, direction: 'top' }
                  );
                }}
              />
            </Overlay>
          )}
        </LayersControl>

        <MapUpdater
          sectors={sectors}
          selectedSector={selectedSector}
          onSectorSelect={onSectorSelect}
        />
      </MapContainer>
    </div>
  );
}