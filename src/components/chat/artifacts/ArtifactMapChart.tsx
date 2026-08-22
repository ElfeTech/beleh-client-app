import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, Geometry } from 'geojson';
import type { MapData } from '../../../types/api';
import { isValidMapData } from '../../../utils/artifactAdapters';
import { matchCountryKey, normalizeCountryKey } from '../../../utils/countryMatch';
import {
  formatScaleValue,
  normalizeToDomain,
  sequentialBlue,
} from '../../../utils/sequentialBlueScale';
import '../charts/BarChart.css';
import './artifacts.css';

const MAP_WIDTH = 960;
const MAP_HEIGHT = 480;
const ANTARCTICA_ID = '010';

type CountryFeature = Feature<Geometry, { name: string }>;

interface ArtifactMapChartProps {
  data: MapData;
  isExpanded?: boolean;
}

interface HoveredRegion {
  name: string;
  value: number | null;
  clientX: number;
  clientY: number;
}

export function ArtifactMapChart({ data, isExpanded = false }: ArtifactMapChartProps) {
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hovered, setHovered] = useState<HoveredRegion | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('world-atlas/countries-110m.json')
      .then((mod) => {
        if (cancelled) return;
        const topo = mod.default;
        const collection = feature(topo, topo.objects.countries);
        const features = (collection.features as CountryFeature[]).filter(
          (f) => String(f.id) !== ANTARCTICA_ID,
        );
        setCountries(features);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { valueByCountryKey, min, max, unmatched } = useMemo(() => {
    const index = new Set<string>();
    if (countries) {
      for (const f of countries) index.add(normalizeCountryKey(f.properties.name));
    }
    const values = new Map<string, number>();
    const missed: string[] = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const region of data.regions) {
      const key = countries ? matchCountryKey(index, region.location) : null;
      if (!key) {
        missed.push(region.location);
        continue;
      }
      const total = (values.get(key) ?? 0) + region.value;
      values.set(key, total);
    }
    for (const v of values.values()) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 0;
    }
    return { valueByCountryKey: values, min: lo, max: hi, unmatched: missed };
  }, [countries, data.regions]);

  const pathFor = useMemo(() => {
    if (!countries) return null;
    const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], {
      type: 'FeatureCollection',
      features: countries,
    });
    return geoPath(projection);
  }, [countries]);

  if (!isValidMapData(data)) {
    return <div className="chart-error">No data available</div>;
  }
  if (loadError) {
    return <div className="chart-error">Could not load the world map.</div>;
  }
  if (!countries || !pathFor) {
    return <div className="artifact-map__loading">Loading map…</div>;
  }

  return (
    <div className="artifact-map" onMouseLeave={() => setHovered(null)}>
      <svg
        className="artifact-map__svg"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        style={{ maxHeight: isExpanded ? 560 : 420 }}
        role="img"
        aria-label={data.value_label ? `World map of ${data.value_label}` : 'World map'}
      >
        {countries.map((f, i) => {
          const key = normalizeCountryKey(f.properties.name);
          const value = valueByCountryKey.get(key);
          const hasValue = value != null;
          const fill = hasValue
            ? sequentialBlue(normalizeToDomain(value, min, max))
            : 'var(--bg-tertiary, #f1f5f9)';
          return (
            <path
              key={f.id ?? i}
              d={pathFor(f) ?? undefined}
              className={
                hasValue
                  ? 'artifact-map__country artifact-map__country--data'
                  : 'artifact-map__country'
              }
              fill={fill}
              onMouseEnter={(e) =>
                setHovered({
                  name: f.properties.name,
                  value: value ?? null,
                  clientX: e.clientX,
                  clientY: e.clientY,
                })
              }
              onMouseMove={(e) =>
                setHovered({
                  name: f.properties.name,
                  value: value ?? null,
                  clientX: e.clientX,
                  clientY: e.clientY,
                })
              }
            />
          );
        })}
      </svg>

      <div className="artifact-map__footer">
        <div className="artifact-map__legend" aria-hidden>
          <span>{formatScaleValue(min)}</span>
          <span
            className="artifact-map__legend-ramp"
            style={{
              background: `linear-gradient(to right, ${sequentialBlue(0)}, ${sequentialBlue(0.5)}, ${sequentialBlue(1)})`,
            }}
          />
          <span>{formatScaleValue(max)}</span>
          {data.value_label ? <span>· {data.value_label}</span> : null}
        </div>
        {unmatched.length > 0 ? (
          <p className="artifact-map__note">
            Not shown on map: {unmatched.slice(0, 4).join(', ')}
            {unmatched.length > 4 ? ` +${unmatched.length - 4} more` : ''}
          </p>
        ) : null}
      </div>

      {hovered ? (
        <div
          className="modern-chart-tooltip artifact-map__tooltip"
          style={{ left: hovered.clientX + 12, top: hovered.clientY + 12 }}
        >
          <div className="tooltip-label">{hovered.name}</div>
          <div className="tooltip-value">
            <span className="tooltip-value-label">{data.value_label || 'Value'}:</span>
            <span className="tooltip-value-number">
              {hovered.value == null ? 'No data' : formatScaleValue(hovered.value)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
