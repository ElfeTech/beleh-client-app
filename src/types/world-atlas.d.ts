declare module 'world-atlas/countries-110m.json' {
  import type { GeometryCollection, Topology } from 'topojson-specification';

  interface CountryProperties {
    name: string;
    [key: string]: unknown;
  }

  const topology: Topology<{
    countries: GeometryCollection<CountryProperties>;
    land: GeometryCollection;
  }>;
  export default topology;
}
