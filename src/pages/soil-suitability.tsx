import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Map, BarChart3, Filter, Download } from 'lucide-react';
import { useLanguage } from '@/i18n';
import {AppLayout} from "@/components/layout/AppLayout";

const MapWithNoSSR = dynamic(() => import('@/components/SoilSuitabilityMap'), {
  ssr: false,
  loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
  )
});

export interface SuitabilityData {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      Suitability_Class: string;
      Area_ha: number;
      SECTOR?: string;
      CELL?: string;
      VILLAGE?: string;
      [key: string]: any;
    };
    geometry: any;
  }>;
}

export interface SusceptibilityData {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      Susceptibility_Class: string;
      Area_ha: number;
      SECTOR?: string;
      CELL?: string;
      VILLAGE?: string;
      [key: string]: any;
    };
    geometry: any;
  }>;
}

export interface AdministrativeData {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      NAME: string;
      [key: string]: any;
    };
    geometry: any;
  }>;
}

const getSuitabilityColors = (t: (key: string) => string) => ({
  [t('verySuitable')]: '#38A800',
  [t('suitable')]: '#98E600',
  [t('moderateSuitable')]: '#E9FFBE',
  [t('lessSuitable')]: '#FFEBAF',
  [t('notSuitable')]: '#FF5500'
});

const SUITABILITY_COLORS = {
  'Very Suitable': '#38A800',
  'Suitable': '#98E600',
  'Moderate Suitable': '#E9FFBE',
  'Less Suitable': '#FFEBAF',
  'Not Suitable': '#FF5500'
};

const getSusceptibilityColors = (t: (key: string) => string) => ({
  [t('extremelySusceptible')]: '#8B0000',
  [t('highlySusceptible')]: '#DC143C',
  [t('moderateSusceptible')]: '#FF8C00',
  [t('slightlySusceptible')]: '#FFD700'
});

const SUSCEPTIBILITY_COLORS = {
  'Extremely Susceptible': '#8B0000',
  'Highly Susceptible': '#DC143C',
  'Moderate Susceptible': '#FF8C00',
  'Slightly Susceptible': '#FFD700'
};

const getCropTypes = (t: (key: string) => string) => [
  { value: 'beans', label: t('beans'), file: 'Beans_Suitability_Layer.geojson' },
  { value: 'irish_potatoes', label: t('irishPotatoes'), file: 'Irish_Potatoes_Suitability_Layer.geojson' },
  { value: 'maize', label: t('maize'), file: 'Maize_Suitability_Layer.geojson' }
];

const getHazardTypes = (t: (key: string) => string) => [
  { value: 'flooding', label: t('flooding'), file: 'Rev_Flooding__Susceptibility.geojson' },
  { value: 'landslide', label: t('landslide'), file: 'Rev_Landslide__Susceptibility.geojson' },
  { value: 'soil_erosion', label: t('soilErosion'), file: 'Rev_SoilErosion__Susceptibility.geojson' }
];

