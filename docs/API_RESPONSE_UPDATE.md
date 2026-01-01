# API Response Format Update

## Summary

Updated the chat interface to properly parse and display the new API response format with enhanced visualization and insights.

## Changes Made

### 1. Updated Type Definitions ([src/types/api.ts](src/types/api.ts))

**New Interfaces:**
```typescript
// Request uses prompt and dataset_id
interface IntentRequest {
  prompt: string;        // Changed from: question
  dataset_id: string;    // Changed from: datasource_id
}

// Response structure with enhanced visualization
interface VisualizationRecommendation {
  visualization_type: 'BAR_CHART' | 'LINE_CHART' | 'PIE_CHART' | 'SCATTER_PLOT' | 'TABLE' | 'NONE';
  title: string;
  description: string;
  encoding: {
    x?: FieldEncoding;
    y?: FieldEncoding;
  };
  sorting?: SortingConfig;
  data_preview: Record<string, any>[];
  render_fallback: string;
  fallback_reason: string | null;
}

// New insight structure
interface InsightResponse {
  summary: string;
  key_insights: string[];
  supporting_facts: SupportingFact[];
  limitations: string;
  confidence: number;
}
```

### 2. Updated API Client ([src/services/apiClient.ts](src/services/apiClient.ts))

Fixed field mapping:
```typescript
const payload: IntentRequest = {
  prompt: question,           // Maps question → prompt
  dataset_id: datasourceId,   // Maps datasourceId → dataset_id
};
```

### 3. Updated Chart Visualization ([src/components/chat/ChartVisualization.tsx](src/components/chat/ChartVisualization.tsx))

**Key Changes:**
- Uses `data_preview` instead of `result.data`
- Parses `visualization_type` instead of `chart_type`
- Extracts field names from `encoding.x.field` and `encoding.y.field`
- Displays enhanced insights with:
  - Summary
  - Key insights (bulleted list)
  - Limitations (with warning styling)
  - Confidence percentage

**New Display Structure:**
```
┌─────────────────────────────────────┐
│ Chart Title                         │
│ Chart Description                   │
├─────────────────────────────────────┤
│                                     │
│    [Visualization Here]             │
│                                     │
├─────────────────────────────────────┤
│ Key Insights                        │
│ • Summary text                      │
│ • Key insight 1                     │
│ • Key insight 2                     │
│ • Key insight 3                     │
│                                     │
│ ⚠️ Note: Limitations text           │
│                                     │
│ 🔵 Confidence: 100%                 │
├─────────────────────────────────────┤
│ 6 data points | X: Region | Y: Revenue
└─────────────────────────────────────┘
```

### 4. Updated Chart Components

All chart components now use `encoding` fields:

**[BarChart.tsx](src/components/chat/charts/BarChart.tsx):**
```typescript
const xField = encoding.x?.field;  // Instead of: x_axis
const yField = encoding.y?.field;  // Instead of: y_axis
```

**[LineChart.tsx](src/components/chat/charts/LineChart.tsx):**
```typescript
const xField = encoding.x?.field;
const yField = encoding.y?.field;
```

**[PieChart.tsx](src/components/chat/charts/PieChart.tsx):**
```typescript
const xField = encoding.x?.field;
const yField = encoding.y?.field;
```

### 5. Enhanced Styling ([src/components/chat/ChartVisualization.css](src/components/chat/ChartVisualization.css))

Added new CSS classes:
- `.insight-list` - Bulleted list of key insights
- `.insight-limitations` - Warning box for data limitations
- `.insight-confidence` - Confidence badge with gradient background

## Example API Response

The interface now handles responses like:

```json
{
  "visualization": {
    "visualization_type": "PIE_CHART",
    "title": "Revenue by Region",
    "description": "Visualization of revenue across different region.",
    "encoding": {
      "x": {
        "field": "region",
        "type": "categorical",
        "label": "Region"
      },
      "y": {
        "field": "revenue",
        "type": "quantitative",
        "label": "Revenue",
        "format": "currency"
      }
    },
    "data_preview": [
      { "revenue": 3300.0, "region": "Europe" },
      { "revenue": 2795.0, "region": "Africa" }
    ]
  },
  "insight": {
    "summary": "Europe generated the highest revenue...",
    "key_insights": [
      "Europe achieved the highest revenue with $3300.0",
      "Africa was the second-highest contributor"
    ],
    "limitations": "The data provided is limited to...",
    "confidence": 1.0
  }
}
```

## Chart Type Mapping

| API Type | Component |
|----------|-----------|
| `BAR_CHART` | BarChart |
| `LINE_CHART` | LineChart |
| `PIE_CHART` | PieChart |
| `TABLE` | DataTable |
| `NONE` | DataTable (fallback) |

## Features

✅ **Enhanced Insights Display**
- AI-generated summary
- Bulleted key insights
- Data limitations warning
- Confidence score badge

✅ **Proper Field Mapping**
- Uses encoding.x.field and encoding.y.field
- Supports field labels from API
- Handles currency formatting hints

✅ **Backward Compatibility**
- Falls back to explanation if insight is missing
- Handles null/undefined values gracefully

✅ **Improved UX**
- Clear visual hierarchy
- Color-coded confidence badges
- Warning styling for limitations
- Responsive data summary

## Testing

The chat interface now correctly:
1. Sends `prompt` and `dataset_id` to the API
2. Parses `visualization_type` to select the right chart
3. Extracts field names from `encoding` object
4. Displays insights with summary, key points, limitations, and confidence
5. Shows data preview in appropriate chart format
