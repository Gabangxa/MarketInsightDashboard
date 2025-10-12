# Real-Time Market Dashboard Design Guidelines

## Design Approach

**Selected Framework**: Data-Intensive Dashboard System
**Primary References**: TradingView, Binance Terminal, Bloomberg Terminal
**Rationale**: This is a utility-focused, information-dense monitoring tool where data clarity, real-time performance, and efficient scanning are paramount. The design prioritizes rapid information consumption over aesthetic appeal.

---

## Core Design Principles

1. **Information Hierarchy**: Critical data (prices, alerts) must be immediately scannable
2. **Data Density with Clarity**: Maximize information display without overwhelming users
3. **Real-time Responsiveness**: Visual feedback for live data updates
4. **Functional Aesthetics**: Beauty through precise data presentation, not decoration

---

## Color Palette

### Dark Mode Foundation (Primary Theme)
- **Background Layers**: 
  - Primary: 220 15% 8% (deep charcoal)
  - Secondary: 220 15% 12% (widget backgrounds)
  - Tertiary: 220 15% 16% (elevated elements)
- **Text Colors**:
  - Primary: 0 0% 95% (main content)
  - Secondary: 220 10% 65% (supporting text)
  - Muted: 220 10% 45% (labels, metadata)

### Semantic Data Colors
- **Positive/Buy**: 142 76% 45% (vibrant green for bids, price increases)
- **Negative/Sell**: 0 84% 60% (strong red for asks, price decreases)
- **Neutral/Info**: 217 91% 60% (blue for neutral data, links)
- **Warning**: 38 92% 50% (amber for alerts, attention)
- **Bookmark**: 271 76% 65% (purple for bookmarked items)

### Accent & Interaction
- **Primary Action**: 217 91% 60% (blue for buttons, focus states)
- **Hover State**: 217 91% 70% (lighter blue)
- **Border/Divider**: 220 15% 20% (subtle separators)
- **Success Feedback**: 142 76% 45% (green for confirmations)

---

## Typography

### Font System
- **Primary Font**: 'Inter' (Google Fonts) - Optimized for data display, excellent number legibility
- **Monospace Font**: 'JetBrains Mono' (Google Fonts) - For prices, order books, technical data

### Type Scale
- **Data Display (Prices)**: text-2xl to text-4xl, font-semibold, tracking-tight
- **Widget Titles**: text-sm, font-semibold, uppercase, tracking-wide
- **Body Text**: text-sm, font-normal
- **Labels/Metadata**: text-xs, font-medium
- **Timestamps**: text-xs, font-mono, text-muted

---

## Layout System

### Spacing Primitives
**Primary Units**: Tailwind units of 2, 4, 6, and 8
- **Micro spacing** (p-2, gap-2): Between related data points
- **Component padding** (p-4): Standard widget internal spacing
- **Section spacing** (p-6, gap-6): Between widget sections
- **Grid gaps** (gap-8): Between dashboard widgets

### Grid Structure
- **Dashboard Grid**: Use react-grid-layout with 12-column responsive grid
- **Widget Minimum**: 3 columns wide, 2 rows tall
- **Widget Padding**: p-4 consistent across all widgets
- **Responsive Breakpoints**: 
  - Mobile: Single column stack
  - Tablet: 6-column grid
  - Desktop: 12-column grid

---

## Component Library

### Widget Container
- Background: Secondary (220 15% 12%)
- Border: 1px solid 220 15% 20%
- Border radius: rounded-lg
- Shadow: shadow-lg with subtle glow on hover
- Header: Sticky with title, config icon, drag handle

### Market Data Display
- **Price Display**: Large monospace numbers, color-coded by movement
- **Change Indicators**: Small pills with percentage, up/down arrows
- **Volume**: Smaller secondary text with abbreviation (M, B)
- **Update Flash**: Subtle background pulse on value change (green/red 200ms)

### Order Book Widget
- **Table Layout**: 3-column grid (Price | Size | Total)
- **Row Height**: py-1.5 for density
- **Bids**: Green gradient intensity based on depth
- **Asks**: Red gradient intensity based on depth
- **Spread Indicator**: Central divider showing bid-ask spread
- **Exchange Badge**: Small pill showing source exchange(s)

### Webhook Message Card
- **Card Container**: bg-tertiary, border-l-4 with source color coding
- **Timestamp**: Top-right, text-xs, monospace
- **Message Preview**: text-sm, line-clamp-2 for truncation
- **Bookmark Button**: Star icon, top-left, toggle state with fill
- **Expand Button**: View full message in modal/panel

### Alert Configuration Panel
- **Sliding Panel**: Right-side drawer, w-96, shadow-2xl
- **Form Inputs**: Dark input fields with focus:ring-blue
- **Exchange Selector**: Multi-select chips with checkboxes
- **Condition Builder**: Dropdowns for comparison operators
- **Save Button**: Primary blue, full width at bottom

### Filter Controls
- **Time Filter**: Button group, active state with primary background
- **Keyword Search**: Input with search icon, instant filter
- **Bookmark Filter**: Toggle button with count badge
- **Clear Filters**: Ghost button, secondary text

### Toast Notifications
- **Position**: Top-right, fixed, z-50
- **Container**: backdrop-blur-sm, bg-black/80, border with alert color
- **Auto-dismiss**: 5 seconds with progress bar
- **Stack**: Multiple toasts stack vertically with gap-2
- **Icon**: Alert type icon (warning, success, error) on left

### Drag & Drop Indicators
- **Drag Handle**: Six-dot icon, visible on hover, cursor-grab
- **Drop Zone**: Dashed border, blue tint overlay
- **Dragging State**: opacity-50, shadow-2xl, rotate-2

---

## Interactive States

### Data Updates
- **Price Increase Flash**: bg-green/20, 300ms fade
- **Price Decrease Flash**: bg-red/20, 300ms fade
- **New Webhook**: Slide-in animation from right, 400ms
- **Alert Trigger**: Toast + widget border pulse (warning color)

### User Actions
- **Button Hover**: Slight scale (scale-105), shadow increase
- **Button Active**: scale-95, 100ms
- **Input Focus**: ring-2, ring-primary
- **Checkbox/Toggle**: Smooth slide transition, 200ms

---

## Animations (Minimal & Purposeful)

- **Widget Reorder**: Smooth position transition, 300ms ease-in-out
- **Panel Slide**: translate-x, 250ms ease-out
- **Data Refresh**: Subtle rotate on refresh icon, 500ms
- **Skeleton Loading**: Shimmer effect for loading states
- **Alert Pulse**: Border pulse animation, 2s infinite for critical alerts

---

## Accessibility & Dark Mode

- **Contrast Ratios**: All text meets WCAG AA (4.5:1 minimum)
- **Focus Indicators**: Visible 2px focus rings on all interactive elements
- **Color Independence**: Icons and labels supplement color coding
- **Keyboard Navigation**: Full keyboard support for all widgets
- **Screen Reader**: Proper ARIA labels for real-time data updates

---

## Performance Considerations

- **Virtualization**: Use virtual scrolling for long webhook lists
- **Debouncing**: 300ms debounce on keyword filters
- **Throttling**: Throttle price updates to max 10/second per widget
- **Lazy Loading**: Load inactive widgets on-demand
- **Bundle Size**: Icons via Heroicons, minimize dependencies