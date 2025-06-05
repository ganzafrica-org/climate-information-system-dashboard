# GanzAfrica Climate Information System

A localized weather and farming advisory system for farmers in Musanze region, Rwanda. This application provides real-time weather forecasts, agricultural alerts, historical data analysis, and farmer management tools.

## Features

- **Dashboard**: Overview of current weather conditions and farming advisories
- **Weather Forecasts**: 7-day weather predictions with farming recommendations
- **Historical Data**: Analysis of weather trends and patterns
- **Weather Alerts**: Timely notifications for weather events
- **Farmer Management**: Registration and organization of farmer information
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
- `/src/hooks`: Custom React hooks
- `/src/lib`: Utility functions and configurations
- `/src/styles`: Global CSS and styling utilities
- `/src/i18n`: Internationalization setup
- `/src/locales`: Translation files

## API Client

The project uses a custom API client for handing data.

### Setup

The API client is already configured in the project. The main setup happens in:
- `src/lib/apiClient.ts`: The main API client with request methods
- `src/lib/queryProvider.tsx`: The React Query provider component
- `src/pages/_app.tsx`: Where the QueryProvider wraps the application

### Using the API Client

The API client provides a simple interface with `{ data, isLoading, error }` for all API requests.

#### GET Request
```tsx
import { apiClient } from '@/lib/apiClient';

function MyComponent() {
  // Simple GET
  const { data, isLoading, error } = apiClient.get('/forecasts', {
    params: { region: 'Musanze' }
  });

  // GET with pagination
  const { data: paginatedData, isLoading: loadingPaginated, error: paginationError } = 
    apiClient.get('/farmers', {
      pagination: { page: 1, pageSize: 10 }
    });

  // Rest of your component...
}
```

#### POST Request
```tsx
import { apiClient } from '@/lib/apiClient';
import { useState } from 'react';

function CreateComponent() {
  const [submittedData, setSubmittedData] = useState(null);
  
  const handleSubmit = (formData) => {
    // Set state to trigger the POST request
    setSubmittedData(formData);
  };

  // POST request happens when submittedData is set
  const { data, isLoading, error } = apiClient.post('/alerts', {
    data: submittedData
  });

  // Rest of your component...
}
```

#### PUT Request
```tsx
import { apiClient } from '@/lib/apiClient';
import { useState } from 'react';

function UpdateComponent({ itemId }) {
  const [updateData, setUpdateData] = useState(null);
  
  const handleUpdate = (formData) => {
    setUpdateData(formData);
  };

  // PUT request happens when updateData is set
  const { data, isLoading, error } = apiClient.put(`/items/${itemId}`, {
    data: updateData
  });
}
```

#### DELETE Request
```tsx
import { apiClient } from '@/lib/apiClient';
import { useState } from 'react';

function DeleteComponent({ itemId }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setConfirmDelete(true);
    }
  };

  // DELETE request happens when confirmDelete is set to true
  const { data, isLoading, error } = apiClient.delete(`/items/${itemId}`, {
    data: confirmDelete
  });

  // Rest of your component...
}
```
