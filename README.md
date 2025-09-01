# HabitHearts 💕

A couple-centered habit tracking app that helps partners build healthy habits together.

## Overview

HabitHearts is a beautifully designed mobile application that allows couples to:
- Track daily habits and tasks together
- Share calendar events and important dates
- Set and achieve goals as a team
- Connect with their partner through a unique linking system

## Key Features

### 🏠 Home Screen
- Personalized greeting with your name
- Upcoming shared events display
- Collaborative task management
- Visual indicators for tasks created by you or your partner

### 📅 Calendar
- Month view calendar with event indicators
- Color-coded events (pink for personal, green for shared)
- Easy event creation with modal interface
- Upcoming events list for the current month

### 🎯 Goals
- Shared goal setting and tracking
- Visual progress indicators
- Collaborative goal management

### 👥 Profile
- Personal profile information
- Unique linking code to connect with your partner
- Partner linking system
- List of connected partners

## Design Improvements

We've enhanced the app with a more aesthetically pleasing, couple-centered design:

### Color Scheme
- Soft pink (`#FF6B9D`) as the primary color representing love and connection
- Clean white surfaces with subtle shadows for depth
- Warm background tones for a cozy feel
- Green accents for shared/collaborative features

### UI Components
- Modern card-based design with rounded corners
- Consistent spacing and typography
- Improved button styles with better feedback
- Enhanced loading states with skeleton screens
- Visual indicators for shared vs personal items

### Navigation
- Custom tab bar with heart-themed icons
- Improved visual hierarchy
- Better touch targets for mobile use

## Technical Implementation

### Theme System
The app uses a centralized theme system:
- `src/theme/colors.ts` - Color palette
- `src/theme/styles.ts` - Common styles and components

### Screens
Each screen has been redesigned with:
- Consistent styling using the theme
- Better organization of components
- Improved user feedback (loading states, disabled buttons)
- Enhanced visual hierarchy

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Firebase and Google Sign-In
4. Run the app: `npx react-native run-android` or `npx react-native run-ios`

## Contributing

Feel free to contribute to the project by:
1. Forking the repository
2. Creating a feature branch
3. Making your changes
4. Submitting a pull request

## License

This project is licensed under the MIT License.