
# GanzAfrica Climate Information System

A localized weather and farming advisory system for farmers in Musanze region, Rwanda. This application provides real-time weather forecasts, agricultural alerts, historical data analysis, and farmer management tools.

## Features

- **Dashboard**: Overview of current weather conditions and farming advisories
- **Weather Forecasts**: 7-day weather predictions with farming recommendations and export/share functionality
- **Historical Data**: Analysis of weather trends and patterns with location comparison
- **Weather Alerts**: Timely notifications for weather events
- **Farmer Management**: Complete CRUD operations with CSV import/export capabilities
- **Messaging System**: Send targeted alerts and information to farmers
- **Multilingual Support**: Available in English and Kinyarwanda

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ganzafrica-org/ganzafrica-climate-information-system.git
   cd ganzafrica-climate-information-system
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_API_URL=your_api_url_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Building for Production

```bash
npm run build
# or
yarn build
```

Then start the production server:

```bash
npm start
# or
yarn start
```

## Project Structure

- `/src/pages`: Next.js pages using the Pages Router
- `/src/components`: Reusable React components
- `/src/lib`: Utility functions and configurations
- `/src/types`: TypeScript type definitions
- `/src/styles`: Global CSS and styling utilities
- `/src/i18n`: Internationalization setup
- `/src/locales`: Translation files

## API Client

The project uses a powerful, simple API client built with Axios for handling all HTTP requests. The API client automatically handles authentication, error handling, and provides additional utilities like CSV export and file uploads.

### Setup

The API client is pre-configured and ready to use. Key files:
- `src/lib/api.ts`: Main API client with all HTTP methods
- `src/types/`: TypeScript interfaces for API responses
- Authentication is handled automatically via localStorage tokens

### Core Features

- **Automatic Authentication**: Adds Bearer tokens to all requests
- **Error Handling**: Centralized error handling with console logging
- **Request/Response Interceptors**: Automatic token management and error responses
- **File Operations**: Built-in support for file uploads and CSV exports
- **TypeScript Support**: Full type safety for all API calls

### Using the API Client

Import the API client in your components:

```typescript
import api from '@/lib/api';
import { ApiResponse, SomeDataType } from '@/types/your-types';
```

#### GET Requests
```typescript
// Simple GET request
const fetchWeatherData = async () => {
  try {
    const response = await api.get<ApiResponse>('/api/weather/location/1');
    console.log(response.data);
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
  }
};

// GET with query parameters
const fetchFarmers = async () => {
  try {
    const response = await api.get<ApiResponse>('/api/admin/farmers', {
      params: {
        limit: 20,
        page: 1,
        locationId: 5,
        search: 'john'
      }
    });
    setFarmers(response.data.farmers);
  } catch (error) {
    toast.error('Failed to load farmers');
  }
};

// GET historical weather data with date filters
const fetchHistoricalData = async (locationId: number, year: number) => {
  try {
    const response = await api.get<ApiResponse>(
      `/api/weather/historical/location/${locationId}`,
      {
        params: {
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          limit: 1000,
          sortBy: 'date',
          sortOrder: 'ASC'
        }
      }
    );
    return response.data.records;
  } catch (error) {
    toast.error('Failed to load historical data');
    throw error;
  }
};

// GET with custom headers
const fetchDataWithHeaders = async () => {
  const response = await api.get('/api/data', {
    headers: {
      'Custom-Header': 'value'
    },
    timeout: 5000
  });
};
```

#### POST Requests
```typescript
// Create a new farmer
const createFarmer = async (farmerData: CreateFarmerData) => {
  try {
    const response = await api.post<ApiResponse>('/api/admin/farmers', farmerData);
    toast.success('Farmer created successfully');
    return response.data;
  } catch (error) {
    toast.error('Failed to create farmer');
    throw error;
  }
};

// POST weather data for coordinates
const getWeatherByCoordinates = async (lat: number, lon: number, locationName: string) => {
  try {
    const response = await api.post<ApiResponse>('/api/weather/coordinates', {
      lat,
      lon,
      locationName,
      type: 'daily'
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get weather by coordinates:', error);
    throw error;
  }
};

// POST with query parameters
const sendAlert = async (alertData: AlertData) => {
  const response = await api.post('/api/alerts', alertData, {
    params: {
      broadcast: true,
      priority: 'high'
    }
  });
};
```

#### PUT Requests
```typescript
// Update farmer information
const updateFarmer = async (id: number, updateData: UpdateFarmerData) => {
  try {
    const response = await api.put<ApiResponse>(`/api/admin/farmers/${id}`, updateData);
    toast.success('Farmer updated successfully');
    return response.data;
  } catch (error) {
    toast.error('Failed to update farmer');
    throw error;
  }
};
```

#### DELETE Requests
```typescript
// Delete a farmer
const deleteFarmer = async (id: number) => {
  try {
    await api.delete(`/api/admin/farmers/${id}`);
    toast.success('Farmer deleted successfully');
  } catch (error) {
    toast.error('Failed to delete farmer');
    throw error;
  }
};

// DELETE with query parameters
const archiveData = async (id: number) => {
  await api.delete(`/api/data/${id}`, {
    params: {
      archive: true,
      reason: 'cleanup'
    }
  });
};
```

#### File Upload
```typescript

const importFarmers = async (file: File) => {
  try {
    const response = await api.uploadFile<ApiResponse>(
      '/api/admin/farmers/import', 
      file
    );
    toast.success(`Imported ${response.data.created} farmers`);
    return response.data;
  } catch (error) {
    toast.error('Failed to import farmers');
    throw error;
  }
};

// Upload with custom options
const uploadDocument = async (file: File) => {
  const response = await api.uploadFile('/api/documents', file, {
    headers: {
      'Document-Type': 'weather-report'
    },
    timeout: 30000
  });
};
```

#### CSV Export
```typescript
const exportFarmers = (farmers: Farmer[]) => {
  try {
    const exportData = farmers.map(farmer => ({
      'Name': farmer.name,
      'Phone': farmer.phone,
      'Locations': farmer.locations.map(loc => loc.name).join('; '),
      'Status': farmer.isActive ? 'Active' : 'Inactive',
      'Created': new Date(farmer.createdAt).toLocaleDateString()
    }));

    api.exportAsCSV(exportData, 'farmers_export.csv');
    toast.success('Data exported successfully');
  } catch (error) {
    toast.error('Failed to export data');
  }
};
```