export default function SoilSuitabilityPage() {
  const { t } = useLanguage();
  const [selectedCrop, setSelectedCrop] = useState('beans');
  const [selectedHazard, setSelectedHazard] = useState('flooding');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [activeTab, setActiveTab] = useState('suitability');
  const [suitabilityData, setSuitabilityData] = useState<SuitabilityData | null>(null);
  const [susceptibilityData, setSusceptibilityData] = useState<SusceptibilityData | null>(null);
  const [sectors, setSectors] = useState<AdministrativeData | null>(null);
  const [district, setDistrict] = useState<AdministrativeData | null>(null);
  const [restrictedAreas, setRestrictedAreas] = useState<AdministrativeData | null>(null);
  const [musanzeData, setMusanzeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGeoJsonData = async (filename: string) => {
    try {
      const response = await fetch(`/suitability-vs-susceptability/${filename}`);
      if (!response.ok) throw new Error(`Failed to load ${filename}`);
      return await response.json();
    } catch (err) {
      console.error(`Error loading ${filename}:`, err);
      throw err;
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [sectorsData, districtData, restrictedData, musanzeGeoData] = await Promise.all([
          loadGeoJsonData('Sectors.geojson'),
          loadGeoJsonData('Musanze_District_Boundary.geojson'),
          loadGeoJsonData('Restricted_Areas.geojson'),
          fetch('/musanze_geo.json').then(res => res.json())
        ]);

        setSectors(sectorsData);
        setDistrict(districtData);
        setRestrictedAreas(restrictedData);
        setMusanzeData(musanzeGeoData);
      } catch (err) {
        setError('Failed to load administrative data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const loadSuitabilityData = async () => {
      try {
        const cropFile = getCropTypes(t).find(c => c.value === selectedCrop)?.file;
        console.log('Loading suitability data for crop:', selectedCrop, 'File:', cropFile);
        if (cropFile) {
          const data = await loadGeoJsonData(cropFile);
          console.log('Loaded suitability data:', data?.features?.length, 'features');
          setSuitabilityData(data);
        }
      } catch (err) {
        console.error('Error loading suitability data:', err);
      }
    };

    loadSuitabilityData();
  }, [selectedCrop, t]);

  useEffect(() => {
    const loadSusceptibilityData = async () => {
      try {
        const hazardFile = getHazardTypes(t).find(h => h.value === selectedHazard)?.file;
        console.log('Loading susceptibility data for hazard:', selectedHazard, 'File:', hazardFile);
        if (hazardFile) {
          const data = await loadGeoJsonData(hazardFile);
          console.log('Loaded susceptibility data:', data?.features?.length, 'features');
          setSusceptibilityData(data);
        }
      } catch (err) {
        console.error('Error loading susceptibility data:', err);
      }
    };

    loadSusceptibilityData();
  }, [selectedHazard, t]);

  const filteredData = useMemo(() => {
    const filterBySector = (data: any) => {
      if (!data || !selectedSector || selectedSector === 'All sectors') return data;

      return {
        ...data,
        features: data.features.filter((feature: any) =>
            feature.properties.SECTOR === selectedSector ||
            feature.properties.Sector === selectedSector ||
            feature.properties.sector === selectedSector ||
            feature.properties.ADM3_EN === selectedSector
        )
      };
    };

    return {
      suitability: filterBySector(suitabilityData),
      susceptibility: filterBySector(susceptibilityData)
    };
  }, [suitabilityData, susceptibilityData, selectedSector]);

  const areaStats = useMemo(() => {
    const calculateStats = (data: any, classField: string) => {
      if (!data) return {};

      const stats: Record<string, number> = {};
      data.features.forEach((feature: any) => {
        const className = feature.properties[classField];
        const area = feature.properties.Area_ha || 0;
        stats[className] = (stats[className] || 0) + area;
      });

      return stats;
    };

    return {
      suitability: calculateStats(filteredData.suitability, 'Suitability_Class'),
      susceptibility: calculateStats(filteredData.susceptibility, 'Susceptibility_Class')
    };
  }, [filteredData]);

  const availableSectors = useMemo(() => {
    if (!musanzeData) return [];
    const sectorNames = new Set<string>();
    musanzeData.features.forEach((feature: any) => {
      if (feature.properties.ADM3_EN) {
        sectorNames.add(feature.properties.ADM3_EN);
      }
    });
    return Array.from(sectorNames).sort();
  }, [musanzeData]);

  const handleExportData = () => {
    const dataToExport = activeTab === 'suitability' ? filteredData.suitability : filteredData.susceptibility;
    if (!dataToExport) return;

    const csvData = dataToExport.features.map((feature: { properties: { [x: string]: any; Area_ha: any; SECTOR: any; Sector: any; sector: any; CELL: any; Cell: any; cell: any; VILLAGE: any; Village: any; village: any; }; }) => ({
      Class: feature.properties[activeTab === 'suitability' ? 'Suitability_Class' : 'Susceptibility_Class'],
      Area_ha: feature.properties.Area_ha,
      Sector: feature.properties.SECTOR || feature.properties.Sector || feature.properties.sector || '',
      Cell: feature.properties.CELL || feature.properties.Cell || feature.properties.cell || '',
      Village: feature.properties.VILLAGE || feature.properties.Village || feature.properties.village || ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row: { [s: string]: unknown; } | ArrayLike<unknown>) => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_${selectedCrop || selectedHazard}_${selectedSector || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">{t('loadingSoilData')}</span>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="container mx-auto p-6">
          <Card className="border-red-200">
            <CardContent className="p-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div className="flex items-center gap-4">
      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
        <Map className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-3xl font-bold">
          {t('soilSuitabilityAnalysis')}
        </h1>
        <p className="text-blue-100 mt-2">
          {t('soilAnalysisDescription')}
        </p>
      </div>
    </div>
    <Button
      onClick={handleExportData}
      variant="outline"
      className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
    >
      <Download className="h-4 w-4" />
      {t('exportData')}
    </Button>
  </div>
</div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 border-0 shadow-xl">
  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
    <CardTitle className="flex items-center gap-2 text-blue-900">
      <Filter className="h-5 w-5 text-blue-600" />
      {t('filtersAndAnalysis')}
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full py-2">
      <TabsList className="grid w-full grid-cols-2 bg-gray-100">
        <TabsTrigger 
          value="suitability" 
          className={activeTab === 'suitability' ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white' : ''}
        >
          {t('suitability')}
        </TabsTrigger>
        <TabsTrigger 
          value="susceptibility" 
          className={activeTab === 'susceptibility' ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white' : ''}
        >
          {t('risk')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="suitability" className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">{t('cropType')}</label>
          <Select value={selectedCrop} onValueChange={setSelectedCrop}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getCropTypes(t).map(crop => (
                <SelectItem key={crop.value} value={crop.value}>
                  {crop.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TabsContent>

      <TabsContent value="susceptibility" className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">{t('hazardType')}</label>
          <Select value={selectedHazard} onValueChange={setSelectedHazard}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getHazardTypes(t).map(hazard => (
                <SelectItem key={hazard.value} value={hazard.value}>
                  {hazard.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TabsContent>
    </Tabs>

    <div>
      <label className="text-sm font-medium mb-2 block">{t('filterBySector')}</label>
      <Select value={selectedSector} onValueChange={setSelectedSector}>
        <SelectTrigger>
          <SelectValue placeholder={t('allSectors')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All sectors">{t('allSectors')}</SelectItem>
          {availableSectors.map(sector => (
            <SelectItem key={sector} value={sector}>
              {sector}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {selectedSector && (
      <Badge variant="secondary" className="w-full justify-center">
        {t('filtered')}: {selectedSector}
      </Badge>
    )}

    {/* Distribution moved here */}
    <div className="border-t pt-4">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        {t('areaDistribution')}
      </h3>
      <div className="space-y-2">
        {Object.entries(
          activeTab === 'suitability' ? areaStats.suitability : areaStats.susceptibility
        ).map(([className, area]) => {
          const colors =
            activeTab === 'suitability'
              ? getSuitabilityColors(t)
              : getSusceptibilityColors(t);
          const englishColors =
            activeTab === 'suitability'
              ? SUITABILITY_COLORS
              : SUSCEPTIBILITY_COLORS;
          const color =
            colors[className] ||
            englishColors[className as keyof typeof englishColors] ||
            '#CCCCCC';

          return (
            <div
              key={className}
              className="flex items-center justify-between p-2 rounded border"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium">{className}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {area.toLocaleString()} {t('hectares')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </CardContent>
</Card>


            <Card className="lg:col-span-3 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Map className="h-5 w-5 text-blue-600" />
                  {t('interactiveMap')}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <MapWithNoSSR
                    suitabilityData={activeTab === 'suitability' ? filteredData.suitability : null}
                    susceptibilityData={activeTab === 'susceptibility' ? filteredData.susceptibility : null}
                    sectors={sectors}
                    district={district}
                    restrictedAreas={restrictedAreas}
                    selectedSector={selectedSector}
                    onSectorSelect={setSelectedSector}
                    activeLayer={activeTab}
                    selectedCrop={selectedCrop}
                    selectedHazard={selectedHazard}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
  );
}