---
name: ui-style
description: Applies the DreamTeam UI design system - a clean, modern aesthetic with neumorphic cards, soft shadows, heavy rounded corners, and generous whitespace. Use when building screens, components, or reviewing UI code.
---

# UI Style Skill

When building UI for DreamTeam Mobile, follow this design system inspired by modern iOS apps like Cal AI.

## Core Aesthetic

- **Light, airy feel** - White/light gray backgrounds
- **Soft depth** - Neumorphic shadows, not harsh drop shadows
- **Rounded everything** - Heavy border radius on all elements
- **Bold numbers** - Large, prominent numerical displays
- **Generous whitespace** - Don't crowd elements
- **Card-based layouts** - Content in soft, floating cards

---

## Color Palette

### Backgrounds
```
bg-white              # Primary background
bg-gray-50            # Secondary/card backgrounds
bg-gray-100           # Subtle contrast areas
```

### Accents
```
bg-emerald-500        # Success, completed, active states
bg-sky-500            # Primary actions (DreamTeam brand)
bg-red-500            # Destructive actions
bg-amber-500          # Warnings, streaks
```

### Text
```
text-gray-900         # Primary text
text-gray-600         # Secondary text
text-gray-400         # Muted/placeholder text
```

---

## Typography

### Numbers (Hero displays)
```tsx
<Text className="text-4xl font-bold text-gray-900">2328</Text>
<Text className="text-sm text-gray-500">Calories left</Text>
```

### Headings
```tsx
<Text className="text-xl font-bold text-gray-900">Section Title</Text>
<Text className="text-lg font-semibold text-gray-900">Card Title</Text>
```

### Body
```tsx
<Text className="text-base text-gray-600">Body text</Text>
<Text className="text-sm text-gray-500">Secondary info</Text>
```

---

## Card Styles (Neumorphic)

### Standard Card
```tsx
<View className="bg-gray-50 rounded-3xl p-5 shadow-sm">
  {/* Card content */}
</View>
```

### Elevated Card (more depth)
```tsx
<View
  className="bg-white rounded-3xl p-5"
  style={{
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  }}
>
  {/* Card content */}
</View>
```

### Stat Card (for metrics)
```tsx
<View className="bg-gray-50 rounded-2xl p-4 flex-1">
  <Text className="text-2xl font-bold text-gray-900">217g</Text>
  <Text className="text-sm text-gray-500">Protein left</Text>
  {/* Optional: circular indicator */}
</View>
```

---

## Buttons

### Primary Button (Pill)
```tsx
<TouchableOpacity className="bg-sky-500 rounded-full px-6 py-3">
  <Text className="text-white font-semibold text-center">Continue</Text>
</TouchableOpacity>
```

### Secondary Button
```tsx
<TouchableOpacity className="bg-gray-100 rounded-full px-6 py-3">
  <Text className="text-gray-900 font-semibold text-center">Cancel</Text>
</TouchableOpacity>
```

### Floating Action Button (FAB)
```tsx
<TouchableOpacity
  className="absolute bottom-6 right-6 w-14 h-14 bg-gray-900 rounded-full items-center justify-center"
  style={{
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  }}
>
  <Ionicons name="add" size={28} color="white" />
</TouchableOpacity>
```

---

## Badge/Pill Components

### Streak Badge
```tsx
<View className="flex-row items-center bg-white rounded-full px-3 py-1.5 shadow-sm">
  <Text className="text-base">🔥</Text>
  <Text className="text-sm font-semibold text-gray-900 ml-1">3</Text>
</View>
```

### Status Pill
```tsx
<View className="bg-emerald-100 rounded-full px-3 py-1">
  <Text className="text-emerald-700 text-xs font-medium">Active</Text>
</View>
```

### Small Info Badge
```tsx
<View className="flex-row items-center gap-1">
  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
  <Text className="text-xs text-gray-500">+142</Text>
</View>
```

---

## Circular Progress Indicators

### Basic Ring
```tsx
<View className="w-16 h-16 rounded-full border-4 border-gray-200 items-center justify-center">
  <Ionicons name="flame" size={24} color="#374151" />
</View>
```

