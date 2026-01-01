# Chat Implementation Guide

This document explains the complete chat functionality implementation with AI-powered data visualization.

## Overview

The chat feature allows users to ask natural language questions about their data and receive AI-generated responses with interactive visualizations including bar charts, line charts, pie charts, and data tables.

## Architecture

```
User Input → API Chat Endpoint → AI Processing → Visualization Response → UI Rendering
```

### Flow:
1. **User asks a question** about their selected datasource
2. **Backend processes** the question through:
   - Intent Detection (LLM - Gemini 2.5 Flash)
   - Query Planning (Deterministic)
   - Query Execution (DuckDB)
   - Visualization Recommendation (Deterministic)
   - Insight & Explanation (LLM - Gemini 2.5 Flash)
3. **Frontend receives** structured response with:
   - Query results (columns + data)
   - Visualization type and configuration
   - AI-generated explanation
4. **UI renders** appropriate chart or table with insights

## Files Structure

### Core Components

#### 1. **Workspace Component** ([src/pages/Workspace.tsx](src/pages/Workspace.tsx))
Main chat interface with:
- Message list display
- Datasource selector
- Input field with send functionality
- Auto-scrolling to latest messages
- Loading states and error handling

**Key Features:**
```typescript
- Loads datasources from workspace
- Auto-selects first datasource
- Manages chat message state
- Handles API calls to chat endpoint
- Real-time message updates
```

#### 2. **ChatMessage Component** ([src/components/chat/ChatMessage.tsx](src/components/chat/ChatMessage.tsx))
Renders individual messages:
- User messages with avatar
- AI messages with response visualization
- Timestamp and metadata

#### 3. **ChartVisualization Component** ([src/components/chat/ChartVisualization.tsx](src/components/chat/ChartVisualization.tsx))
Main visualization router:
- Determines chart type from API response
- Renders appropriate chart component
- Displays insights and explanations
- Shows data summary (row/column count)

### Chart Components

#### 4. **BarChart** ([src/components/chat/charts/BarChart.tsx](src/components/chat/charts/BarChart.tsx))
Horizontal bar chart with:
- Color-coded bars with gradients
- Responsive width based on values
- Labels and values display
- Auto-scales to max value
- Limits to top 10 items for readability

#### 5. **LineChart** ([src/components/chat/charts/LineChart.tsx](src/components/chat/charts/LineChart.tsx))
Line chart with:
- SVG-based rendering
- Interactive hover states
- Grid lines for reference
- Gradient line colors
- Limits to 20 data points

#### 6. **PieChart** ([src/components/chat/charts/PieChart.tsx](src/components/chat/charts/PieChart.tsx))
Pie chart with:
- SVG path rendering
- Color-coded slices
- Interactive legend
- Percentage display
- Limits to top 8 slices

#### 7. **DataTable** ([src/components/chat/charts/DataTable.tsx](src/components/chat/charts/DataTable.tsx))
Paginated data table with:
- 10 rows per page
- Previous/Next pagination
- Formatted cell values (numbers, booleans)
- Responsive design

### API Integration

#### 8. **API Types** ([src/types/api.ts](src/types/api.ts))
TypeScript interfaces matching backend schema:

```typescript
interface IntentRequest {
  question: string;
  datasource_id: string;
}

interface ChatWorkflowResponse {
  intent: string;
  query: string | null;
  result: QueryResult | null;
  visualization: VisualizationRecommendation | null;
  explanation: string;
  error?: string | null;
}

interface QueryResult {
  columns: string[];
  data: Record<string, any>[];
  row_count: number;
}

interface VisualizationRecommendation {
  chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'none';
  x_axis?: string;
  y_axis?: string;
  title?: string;
  description?: string;
}
```

#### 9. **API Client** ([src/services/apiClient.ts](src/services/apiClient.ts))
Chat API method:

```typescript
async sendChatMessage(
  authToken: string,
  question: string,
  datasourceId: string
): Promise<ChatWorkflowResponse>
```

