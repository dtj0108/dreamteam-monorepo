# Knowledge Module Documentation

This document provides comprehensive documentation for building the Knowledge workspace in the mobile app.

## Overview

The Knowledge workspace is a Notion-like documentation wiki for SOPs, meeting notes, processes, and visual whiteboards. It features hierarchical pages, rich text editing, categories/tags, templates, and Excalidraw-based whiteboards.

### Core Features

| Feature | Description |
|---------|-------------|
| Pages | Hierarchical documents with rich text (BlockNote) |
| Whiteboards | Drawing/diagramming with Excalidraw |
| Categories | Tag-based organization with colors |
| Templates | Pre-built page structures (SOP, Meeting Notes, etc.) |
| Favorites | Bookmark important pages and whiteboards |
| Search | Full-text search across all content |
| Project Links | Connect pages/whiteboards to projects |

---

## Routes & Screens

### Route Tree

```
/knowledge
├── / .......................... Landing page
├── /all ....................... All pages (grid/list)
├── /search .................... Full-text search
├── /templates ................. Template browser
├── /[pageId] .................. Page editor
└── /whiteboards
    ├── / ...................... All whiteboards
    └── /[id] .................. Whiteboard editor
```

### Screen Descriptions

| Route | Screen | Purpose |
|-------|--------|---------|
| `/knowledge` | Landing | Workspace overview with quick actions |
| `/knowledge/all` | All Pages | Browse all pages with filters and sorting |
| `/knowledge/search` | Search | Full-text search across pages |
| `/knowledge/templates` | Templates | Browse and use page templates |
| `/knowledge/[pageId]` | Page Editor | Rich text editor for documents |
| `/knowledge/whiteboards` | Whiteboards | Browse all whiteboards |
| `/knowledge/whiteboards/[id]` | Whiteboard Editor | Excalidraw canvas |

---

## API Endpoints

### Pages

#### List Pages
```
GET /api/knowledge/pages?workspaceId={uuid}
GET /api/knowledge/pages?workspaceId={uuid}&parentId={uuid}
GET /api/knowledge/pages?workspaceId={uuid}&categoryId={uuid}
GET /api/knowledge/pages?workspaceId={uuid}&archived=false
```

**Response:**
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "parent_id": "uuid | null",
    "title": "Page Title",
    "icon": "emoji | null",
    "cover_image": "url | null",
    "content": [
      {"type": "heading", "content": [...], "props": {"level": 1}},
      {"type": "paragraph", "content": [...]}
    ],
    "is_template": false,
    "template_id": "uuid | null",
    "is_archived": false,
    "is_favorited_by": ["user-id-1", "user-id-2"],
    "isFavorite": true,
    "position": 0,
    "created_by": "uuid",
    "last_edited_by": "uuid",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T14:45:00Z",
    "categories": [
      {
        "id": "uuid",
        "name": "SOPs",
        "slug": "sops",
        "color": "#3b82f6",
        "icon": "clipboard-list",
        "isSystem": true,
        "position": 0
      }
    ],
    "categoryIds": ["cat-id-1", "cat-id-2"]
  }
]
```

#### Create Page
```
POST /api/knowledge/pages
```

**Request:**
```json
{
  "workspaceId": "uuid",
  "title": "My Page",
  "parentId": "uuid | null",
  "templateId": "uuid | null",
  "icon": "emoji | null",
  "content": [{"type": "paragraph", "content": [...]}]
}
```

**Response:** `201 Created` with page object

**Behavior:**
- If `templateId` provided, page inherits template content, name, and icon
- Auto-increments template `usage_count`
- Assigns highest position automatically

#### Get Page
```
GET /api/knowledge/pages/[id]
```

**Response:** Page object with `isFavorite` computed for current user

#### Update Page
```
PATCH /api/knowledge/pages/[id]
```

**Request (all fields optional):**
```json
{
  "title": "Updated Title",
  "icon": "new-emoji",
  "coverImage": "url",
  "content": [...],
  "parentId": "uuid",
  "position": 3,
  "isArchived": true
}
```

#### Delete Page
```
DELETE /api/knowledge/pages/[id]
DELETE /api/knowledge/pages/[id]?permanent=true
```

**Default:** Soft delete (archive)
**With `permanent=true`:** Hard delete with cascade to child pages

#### Toggle Favorite
```
POST /api/knowledge/pages/[id]/favorite
```

**Response:**
```json
{"isFavorite": true}
```

#### Get Page Categories
```
GET /api/knowledge/pages/[id]/categories
```

**Response:** Array of category objects

#### Set Page Categories
```
PUT /api/knowledge/pages/[id]/categories
```

**Request:**
```json
{
  "categoryIds": ["cat-id-1", "cat-id-2"]
}
```

**Behavior:** Replaces all existing category associations

---

### Categories

#### List Categories
```
GET /api/knowledge/categories?workspaceId={uuid}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "workspaceId": "uuid",
    "name": "SOPs",
    "slug": "sops",
    "color": "#3b82f6",
    "icon": "clipboard-list",
    "isSystem": true,
    "position": 0,
    "createdBy": "uuid",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "pageCount": 5
  }
]
```

**Default System Categories:**
| Name | Color | Icon |
|------|-------|------|
| SOPs | `#3b82f6` | clipboard-list |
| Meeting Notes | `#8b5cf6` | calendar |
| Onboarding | `#10b981` | user-plus |
| Processes | `#f59e0b` | git-branch |
| General | `#6b7280` | file-text |