### Progress Ring (with SVG or library)
```tsx
// Use react-native-svg or react-native-circular-progress
<View className="relative w-16 h-16">
  {/* Background ring */}
  <View className="absolute inset-0 rounded-full border-4 border-gray-200" />
  {/* Progress arc - use SVG for actual progress */}
  <View className="absolute inset-0 items-center justify-center">
    <Ionicons name="flame" size={24} color="#374151" />
  </View>
</View>
```

---

## Horizontal Day/Calendar Strip

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
  <View className="flex-row gap-3">
    {days.map((day) => (
      <TouchableOpacity
        key={day.date}
        className="items-center"
      >
        <Text className="text-xs text-gray-500 mb-1">{day.label}</Text>
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            day.isToday
              ? 'bg-gray-900'
              : day.isComplete
                ? 'bg-emerald-500'
                : day.isPast
                  ? 'border-2 border-dashed border-gray-300'
                  : 'bg-gray-100'
          }`}
        >
          <Text className={`font-semibold ${
            day.isToday || day.isComplete ? 'text-white' : 'text-gray-900'
          }`}>
            {day.number}
          </Text>
        </View>
      </TouchableOpacity>
    ))}
  </View>
</ScrollView>
```

---

## Tab Bar

### Bottom Tab Bar
```tsx
<View className="flex-row bg-white border-t border-gray-100 px-6 py-2">
  {tabs.map((tab) => (
    <TouchableOpacity
      key={tab.name}
      className={`flex-1 items-center py-2 ${
        tab.isActive ? 'bg-gray-100 rounded-full' : ''
      }`}
    >
      <Ionicons
        name={tab.icon}
        size={24}
        color={tab.isActive ? '#111827' : '#9CA3AF'}
      />
      <Text className={`text-xs mt-1 ${
        tab.isActive ? 'text-gray-900 font-medium' : 'text-gray-400'
      }`}>
        {tab.name}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

---

## Layout Spacing

### Screen Container
```tsx
<View className="flex-1 bg-white">
  <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
    {/* Screen content */}
  </ScrollView>
</View>
```

### Section Spacing
```tsx
<View className="gap-6">
  {/* Section 1 */}
  <View className="gap-3">
    <Text className="text-lg font-semibold">Section Title</Text>
    {/* Section content */}
  </View>

  {/* Section 2 */}
  <View className="gap-3">
    <Text className="text-lg font-semibold">Another Section</Text>
    {/* Section content */}
  </View>
</View>
```

### Grid of Cards
```tsx
<View className="flex-row gap-3">
  <View className="flex-1 bg-gray-50 rounded-2xl p-4">
    {/* Card 1 */}
  </View>
  <View className="flex-1 bg-gray-50 rounded-2xl p-4">
    {/* Card 2 */}
  </View>
  <View className="flex-1 bg-gray-50 rounded-2xl p-4">
    {/* Card 3 */}
  </View>
</View>
```

---

## Empty States

```tsx
<View className="bg-gray-50 rounded-3xl p-8 items-center">
  <Image
    source={require('./empty-illustration.png')}
    className="w-20 h-20 mb-4"
  />
  <View className="w-32 h-2 bg-gray-200 rounded-full mb-2" />
  <View className="w-24 h-2 bg-gray-200 rounded-full mb-4" />
  <Text className="text-gray-500 text-center">
    Tap + to add your first item
  </Text>
</View>
```

---

## Key Principles

1. **Rounded corners**: Use `rounded-2xl` or `rounded-3xl` for cards, `rounded-full` for buttons and badges
2. **Soft shadows**: Prefer low opacity, large radius shadows over harsh ones
3. **Whitespace**: Use `gap-3` to `gap-6` between elements, `p-4` to `p-6` inside cards
4. **Visual hierarchy**: Large bold numbers for key metrics, muted text for labels
5. **Touch targets**: Minimum 44pt (w-11 h-11) for interactive elements
6. **Consistency**: Same border radius, shadow, and spacing throughout

---

## NativeWind Quick Reference

```
Backgrounds:   bg-white, bg-gray-50, bg-gray-100
Borders:       rounded-2xl, rounded-3xl, rounded-full
Padding:       p-4, p-5, p-6, px-4, py-3
Gaps:          gap-2, gap-3, gap-4, gap-6
Text:          text-sm, text-base, text-lg, text-xl, text-4xl
Font:          font-normal, font-medium, font-semibold, font-bold
Colors:        text-gray-900, text-gray-600, text-gray-400, text-white
Flex:          flex-row, flex-1, items-center, justify-center
```
