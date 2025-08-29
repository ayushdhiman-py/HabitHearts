# 📱 Couples App – Flow & Features  

## 1. Sign Up & Profile Creation  
- Each partner creates their own account (with name, photo, details).  
- A unique 6-character code is generated for every profile (e.g., `U7I24Y`).  
---
## 2. Account Linking  
- Each partner shares their code with the other.  
- Once both enter each other’s code, their accounts are linked together.  
- From this point, all features become shared between the two.  
---
## 3. Home Dashboard  
- Shows couple’s overview: upcoming events, goals, tasks, recent updates.  
- Both can see what the other added/changed in real time.  
---
## 4. Shared Features (After Linking)  
- **Shared Calendar** – Add events, anniversaries, reminders, instantly visible to both.  
- **Travel Planning** – Create itineraries, packing lists, and trip budgets.  
- **Tasks & Goals** – Manage joint to-do lists and personal/couple goals.  
- **Event Planning** – Plan birthdays, date nights, parties.  
- **Ideas Board** – Save random ideas (date ideas, gift ideas, business plans).  
- **Business Ideas Vault** – Share & brainstorm business concepts.  
- **Shared Notes & Lists** – Grocery, shopping, or movie lists.  
- **Mood Tracker** – Update mood daily; partner gets to see it.  
- **Finance Tracker** – Track expenses and budgets together.  
- **Bucket List** – Life goals and dream activities to complete together.  
- **Memory Timeline** – Store photos, milestones, and moments.  
- **Private Chat / Voice Notes** – Messaging & audio just for the couple.  
- **Habit Tracker** – Support each other’s habits (fitness, reading, etc.).  
- **Couple Challenges** – Fun challenges like *“30-day relationship goals.”*  
- **Surprise Mode** – Hide a surprise plan until reveal date.  
- **Reminders** – Automated alerts for anniversaries, tasks, bills, health checkups.  
- **Shared Journal** – A private diary for both.  
- **Polls & Voting** – Quick polls for decisions (like dinner/movie).  
- **Secret Wishlist** – Each partner adds gift wishes, shown only as hints.  
- **Emergency Info** – Health details, important contacts in case of emergency.  
---
## 5. Real-time Sync  
- Any action (adding an event, editing a goal, updating a task) instantly updates for both partners.  
---
## 6. Notifications  
- Push notifications for updates (e.g., *“Your partner added a new event on Sunday”*).  

###### ###### ###### ###### ###### ###### ###### ###### ###### ###### ###### ###### ###### ###### ###### ###### ###### 

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Firebase Setup

Before running the application, you need to set up Firebase:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. In the project settings, add a new web app
4. Copy the Firebase configuration values
5. Create a `.env` file in the root directory with the following content:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

6. For Google Sign-In, you'll also need to:
   - Enable Google Sign-In method in Firebase Authentication
   - Download the `google-services.json` file and place it in `android/app/`

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