#### Create Category
```
POST /api/knowledge/categories
```

**Request:**
```json
{
  "workspaceId": "uuid",
  "name": "Custom Category",
  "color": "#ff6b6b",
  "icon": "bookmark"
}
```

**Response:** `201 Created`
- Slug auto-generated from name (lowercase, dash-separated)
- Returns `409 Conflict` if slug exists

#### Update Category
```
PATCH /api/knowledge/categories/[id]
```

**Request (all fields optional):**
```json
{
  "name": "Updated Name",
  "color": "#00ff00",
  "icon": "new-icon",
  "position": 2
}
```

**Note:** Cannot update system categories

#### Delete Category
```
DELETE /api/knowledge/categories/[id]
```

**Restriction:** Cannot delete system categories (returns `403`)

---

### Templates

#### List Templates
```
GET /api/knowledge/templates
GET /api/knowledge/templates?workspaceId={uuid}
GET /api/knowledge/templates?category=sop
```

**Response:**
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid | null",
    "name": "Standard Operating Procedure",
    "description": "A template for documenting standard operating procedures",
    "icon": "emoji",
    "category": "sop",
    "content": [...],
    "is_system": true,
    "usage_count": 3,
    "created_by": "uuid | null",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

**Template Categories:**
- `sop` - Standard Operating Procedures
- `onboarding` - Onboarding Checklists
- `process` - Process Documentation
- `meeting` - Meeting Notes
- `general` - General Purpose

**System Templates:**
| Name | Icon | Category |
|------|------|----------|
| Standard Operating Procedure | clipboard | sop |
| Meeting Notes | pencil | meeting |
| Onboarding Checklist | check-square | onboarding |
| Process Documentation | git-branch | process |
| Blank Page | file | general |

#### Create Template
```
POST /api/knowledge/templates
```

**Request:**
```json
{
  "workspaceId": "uuid",
  "name": "My Custom Template",
  "description": "Template description",
  "icon": "emoji",
  "category": "general",
  "content": [...]
}
```

---

### Whiteboards

#### List Whiteboards
```
GET /api/knowledge/whiteboards?workspaceId={uuid}
GET /api/knowledge/whiteboards?workspaceId={uuid}&archived=false
```

