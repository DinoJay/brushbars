# Mirth Dashboard

A Svelte 5 dashboard application for monitoring Mirth Connect logs and activity.

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
