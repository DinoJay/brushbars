# Mirth Dashboard

A modern, real-time dashboard application built with **Svelte 5** for monitoring and analyzing **Mirth Connect** logs, messages, and system activity. This tool provides comprehensive visibility into your Mirth Connect environment with interactive visualizations, real-time filtering, and powerful search capabilities.

## 🎯 What is Mirth Dashboard?

Mirth Dashboard is a web-based monitoring solution that helps DevOps engineers, system administrators, and developers:

- **Monitor real-time logs** from Mirth Connect channels and systems
- **Track message flow** and identify bottlenecks in data processing
- **Analyze performance metrics** with interactive timeline visualizations
- **Debug issues quickly** using advanced filtering and search tools
- **Gain insights** into system health and message patterns

## ✨ Key Features

### 📊 **Interactive Timeline Visualization**

- Real-time activity timeline with adaptive data grouping
- Interactive brush selection for precise time range filtering
- Visual highlighting of log levels (INFO, WARN, ERROR, DEBUG)
- Responsive design that adapts to dense data automatically

### 🔍 **Advanced Filtering & Search**

- Filter by log level, channel, and time range
- Real-time search across log messages and content
- Binary search optimization for large datasets
- Debounced filtering for smooth performance

### 📡 **Real-Time Monitoring**

- WebSocket integration for live log streaming
- Live updates without page refresh
- Real-time message count and statistics
- Channel health monitoring

### 🎨 **Modern User Interface**

- Built with Svelte 5 for optimal performance
- Responsive design that works on all devices
- Intuitive brush interactions for data exploration
- Clean, professional dashboard layout

## 🏗️ Architecture

### **Frontend Stack**

- **Svelte 5** - Modern reactive framework with runes
- **TypeScript** - Full type safety and better developer experience
- **D3.js** - Powerful data visualization library
- **Tailwind CSS** - Utility-first CSS framework

### **Data Management**

- **Centralized Store** - Svelte 5 reactive state management
- **Binary Search** - Optimized filtering for large datasets
- **Adaptive Grouping** - Smart data aggregation for performance
- **Debounced Updates** - Smooth UI interactions

### **Real-Time Features**

- **WebSocket Integration** - Live data streaming
- **Reactive Updates** - Automatic UI synchronization
- **Performance Optimization** - Efficient rendering and updates

## 🚀 Getting Started

### **Prerequisites**

- Node.js 20.19+ or 22.12+ or 24+
- npm or yarn package manager
- Mirth Connect instance running

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd mirth-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Configuration**

1. Configure your Mirth Connect connection settings
2. Set up WebSocket endpoints for real-time data
3. Adjust log aggregation and filtering preferences
4. Customize visualization settings as needed

## 📱 Usage

### **Dashboard Overview**

- **Day Selection** - Choose specific dates to analyze
- **Channel Filtering** - Focus on specific Mirth channels
- **Log Level Filtering** - Filter by severity (INFO, WARN, ERROR, DEBUG)
- **Timeline Navigation** - Use interactive brush to select time ranges

### **Data Exploration**

- **Brush Selection** - Click and drag on timeline to select time ranges
- **Real-Time Filtering** - See filtered results update instantly
- **Message Details** - Click on timeline bars to view detailed logs
- **Export Options** - Download filtered data for analysis

### **Performance Monitoring**

- **Message Throughput** - Track messages per second/minute
- **Error Rates** - Monitor error frequencies and patterns
- **Channel Health** - Identify slow or problematic channels
- **System Metrics** - Monitor overall system performance

## 🔧 Development

This project **MUST** use Svelte 5 syntax and patterns. All components must follow these rules:

## 🚨 Svelte 5 Rules

This project **MUST** use Svelte 5 syntax and patterns. All components must follow these rules:

### Mandatory Rules

1. **Use `$effect()` instead of `$:` for reactive statements**

   ```javascript
   // ❌ Don't do this (Svelte 4)
   $: console.log('count changed:', $count);

   // ✅ Do this (Svelte 5)
   $effect(() => {
   	console.log('count changed:', $count);
   });
   ```

2. **Use `state()` for reactive state**

   ```javascript
   // ❌ Don't do this
   let count = 0;

   // ✅ Do this
   let count = state(0);
   ```

3. **Use TypeScript for all components**

   ```html
   <!-- ❌ Don't do this -->
   <script>

   <!-- ✅ Do this -->
   <script lang="ts">
   ```

4. **Type your variables and events**

   ```javascript
   // ❌ Don't do this
   let element;
   function handleClick(event) { }

   // ✅ Do this
   let element: HTMLElement;
   function handleClick(event: MouseEvent) { }
   ```

### ESLint Rules Enforced

- `svelte/no-reactive-assignments`: Error - Use `$effect()` for assignments
- `svelte/no-reactive-declarations`: Warning - Prefer `$effect()` over `$:`
- `svelte/no-reactive-statements`: Warning - Prefer `$effect()` over `$:`
- `svelte/valid-compile`: Error - Ensure valid Svelte 5 syntax

### Deprecated Patterns (Do Not Use)

- `$:` reactive declarations
- `$:` reactive statements
- `$:` reactive assignments
- Untyped variables
- Direct DOM manipulation
- `any` types without justification

## Development

Once you've installed dependencies with `npm install`, start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Code Review Checklist

Before submitting code:

- [ ] All reactive statements use `$effect()`
- [ ] All variables are properly typed
- [ ] No `$:` syntax is used
- [ ] Events are properly typed
- [ ] ESLint passes without errors
- [ ] TypeScript compilation succeeds

## Resources

- [Svelte 5 Documentation](https://svelte.dev/docs)
- [Svelte 5 Migration Guide](https://svelte.dev/docs/v5-migration)
- [TypeScript with Svelte](https://svelte.dev/docs/typescript)