**Response:**
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "title": "Project Brainstorm",
    "icon": "art-emoji",
    "content": {
      "elements": [...],
      "appState": {...},
      "files": {...}
    },
    "thumbnail": "base64-image | null",
    "is_archived": false,
    "is_favorited_by": ["user-id"],
    "isFavorite": true,
    "position": 0,
    "created_by": "uuid",
    "last_edited_by": "uuid",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T14:45:00Z"
  }
]
```

#### Create Whiteboard
```
POST /api/knowledge/whiteboards
```

**Request:**
```json
{
  "workspaceId": "uuid",
  "title": "New Whiteboard",
  "icon": "art-emoji"
}
```

**Default content:** Empty Excalidraw scene `{}`

#### Get Whiteboard
```
GET /api/knowledge/whiteboards/[id]
```

#### Update Whiteboard
```
PATCH /api/knowledge/whiteboards/[id]
```

**Request (all fields optional):**
```json
{
  "title": "Updated Title",
  "icon": "new-emoji",
  "content": {
    "elements": [...],
    "appState": {...}
  },
  "thumbnail": "base64-image",
  "position": 2,
  "isArchived": false
}
```

#### Delete Whiteboard
```
DELETE /api/knowledge/whiteboards/[id]
DELETE /api/knowledge/whiteboards/[id]?permanent=true
```

#### Toggle Favorite
```
POST /api/knowledge/whiteboards/[id]/favorite
```

**Response:**
```json
{"isFavorite": true}
```

---

### Project Knowledge Links

#### List Project Knowledge
```
GET /api/projects/[id]/knowledge
```

**Response:**
```json
{
  "pages": [
    {
      "id": "link-uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "linked_by": "user-id",
      "page": {
        "id": "uuid",
        "title": "Project Guidelines",
        "icon": "emoji",
        "updated_at": "2024-01-15T14:45:00Z",
        "created_by": "uuid"
      },
      "linker": {
        "id": "user-id",
        "name": "John Doe",
        "avatar_url": "url | null"
      }
    }
  ],
  "whiteboards": [
    {
      "id": "link-uuid",
      "whiteboard": {
        "id": "uuid",
        "title": "Project Wireframes",
        "icon": "emoji",
        "thumbnail": "base64 | null",
        "updated_at": "2024-01-15T14:45:00Z"
      },
      "linker": {...}
    }
  ]
}
```

#### Link Knowledge to Project
```
POST /api/projects/[id]/knowledge
```

**Request:**
```json
{
  "type": "page",
  "itemId": "uuid"
}
```

**Type values:** `page`, `whiteboard`

#### Unlink Knowledge from Project
```
DELETE /api/projects/[id]/knowledge?type=page&itemId={uuid}
DELETE /api/projects/[id]/knowledge?type=whiteboard&linkId={uuid}
```

---

## Data Models

### KnowledgePage

```typescript
interface KnowledgePage {
  id: string
  workspaceId: string
  parentId: string | null           // for hierarchy
  title: string
  icon: string | null               // emoji
  coverImage: string | null         // URL
  content: BlockNoteContent         // BlockNote JSON
  isTemplate: boolean
  templateId: string | null         // source template
  isArchived: boolean
  isFavoritedBy: string[]           // user IDs
  isFavorite: boolean               // computed for current user
  position: number                  // ordering among siblings
  createdBy: string | null
  lastEditedBy: string | null
  createdAt: string
  updatedAt: string
  categories: KnowledgeCategory[]
  categoryIds: string[]
}

// BlockNote content is an array of blocks
type BlockNoteContent = Block[]

interface Block {
  id?: string
  type: BlockType
  content: InlineContent[]
  props?: BlockProps
  children?: Block[]
}

type BlockType =
  | "paragraph"
  | "heading"
  | "bulletListItem"
  | "numberedListItem"
  | "checkListItem"
  | "codeBlock"
  | "table"
  | "image"
  | "video"
  | "audio"
  | "file"

