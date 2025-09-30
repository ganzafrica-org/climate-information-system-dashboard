**Guidance for Mapping Suitability and Susceptibility Layers**

**2. Selection or Filtering**
Intersected suitability and susceptibility layers contain classification information (e.g., "Very Suitable", "Highly Susceptible") linked to administrative boundaries — sector, cell, and village.
Users should be able to filter or select by these administrative levels to view corresponding suitability distributions.
For example, selecting a sector should display all intersected polygons within it and compute the total area (in hectares) for each suitability class.
Note: Selection can be performed either on the intersected layer itself or on the administrative boundary layers (sector, cell, village) — provided we can retrieve all polygons within the selected unit and aggregate their area using the area_ha field.

**3. Visualizations**
**3.1 Susceptibility Layer**
Susceptibility classes and their color codes:

**Susceptibility Class	Color Code**
Extremely Susceptible	#A80000
Highly Susceptible	#FF5500
Moderate Susceptible	#F5CA7A
Slightly Susceptible	#E1E1E1

**Overlay layers:**
Restricted Areas
District Boundary
Sectors (always visible)
Cells and Villages (visible upon selection)

**3.2 Suitability Layer**
Crop suitability classes and their color codes:

**Suitability Class	Color Code**
Very Suitable	#38A800
Suitable	#98E600
Moderate Suitable	#E9FFBE
Less Suitable	#FFEBAF
Not Suitable	#FF5500

**Overlay layers:**
Restricted Areas
District Boundary
Sectors (always visible)
Cells and Villages (visible upon selection)

**Visualization Settings**
Polygon Boundaries: Set polygon boundaries of the suitability_class and susceptibility_class layers to zero width to improve visual clarity.

**Code**

!pip install geopandas folium matplotlib

import geopandas as gpd
import folium
from branca.element import Template, MacroElement

# Load layers from GitHub
suitability_url = "https://raw.githubusercontent.com/MucyoNdera/Suitability-Vs-Susceptibility-Data-/main/data/Irish_Potatoes_Suitability_Layer.geojson"
district_url = "https://raw.githubusercontent.com/MucyoNdera/Suitability-Vs-Susceptibility-Data-/main/data/Musanze_District_Boundary.geojson"
sectors_url = "https://raw.githubusercontent.com/MucyoNdera/Suitability-Vs-Susceptibility-Data-/main/data/Sectors.geojson"
restricted_url = "https://raw.githubusercontent.com/MucyoNdera/Suitability-Vs-Susceptibility-Data-/main/data/Restricted_Areas.geojson"

gdf = gpd.read_file(suitability_url)
district = gpd.read_file(district_url)
sectors = gpd.read_file(sectors_url)
restricted = gpd.read_file(restricted_url)

# Reproject if needed
for layer in [gdf, district, sectors, restricted]:
    if layer.crs != "EPSG:4326":
        layer = layer.to_crs(epsg=4326)

# Suitability class color codes
suitability_colors = {
    "Very Suitable": "#38A800",
    "Suitable": "#98E600",
    "Moderate Suitable": "#E9FFBE",
    "Less Suitable": "#FFEBAF",
    "Not Suitable": "#FF5500"
}

# Style function for suitability (no boundaries)
def style_function(feature):
    suit_class = feature['properties']['Suitability_Class']
    return {
        'fillColor': suitability_colors.get(suit_class, '#CCCCCC'),
        'color': None,
        'weight': 0,
        'fillOpacity': 0.6,
    }

# Style functions for boundaries
def district_style(feature):
    return {'color': 'black', 'weight': 2, 'fillOpacity': 0}

def sectors_style(feature):
    return {'color': 'black', 'weight': 0.5, 'fillOpacity': 0}

def restricted_style(feature):
    return {'color': 'black', 'weight': 2, 'fillOpacity': 0.2}

# Folium map
m = folium.Map(location=[-1.95, 30.06], zoom_start=10, width="100vw", height="100vh")

# Add district boundary (no tooltip)
folium.GeoJson(
    district.to_json(),
    name="District Boundary",
    style_function=district_style
).add_to(m)

# Add sectors boundary (no tooltip)
folium.GeoJson(
    sectors.to_json(),
    name="Sector Boundaries",
    style_function=sectors_style
).add_to(m)

# Add restricted areas (shows NAME)
folium.GeoJson(
    restricted.to_json(),
    name="Restricted Areas",
    style_function=restricted_style,
    tooltip=folium.GeoJsonTooltip(fields=['NAME'])
).add_to(m)

# Add suitability layer (shows Suitability_Class and Area_ha) LAST so it's on top
folium.GeoJson(
    gdf.to_json(),
    style_function=style_function,
    tooltip=folium.GeoJsonTooltip(fields=['Suitability_Class', 'Area_ha'])
).add_to(m)

# Add layer control
folium.LayerControl().add_to(m)

# Categorical legend (top right, collapsible)
legend_html = """
{% macro html(this, kwargs) %}
<div style="
    position: fixed; 
    top: 50px; center: 50px; width: 220px; height: 180px; 
    background-color: white; z-index:9999; font-size:14px;
    border:2px solid grey; border-radius:8px; padding: 10px;">
    <b>Suitability Classes</b><br>
    <div style="margin-top:8px;">
        <span style="display:inline-block;width:18px;height:18px;background:#38A800;margin-right:8px;border-radius:3px;"></span> Very Suitable<br>
        <span style="display:inline-block;width:18px;height:18px;background:#98E600;margin-right:8px;border-radius:3px;"></span> Suitable<br>
        <span style="display:inline-block;width:18px;height:18px;background:#E9FFBE;margin-right:8px;border-radius:3px;"></span> Moderate Suitable<br>
        <span style="display:inline-block;width:18px;height:18px;background:#FFEBAF;margin-right:8px;border-radius:3px;"></span> Less Suitable<br>
        <span style="display:inline-block;width:18px;height:18px;background:#FF5500;margin-right:8px;border-radius:3px;"></span> Not Suitable<br>
    </div>
</div>
{% endmacro %}
"""

legend = MacroElement()
legend._template = Template(legend_html)
m.get_root().add_child(legend)

# Save map to HTML
m.save("Irish_Potato_Suitability_Map.html")

