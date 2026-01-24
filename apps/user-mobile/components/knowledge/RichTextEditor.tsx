import { useRef, useEffect } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RichText,
  Toolbar,
  useEditorBridge,
  useEditorContent,
  TenTapStartKit,
  CoreBridge,
} from "@10play/tentap-editor";

import { Colors } from "@/constants/Colors";
import { BlockNoteContent, Block, InlineContent } from "@/lib/types/knowledge";

interface RichTextEditorProps {
  initialContent: BlockNoteContent;
  onContentChange: (content: BlockNoteContent) => void;
  editable?: boolean;
}

export function RichTextEditor({
  initialContent,
  onContentChange,
  editable = true,
}: RichTextEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Convert BlockNote format to HTML for initial content
  const initialHtml = blockNoteToHtml(initialContent);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: initialHtml,
    bridgeExtensions: [
      ...TenTapStartKit,
      CoreBridge.configureCSS(`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          padding: 16px;
          color: #0a0a0a;
        }
        h1 { font-size: 28px; font-weight: 700; margin: 16px 0 8px; }
        h2 { font-size: 24px; font-weight: 600; margin: 14px 0 6px; }
        h3 { font-size: 20px; font-weight: 600; margin: 12px 0 4px; }
        p { margin: 8px 0; }
        ul, ol { padding-left: 24px; margin: 8px 0; }
        li { margin: 4px 0; }
        code {
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'SF Mono', Menlo, Monaco, monospace;
          font-size: 14px;
        }
        pre {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
        }
        pre code {
          background: none;
          padding: 0;
        }
        blockquote {
          border-left: 3px solid #0ea5e9;
          padding-left: 12px;
          margin: 8px 0;
          color: #6b7280;
        }
      `),
    ],
  });

  // Get editor content and convert on changes
  const content = useEditorContent(editor, { type: "html" });

  useEffect(() => {
    if (content && debounceRef.current === null) {
      // Debounce content changes to avoid too many updates
      debounceRef.current = setTimeout(() => {
        const blockNoteContent = htmlToBlockNote(content);
        onContentChange(blockNoteContent);
        debounceRef.current = null;
      }, 500);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [content, onContentChange]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <RichText editor={editor} style={styles.editor} />
      {editable && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.toolbar}>
            <Toolbar editor={editor} />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  editor: {
    flex: 1,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
  },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.muted,
  },
});

// ============================================================================
// Conversion Utilities
// ============================================================================

function blockNoteToHtml(content: BlockNoteContent): string {
  if (!content || !Array.isArray(content)) {
    return "<p></p>";
  }

  return content.map((block) => blockToHtml(block)).join("");
}

function blockToHtml(block: Block): string {
  const inlineHtml = inlineContentToHtml(block.content);

  switch (block.type) {
    case "paragraph":
      return `<p>${inlineHtml}</p>`;

    case "heading": {
      const level = block.props?.level || 1;
      return `<h${level}>${inlineHtml}</h${level}>`;
    }

    case "bulletListItem":
      return `<ul><li>${inlineHtml}</li></ul>`;

    case "numberedListItem":
      return `<ol><li>${inlineHtml}</li></ol>`;

    case "checkListItem": {
      const checked = block.props?.checked ? "checked" : "";
      return `<ul data-type="taskList"><li data-type="taskItem" data-checked="${checked}">${inlineHtml}</li></ul>`;
    }

    case "codeBlock": {
      const language = block.props?.language || "";
      return `<pre><code class="language-${language}">${escapeHtml(
        inlineHtml
      )}</code></pre>`;
    }

    default:
      return `<p>${inlineHtml}</p>`;
  }
}

function inlineContentToHtml(content: InlineContent[]): string {
  if (!content || !Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (item.type === "link" && item.href) {
        return `<a href="${escapeHtml(item.href)}">${escapeHtml(
          item.text || ""
        )}</a>`;
      }

      let text = escapeHtml(item.text || "");

      if (item.styles?.bold) text = `<strong>${text}</strong>`;
      if (item.styles?.italic) text = `<em>${text}</em>`;
      if (item.styles?.underline) text = `<u>${text}</u>`;
      if (item.styles?.strikethrough) text = `<s>${text}</s>`;
      if (item.styles?.code) text = `<code>${text}</code>`;

      return text;
    })
    .join("");
}