**Endpoint:** `POST /api/chat/`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "question": "What are the top products?",
  "datasource_id": "datasource-uuid"
}
```

## User Flow

### 1. Initial State
- User lands on workspace page
- Datasources are loaded automatically
- First datasource is auto-selected
- Empty chat state with welcome message

### 2. Asking a Question
1. User types question in input field
2. Presses Enter or clicks Send button
3. User message appears immediately
4. Loading indicator (typing animation) shows
5. API call is made with Bearer token auth

### 3. Receiving Response
1. API returns structured response
2. AI message is added to chat
3. Explanation text is displayed
4. Visualization is rendered based on `chart_type`
5. Data summary shows row/column counts
6. Auto-scroll to latest message

### 4. Chart Rendering Logic

**Bar Chart** - Used for:
- Comparing values across categories
- Top N items by value
- Sales by product, etc.

**Line Chart** - Used for:
- Trends over time
- Sequential data
- Time series analysis

**Pie Chart** - Used for:
- Percentage distribution
- Part-to-whole relationships
- Market share, etc.

**Data Table** - Used for:
- Raw data display
- When no specific chart type recommended
- Fallback visualization

### 5. Error Handling

**No Datasource Selected:**
```
Error banner: "Please select a datasource first"
Input disabled until datasource selected
```

**API Error:**
```typescript
{
  type: 'ai',
  content: 'Sorry, I encountered an error...',
  response: {
    error: 'Detailed error message'
  }
}
```

**Network Error:**
```
Caught in try-catch
Error message added to chat
User can retry
```

## Styling

### Key CSS Files

1. **[Workspace.css](src/pages/Workspace.css)** - Main chat layout
2. **[ChartVisualization.css](src/components/chat/ChartVisualization.css)** - Chart container styles
3. **[BarChart.css](src/components/chat/charts/BarChart.css)** - Bar chart specific styles
4. **[LineChart.css](src/components/chat/charts/LineChart.css)** - Line chart SVG styles
5. **[PieChart.css](src/components/chat/charts/PieChart.css)** - Pie chart and legend
6. **[DataTable.css](src/components/chat/charts/DataTable.css)** - Table and pagination

### Design Features

- **Gradient backgrounds** for visual appeal
- **Smooth animations** for loading states
- **Responsive layouts** for all screen sizes
- **Interactive hover states** on charts
- **Color-coded data** for easy interpretation
- **Clean typography** for readability

## Example API Responses

### Bar Chart Example
```json
{
  "intent": "comparison",
  "query": "SELECT product, SUM(sales) as total_sales FROM data GROUP BY product ORDER BY total_sales DESC LIMIT 10",
  "result": {
    "columns": ["product", "total_sales"],
    "data": [
      {"product": "Product A", "total_sales": 12300},
      {"product": "Product B", "total_sales": 9800},
      {"product": "Product C", "total_sales": 7500}
    ],
    "row_count": 3
  },
  "visualization": {
    "chart_type": "bar",
    "x_axis": "product",
    "y_axis": "total_sales",
    "title": "Top Products by Sales",
    "description": "Sales performance across products"
  },
  "explanation": "Product A leads with 12,300 total sales, outperforming Product B by 25%."
}
```

### Line Chart Example
```json
{
  "intent": "trend_analysis",
  "query": "SELECT date, revenue FROM data ORDER BY date",
  "result": {
    "columns": ["date", "revenue"],
    "data": [
      {"date": "2024-01", "revenue": 45000},
      {"date": "2024-02", "revenue": 52000},
      {"date": "2024-03", "revenue": 48000}
    ],
    "row_count": 3
  },
  "visualization": {
    "chart_type": "line",
    "x_axis": "date",
    "y_axis": "revenue",
    "title": "Revenue Trend",
    "description": "Monthly revenue over time"
  },
  "explanation": "Revenue peaked in February at $52,000, showing a 15.6% increase from January."
}
```

### Table Example
```json
{
  "intent": "data_retrieval",
  "query": "SELECT * FROM customers LIMIT 100",
  "result": {
    "columns": ["id", "name", "email", "total_purchases"],
    "data": [
      {"id": 1, "name": "John Doe", "email": "john@example.com", "total_purchases": 5},
      {"id": 2, "name": "Jane Smith", "email": "jane@example.com", "total_purchases": 8}
    ],
    "row_count": 2
  },
  "visualization": {
    "chart_type": "table",
    "title": "Customer Data",
    "description": "List of customers and their purchase history"
  },
  "explanation": "Here are the customer records showing ID, name, email, and total purchases."
}
```

## Features

### ✅ Implemented

- Real-time chat interface
- Multiple chart types (bar, line, pie, table)
- Datasource selection
- Auto-scrolling messages
- Loading indicators
- Error handling
- Responsive design
- Pagination for tables
- Data limits for charts (top N items)
- Gradient color schemes
- Interactive hover states
- Message timestamps
- Bearer token authentication
- Empty state messaging

### 🎨 UI/UX Highlights

1. **Engaging Visualizations**
   - Smooth transitions
   - Color gradients
   - Clear labels and values
   - Responsive sizing

2. **User-Friendly Interface**
   - Clear datasource selector
   - Disabled states when not ready
   - Helpful placeholder text
   - Error banners with dismiss

3. **Smart Defaults**
   - Auto-select first datasource
   - Limit chart data for readability
   - Fallback to table when needed
   - Pagination for large datasets

4. **Accessibility**
   - Keyboard support (Enter to send)
   - Focus states on inputs
   - Clear error messages
   - Semantic HTML

## Testing

### Manual Testing Steps

1. **Upload a datasource** via SideMenu
2. **Select the datasource** from dropdown
3. **Ask a question** like:
   - "What are the top 5 products by sales?"
   - "Show me revenue trends over time"
   - "What's the distribution of customers by region?"
4. **Verify:**
   - Message appears immediately
   - Loading indicator shows
   - Response renders correctly
   - Chart type matches data
   - Explanation is clear
   - No console errors

### Edge Cases

- **No datasource:** Input disabled, warning shown
- **Empty response:** Graceful fallback to table
- **Large dataset:** Pagination/limits applied
- **API error:** Error message displayed
- **Network timeout:** Retry available

## Customization

### Adding New Chart Types

1. Create component in `src/components/chat/charts/`
2. Add CSS file for styling
3. Update `ChartVisualization.tsx` switch statement
4. Add type to `VisualizationRecommendation` interface

### Styling Modifications

All colors use CSS variables from root:
- `--primary-*` for main brand colors
- `--gray-*` for neutral colors
- `--radius-*` for border radius
- `--spacing-*` for consistent spacing

## Performance

- **Chart limits** prevent rendering thousands of items
- **Pagination** for tables improves load time
- **Auto-scroll** uses smooth behavior
- **Lazy rendering** only visible messages
- **Optimized re-renders** with proper React keys

## Security

- **Bearer token auth** on all API calls
- **Input sanitization** (handled by backend)
- **XSS prevention** via React's auto-escaping
- **CORS** configured on backend

## Future Enhancements

- [ ] Message history persistence
- [ ] Export charts as images
- [ ] Multiple datasource queries
- [ ] Chart customization options
- [ ] Voice input support
- [ ] Message search/filter
- [ ] Favorite/pin important insights
- [ ] Share insights via link
- [ ] Real-time collaboration
- [ ] Chart annotations

## Troubleshooting

**Charts not rendering:**
- Check browser console for errors
- Verify API response format
- Ensure visualization type is supported

**API calls failing:**
- Check backend is running
- Verify `VITE_API_BASE_URL` in `.env`
- Confirm Bearer token is valid
- Check CORS configuration

**Datasources not loading:**
- Verify workspace ID in URL
- Check datasource API endpoint
- Confirm user has access to workspace

**Styling issues:**
- Clear browser cache
- Check CSS file imports
- Verify CSS variable definitions

## Support

For issues or questions:
1. Check browser console for errors
2. Review API response in Network tab
3. Verify environment variables
4. Test with simple questions first
5. Check backend logs for API errors