interface BlockProps {
  level?: 1 | 2 | 3              // heading level
  checked?: boolean               // checkbox
  language?: string               // code block language
  textColor?: string
  backgroundColor?: string
  textAlignment?: "left" | "center" | "right"
}
```

### KnowledgeCategory

```typescript
interface KnowledgeCategory {
  id: string
  workspaceId: string
  name: string
  slug: string                      // URL-friendly, auto-generated
  color: string | null              // hex color
  icon: string | null               // Lucide icon name
  isSystem: boolean                 // true for default categories
  position: number                  // sidebar ordering
  createdBy: string | null
  createdAt: string
  updatedAt: string
  pageCount?: number                // computed, pages in category
}
```

### KnowledgeTemplate

```typescript
interface KnowledgeTemplate {
  id: string
  workspaceId: string | null        // null for system templates
  name: string
  description: string | null
  icon: string | null
  category: TemplateCategory | null
  content: BlockNoteContent
  isSystem: boolean
  usageCount: number                // times used
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

type TemplateCategory = "sop" | "onboarding" | "process" | "meeting" | "general"
```

### Whiteboard

```typescript
interface Whiteboard {
  id: string
  workspaceId: string
  title: string
  icon: string                      // default: "art-emoji"
  content: ExcalidrawContent        // Excalidraw JSON
  thumbnail: string | null          // base64 preview image
  isArchived: boolean
  isFavoritedBy: string[]
  isFavorite: boolean               // computed
  position: number
  createdBy: string | null
  lastEditedBy: string | null
  createdAt: string
  updatedAt: string
}

interface ExcalidrawContent {
  elements: ExcalidrawElement[]     // shapes, lines, text, etc.
  appState: ExcalidrawAppState      // viewport, selected elements
  files: Record<string, any>        // embedded images
}
```

---

## Features by Screen

### All Pages (`/knowledge/all`)

**Features:**
- Grid and list view toggle (persisted in localStorage)
- Search pages by title
- Sort options:
  - Recently updated
  - Oldest updated
  - Recently created
  - Oldest created
  - Name (A-Z)
  - Name (Z-A)
- Filter by category (via sidebar)
- Filter favorites (`?filter=favorites`)
- Page cards showing:
  - Icon/emoji
  - Title
  - Categories as colored badges
  - Last updated time
- Create new page button
- Empty state with onboarding

**UI Elements:**
- View toggle (grid/list icons)
- Search input
- Sort dropdown
- Category filter in sidebar
- Page grid/list
- FAB for create

### Page Editor (`/knowledge/[pageId]`)

**Features:**
- Full BlockNote rich text editor
- Page header with:
  - Back button
  - Emoji icon (click to change)
  - Editable title
  - Category badges
  - CategoryPicker to add/remove
- Favorite toggle (star)
- Delete with confirmation
- Fullscreen mode (ESC to exit)
- Auto-save on changes (1s debounce)
- Last updated timestamp

**BlockNote Features:**
- Headings (H1, H2, H3)
- Paragraphs with formatting (bold, italic, underline, strike)
- Bullet lists
- Numbered lists
- Checklists
- Code blocks with syntax highlighting
- Tables
- Images (upload/embed)
- Links
- Text colors and backgrounds
- Text alignment

### Search (`/knowledge/search`)

**Features:**
- Full-text search input
- Search across page titles and content
- Results displayed as list
- Shows page icon, title, last updated
- Click to navigate to page

### Templates (`/knowledge/templates`)

**Features:**
- Grid of available templates
- System templates shown first
- Custom workspace templates
- Template cards showing:
  - Icon
  - Name
  - Description
  - Usage count
  - Category badge
- Click to create page from template
- Auto-navigate to new page

### Whiteboards (`/knowledge/whiteboards`)

**Features:**
- Grid and list view toggle
- Search by title
- Sort options (same as pages)
- Whiteboard cards showing:
  - Thumbnail preview (or placeholder)
  - Title
  - Favorite indicator
  - Last updated time
- Create new whiteboard button
- Empty state with onboarding

### Whiteboard Editor (`/knowledge/whiteboards/[id]`)

**Features:**
- Full Excalidraw canvas
- Header with:
  - Back button
  - Icon
  - Editable title (click to edit, Enter to save)
- Favorite toggle
- Delete with confirmation
- Fullscreen mode (ESC to exit)
- Debounced auto-save (1s)
- Thumbnail generation on save

**Excalidraw Features:**
- Shapes (rectangle, ellipse, diamond, line, arrow)
- Freehand drawing
- Text
- Images
- Connectors
- Colors and fills
- Export options
- Pan and zoom
- Selection and grouping

---

## Components Reference

### KnowledgeSidebar

Navigation sidebar with collapsible sections.

```typescript
interface KnowledgeSidebarProps {
  pages: KnowledgePage[]
  favorites: KnowledgePage[]
  categories: KnowledgeCategory[]
  whiteboards: Whiteboard[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onCreateCategory: (name: string) => Promise<KnowledgeCategory | null>
  onCreatePage: () => void
  onCreateWhiteboard: () => void
  isLoading?: boolean
}
```

**Sections:**
1. **Search** - Link to search page
2. **Favorites** - Collapsible list of favorited pages
3. **Categories** - Filter list with page counts, inline create
4. **Whiteboards** - Collapsible whiteboard list
5. **All Pages** - Hierarchical page tree (PageTreeItem)

**Features:**
- Collapsible sections (persisted in localStorage)
- Category click to filter
- Inline category creation
- Page count per category
- Recursive page tree with depth indentation

### PageEditor

BlockNote rich text editor wrapper.

```typescript
interface PageEditorProps {
  pageId: string
  initialTitle: string
  initialIcon: string | null
  initialContent: unknown
  onTitleChange: (title: string) => void
  onContentChange: (content: unknown) => void
}
```

**Features:**
- BlockNote editor instance
- Inline title editing
- Emoji icon support
- 1-second debounced saves
- Max-width container with prose styling

### WhiteboardEditor

Excalidraw canvas wrapper.

```typescript
interface WhiteboardEditorProps {
  initialData?: unknown
  onChange?: (data: unknown) => void
  onThumbnailChange?: (thumbnail: string) => void
  readOnly?: boolean
}
```

**Features:**
- Dynamic client-side Excalidraw load
- Theme support (light/dark)
- Debounced saves via JSON comparison
- Thumbnail export on changes
- Custom "Whiteboard" branding

### CategoryPicker

Multi-select category picker with creation.

```typescript
interface CategoryPickerProps {
  categories: KnowledgeCategory[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onCreateCategory?: (name: string) => Promise<KnowledgeCategory | null>
  trigger?: React.ReactNode
  align?: "start" | "center" | "end"
}
```

**Features:**
- Command/Popover pattern
- Search filtering
- Checkbox multi-select
- Inline category creation
- Custom trigger support

### CategoryBadge

Colored badge for categories.

```typescript
interface CategoryBadgeProps {
  category: KnowledgeCategory
  onRemove?: () => void
  onClick?: () => void
  size?: "sm" | "default"
  className?: string
}
```

**Features:**
- Custom color background
- Optional remove (X) button
- Click handler support
- Size variants

### CreatePageDialog

Dialog for creating new pages.

```typescript
interface CreatePageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: KnowledgeTemplate[]
  onCreatePage: (input: { title?: string; templateId?: string }) => Promise<{ id: string } | null>
}
```

**Features:**
- Template selection with scrollable list
- Optional title input
- Auto-navigate to new page

### CreateWhiteboardDialog

Dialog for creating new whiteboards.

```typescript
interface CreateWhiteboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateWhiteboard: (input: { title?: string; icon?: string }) => Promise<{ id: string } | null>
}
```

**Features:**
- Title input
- Keyboard support (Enter to create, Esc to cancel)

---

## Mobile Adaptation Guide

### Navigation Structure

```typescript
// Using Expo Router
app/
├── (main)/
│   └── knowledge/
│       ├── _layout.tsx          // Stack navigator
│       ├── index.tsx            // All pages
│       ├── search.tsx           // Search
│       ├── templates.tsx        // Templates
│       ├── [pageId].tsx         // Page viewer/editor
│       └── whiteboards/
│           ├── index.tsx        // All whiteboards
│           └── [id].tsx         // Whiteboard viewer
```

### Page Viewing (Mobile)

**Challenges:**
- BlockNote is web-only
- Need native rich text rendering

**Options:**
1. **WebView with BlockNote:**
   - Embed web editor in WebView
   - Pass content via postMessage
   - Works but feels non-native

2. **Native Rich Text Renderer:**
   - Parse BlockNote JSON
   - Render with React Native components
   - Read-only or limited editing

3. **Markdown Conversion:**
   - Convert BlockNote to Markdown
   - Use `react-native-markdown-display`
   - Edit in plain text with preview

**Recommended Approach:**
```typescript
// Parse BlockNote content to native components
function renderBlock(block: Block): React.ReactNode {
  switch (block.type) {
    case 'heading':
      const HeadingComponent = {
        1: Text, // style for h1
        2: Text, // style for h2
        3: Text, // style for h3
      }[block.props?.level || 1]
      return <HeadingComponent>{renderInline(block.content)}</HeadingComponent>

    case 'paragraph':
      return <Text>{renderInline(block.content)}</Text>

    case 'bulletListItem':
      return <View style={styles.listItem}>
        <Text>• </Text>
        <Text>{renderInline(block.content)}</Text>
      </View>

    case 'checkListItem':
      return <View style={styles.listItem}>
        <Checkbox checked={block.props?.checked} />
        <Text>{renderInline(block.content)}</Text>
      </View>

    // ... other block types
  }
}
```

### Whiteboard Viewing (Mobile)

**Challenges:**
- Excalidraw is web-only
- Complex canvas rendering

**Options:**
1. **Thumbnail Preview:**
   - Show stored thumbnail image
   - "Open in editor" button → WebView

2. **WebView Editor:**
   - Full Excalidraw in WebView
   - Works but performance may vary

3. **Read-Only SVG:**
   - Export whiteboard as SVG
   - Render with `react-native-svg`
   - Pan/zoom support

**Recommended Approach:**
```typescript
function WhiteboardViewer({ whiteboard }: Props) {
  if (whiteboard.thumbnail) {
    return (
      <View>
        <Image
          source={{ uri: `data:image/png;base64,${whiteboard.thumbnail}` }}
          style={styles.preview}
          resizeMode="contain"
        />
        <Button onPress={() => openInWebView(whiteboard.id)}>
          Edit Whiteboard
        </Button>
      </View>
    )
  }
  return <EmptyState message="No preview available" />
}
```

### Category Filters (Mobile)

**Pattern:** Horizontal scrollable chips

```typescript
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <Chip
    selected={selectedCategory === null}
    onPress={() => setSelectedCategory(null)}
  >
    All
  </Chip>
  {categories.map(cat => (
    <Chip
      key={cat.id}
      selected={selectedCategory === cat.id}
      onPress={() => setSelectedCategory(cat.id)}
      style={{ backgroundColor: cat.color }}
    >
      {cat.name}
    </Chip>
  ))}
</ScrollView>
```

### Favorites Tab (Mobile)

**Pattern:** Bottom tab or segment control

```typescript
<SegmentedControl
  values={['All', 'Favorites']}
  selectedIndex={showFavorites ? 1 : 0}
  onChange={(index) => setShowFavorites(index === 1)}
/>

<FlatList
  data={showFavorites ? favorites : pages}
  renderItem={({ item }) => <PageCard page={item} />}
/>
```

### Offline Support

**Strategy:**
1. Cache pages and whiteboards in AsyncStorage/MMKV
2. Store page content as JSON
3. Queue edits when offline
4. Sync on reconnect

```typescript
// Offline cache structure
interface OfflineCache {
  pages: Record<string, KnowledgePage>
  whiteboards: Record<string, Whiteboard>
  categories: KnowledgeCategory[]
  pendingEdits: PendingEdit[]
  lastSync: number
}

interface PendingEdit {
  id: string
  type: 'page' | 'whiteboard'
  action: 'create' | 'update' | 'delete'
  data: object
  timestamp: number
}
```

### Search (Mobile)

**Implementation:**
- Client-side search through cached pages
- Filter by title and content text
- Debounced input (300ms)

```typescript
function searchPages(query: string, pages: KnowledgePage[]): KnowledgePage[] {
  const lowerQuery = query.toLowerCase()
  return pages.filter(page => {
    // Search title
    if (page.title.toLowerCase().includes(lowerQuery)) return true

    // Search content (extract text from BlockNote)
    const textContent = extractText(page.content)
    return textContent.toLowerCase().includes(lowerQuery)
  })
}

function extractText(content: BlockNoteContent): string {
  return content
    .map(block => {
      const blockText = block.content
        ?.map(inline => inline.text || '')
        .join('') || ''
      const childText = block.children
        ? extractText(block.children)
        : ''
      return blockText + ' ' + childText
    })
    .join(' ')
}
```

### Performance Tips

1. **Page List:**
   - Paginate large page collections
   - Virtualized FlatList
   - Skeleton loading states

2. **Content Rendering:**
   - Lazy render large pages
   - Memoize block components
   - Use `React.memo` with proper comparison

3. **Whiteboards:**
   - Load thumbnails lazily
   - Cache thumbnails locally
   - Use placeholder while loading

4. **Search:**
   - Debounce input
   - Limit results shown
   - Background indexing

---

## Category Colors Reference

| System Category | Color | Icon |
|-----------------|-------|------|
| SOPs | `#3b82f6` (blue) | clipboard-list |
| Meeting Notes | `#8b5cf6` (purple) | calendar |
| Onboarding | `#10b981` (emerald) | user-plus |
| Processes | `#f59e0b` (amber) | git-branch |
| General | `#6b7280` (gray) | file-text |

---

## Key Files Reference (Web)

| File | Purpose |
|------|---------|
| `app/knowledge/layout.tsx` | Knowledge workspace layout |
| `app/knowledge/page.tsx` | Landing page |
| `app/knowledge/all/page.tsx` | All pages view |
| `app/knowledge/search/page.tsx` | Search page |
| `app/knowledge/templates/page.tsx` | Templates browser |
| `app/knowledge/[pageId]/page.tsx` | Page editor |
| `app/knowledge/whiteboards/layout.tsx` | Whiteboard layout (styles) |
| `app/knowledge/whiteboards/page.tsx` | All whiteboards |
| `app/knowledge/whiteboards/[id]/page.tsx` | Whiteboard editor |
| `components/knowledge/knowledge-sidebar.tsx` | Sidebar navigation |
| `components/knowledge/page-editor.tsx` | BlockNote wrapper |
| `components/knowledge/whiteboard-editor.tsx` | Excalidraw wrapper |
| `components/knowledge/category-picker.tsx` | Category multi-select |
| `components/knowledge/category-badge.tsx` | Category badge |
| `components/knowledge/create-page-dialog.tsx` | Create page dialog |
| `components/knowledge/create-whiteboard-dialog.tsx` | Create whiteboard dialog |
| `providers/knowledge-provider.tsx` | Knowledge context |