function htmlToBlockNote(html: string): BlockNoteContent {
  // Simple HTML to BlockNote conversion
  // This is a basic implementation - a production version would use a proper HTML parser
  const blocks: Block[] = [];

  // Remove whitespace between tags
  const cleanHtml = html.replace(/>\s+</g, "><").trim();

  // Simple regex-based parsing (for basic content)
  const tagRegex =
    /<(p|h[1-3]|ul|ol|pre|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = tagRegex.exec(cleanHtml)) !== null) {
    const [, tag, content] = match;
    const lowerTag = tag.toLowerCase();

    if (lowerTag === "p") {
      blocks.push({
        type: "paragraph",
        content: parseInlineContent(content),
      });
    } else if (lowerTag.match(/^h[1-3]$/)) {
      const level = parseInt(lowerTag[1], 10) as 1 | 2 | 3;
      blocks.push({
        type: "heading",
        content: parseInlineContent(content),
        props: { level },
      });
    } else if (lowerTag === "ul") {
      // Parse list items
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(content)) !== null) {
        blocks.push({
          type: "bulletListItem",
          content: parseInlineContent(liMatch[1]),
        });
      }
    } else if (lowerTag === "ol") {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(content)) !== null) {
        blocks.push({
          type: "numberedListItem",
          content: parseInlineContent(liMatch[1]),
        });
      }
    } else if (lowerTag === "pre") {
      const codeMatch = /<code[^>]*>([\s\S]*?)<\/code>/i.exec(content);
      blocks.push({
        type: "codeBlock",
        content: [{ type: "text", text: unescapeHtml(codeMatch?.[1] || content) }],
      });
    }
  }

  // If no blocks were parsed, return default empty paragraph
  if (blocks.length === 0) {
    blocks.push({
      type: "paragraph",
      content: parseInlineContent(cleanHtml.replace(/<[^>]*>/g, "")),
    });
  }

  return blocks;
}

function parseInlineContent(html: string): InlineContent[] {
  const result: InlineContent[] = [];

  // Replace br tags with newlines
  let processedHtml = html.replace(/<br\s*\/?>/gi, "\n");

  // Parse links separately first
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(processedHtml)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      const beforeText = processedHtml.slice(lastIndex, match.index);
      result.push(...parseStyledText(beforeText));
    }

    // Add the link
    result.push({
      type: "link",
      href: match[1],
      text: unescapeHtml(match[2]),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < processedHtml.length) {
    result.push(...parseStyledText(processedHtml.slice(lastIndex)));
  }

  // If no content was parsed, try to extract plain text
  if (result.length === 0) {
    const plainText = processedHtml.replace(/<[^>]*>/g, "").trim();
    if (plainText) {
      result.push({ type: "text", text: unescapeHtml(plainText) });
    }
  }

  return result;
}

function parseStyledText(html: string): InlineContent[] {
  const result: InlineContent[] = [];

  // Simple regex-based parsing for styled segments
  // This handles non-nested styles like <strong>text</strong>
  const stylePatterns = [
    { regex: /<strong>([^<]*)<\/strong>/gi, style: "bold" as const },
    { regex: /<b>([^<]*)<\/b>/gi, style: "bold" as const },
    { regex: /<em>([^<]*)<\/em>/gi, style: "italic" as const },
    { regex: /<i>([^<]*)<\/i>/gi, style: "italic" as const },
    { regex: /<u>([^<]*)<\/u>/gi, style: "underline" as const },
    { regex: /<s>([^<]*)<\/s>/gi, style: "strikethrough" as const },
    { regex: /<code>([^<]*)<\/code>/gi, style: "code" as const },
  ];

  // Find all styled segments with their positions
  type StyledSegment = { start: number; end: number; text: string; style: string };
  const segments: StyledSegment[] = [];

  for (const { regex, style } of stylePatterns) {
    let match;
    regex.lastIndex = 0; // Reset regex state
    while ((match = regex.exec(html)) !== null) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        style,
      });
    }
  }

  // Sort by position
  segments.sort((a, b) => a.start - b.start);

  let lastIndex = 0;

  for (const seg of segments) {
    // Add plain text before this segment
    if (seg.start > lastIndex) {
      const plainText = html.slice(lastIndex, seg.start).replace(/<[^>]*>/g, "");
      if (plainText) {
        result.push({ type: "text", text: unescapeHtml(plainText) });
      }
    }

    // Add the styled segment
    const styles: Record<string, boolean> = {};
    styles[seg.style] = true;
    result.push({
      type: "text",
      text: unescapeHtml(seg.text),
      styles,
    });

    lastIndex = seg.end;
  }

  // Add remaining plain text
  if (lastIndex < html.length) {
    const plainText = html.slice(lastIndex).replace(/<[^>]*>/g, "");
    if (plainText) {
      result.push({ type: "text", text: unescapeHtml(plainText) });
    }
  }

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
