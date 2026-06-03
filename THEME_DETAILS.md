# Application Theme Details

This document outlines the color palettes and typography used across both the Mobile App and the Web App for this project.

## 📱 Mobile App (React Native / Expo)

### Fonts
The mobile app primarily uses the following custom font:
- **Primary Font**: `SpaceMono` (loaded from `assets/fonts/SpaceMono-Regular.ttf`)
- *(Note: It also uses default system fonts where `SpaceMono` is not explicitly applied.)*

### Color Palette

The mobile application defines its colors in `constants/Colors.ts`, supporting both light and dark modes.

#### Light Mode
- **Background**: `#fff`
- **Text**: `#11181C`
- **Tint (Primary)**: `#0a7ea4`
- **Icon**: `#687076`
- **Tab Icon Default**: `#687076`
- **Tab Icon Selected**: `#0a7ea4`

#### Dark Mode
- **Background**: `#151718`
- **Text**: `#ECEDEE`
- **Tint (Primary)**: `#fff`
- **Icon**: `#9BA1A6`
- **Tab Icon Default**: `#9BA1A6`
- **Tab Icon Selected**: `#fff`

---

## 💻 Web App (React / Vite)

### Fonts
The web application uses system-native font stacks defined in `webapp/src/index.css`.
- **Sans-serif (Body)**: `system-ui, 'Segoe UI', Roboto, sans-serif`
- **Heading**: `system-ui, 'Segoe UI', Roboto, sans-serif`
- **Monospace (Code)**: `ui-monospace, Consolas, monospace`

### Color Palette

The web application relies on CSS variables for its color scheme, supporting both light and dark modes.

#### Light Mode
- **Background (`--bg`)**: `#fff`
- **Text (`--text`)**: `#6b6375`
- **Heading Text (`--text-h`)**: `#08060d`
- **Accent (`--accent`)**: `#aa3bff`
- **Accent Background**: `rgba(170, 59, 255, 0.1)`
- **Accent Border**: `rgba(170, 59, 255, 0.5)`
- **Border**: `#e5e4e7`
- **Code Background (`--code-bg`)**: `#f4f3ec`
- **Social Background (`--social-bg`)**: `rgba(244, 243, 236, 0.5)`

#### Dark Mode
- **Background (`--bg`)**: `#16171d`
- **Text (`--text`)**: `#9ca3af`
- **Heading Text (`--text-h`)**: `#f3f4f6`
- **Accent (`--accent`)**: `#c084fc`
- **Accent Background**: `rgba(192, 132, 252, 0.15)`
- **Accent Border**: `rgba(192, 132, 252, 0.5)`
- **Border**: `#2e303a`
- **Code Background (`--code-bg`)**: `#1f2028`
- **Social Background (`--social-bg`)**: `rgba(47, 48, 58, 0.5)`
