# StatusBarManager

The StatusBarManager system provides dynamic status bar color synchronization between the system status bar and the app's internal status bar.

## Features

- Automatic synchronization of system status bar with app theme
- Support for both Android and iOS
- Dynamic updates when navigating between screens
- Easy integration with different screen themes

## Usage

### Basic Setup

The StatusBarProvider is already integrated in `App.tsx`. No additional setup is required.

### Using in Screens

To customize the status bar for a specific screen, import and use the `useStatusBar` hook:

```tsx
import { useStatusBar } from '../context/StatusBarContext';
import colors from '../theme/colors';

const MyScreen = () => {
  const { setStatusBar } = useStatusBar();

  useEffect(() => {
    // Set status bar to match the screen's theme
    setStatusBar(colors.surface, 'dark-content');
  }, [setStatusBar]);

  return (
    // Your screen content
  );
};
```

### Parameters

- `backgroundColor`: The background color for the status bar (Android only)
- `barStyle`: The style of the status bar text
  - `'dark-content'`: Dark text on light background (default)
  - `'light-content'`: Light text on dark background
  - `'default'`: Default platform style

## Examples

### Light Theme Screen
```tsx
useEffect(() => {
  setStatusBar('#FFFFFF', 'dark-content');
}, [setStatusBar]);
```

### Dark Theme Screen
```tsx
useEffect(() => {
  setStatusBar('#0A192F', 'light-content');
}, [setStatusBar]);
```

### Colored Screen
```tsx
useEffect(() => {
  setStatusBar(colors.electricBlue, 'light-content');
}, [setStatusBar]);
```