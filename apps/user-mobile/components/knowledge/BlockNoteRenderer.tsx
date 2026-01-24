import { Fragment } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import {
  Block,
  BlockNoteContent,
  InlineContent as InlineContentType,
} from "@/lib/types/knowledge";

interface BlockNoteRendererProps {
  content: BlockNoteContent;
}

export function BlockNoteRenderer({ content }: BlockNoteRendererProps) {
  if (!content || content.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Start writing...</Text>
      </View>
    );
  }

  // Track numbering for numbered lists
  let numberIndex = 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {content.map((block, index) => {
        // Reset number index when not a numbered list
        if (block.type !== "numberedListItem") {
          numberIndex = 0;
        } else {
          numberIndex++;
        }

        return (
          <BlockRenderer
            key={block.id || index}
            block={block}
            numberIndex={numberIndex}
          />
        );
      })}
    </ScrollView>
  );
}

interface BlockRendererProps {
  block: Block;
  numberIndex?: number;
  depth?: number;
}

function BlockRenderer({ block, numberIndex = 1, depth = 0 }: BlockRendererProps) {
  const renderBlock = () => {
    switch (block.type) {
      case "paragraph":
        return <ParagraphBlock block={block} />;

      case "heading":
        return <HeadingBlock block={block} />;

      case "bulletListItem":
        return <BulletListItem block={block} depth={depth} />;

      case "numberedListItem":
        return <NumberedListItem block={block} number={numberIndex} depth={depth} />;

      case "checkListItem":
        return <CheckListItem block={block} depth={depth} />;

      case "codeBlock":
        return <CodeBlock block={block} />;

      default:
        // Fallback to paragraph for unknown types
        return <ParagraphBlock block={block} />;
    }
  };

  return (
    <View>
      {renderBlock()}
      {/* Render nested children */}
      {block.children && block.children.length > 0 && (
        <View style={styles.nestedContainer}>
          {block.children.map((child, index) => (
            <BlockRenderer
              key={child.id || index}
              block={child}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Block Components
// ============================================================================

function ParagraphBlock({ block }: { block: Block }) {
  if (!block.content || block.content.length === 0) {
    return <View style={styles.emptyParagraph} />;
  }

  return (
    <Text style={[styles.paragraph, getTextAlignStyle(block.props?.textAlignment)]}>
      <InlineContent content={block.content} />
    </Text>
  );
}

function HeadingBlock({ block }: { block: Block }) {
  const level = block.props?.level || 1;

  const headingStyle = {
    1: styles.heading1,
    2: styles.heading2,
    3: styles.heading3,
  }[level] || styles.heading1;

  return (
    <Text style={[headingStyle, getTextAlignStyle(block.props?.textAlignment)]}>
      <InlineContent content={block.content} />
    </Text>
  );
}

function BulletListItem({ block, depth }: { block: Block; depth: number }) {
  const bullets = ["•", "◦", "▪"];
  const bullet = bullets[depth % bullets.length];

  return (
    <View style={styles.listItem}>
      <Text style={styles.listBullet}>{bullet}</Text>
      <Text style={styles.listContent}>
        <InlineContent content={block.content} />
      </Text>
    </View>
  );
}

function NumberedListItem({
  block,
  number,
  depth,
}: {
  block: Block;
  number: number;
  depth: number;
}) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listNumber}>{number}.</Text>
      <Text style={styles.listContent}>
        <InlineContent content={block.content} />
      </Text>
    </View>
  );
}

function CheckListItem({ block, depth }: { block: Block; depth: number }) {
  const checked = block.props?.checked || false;

  return (
    <View style={styles.listItem}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.listContent, checked && styles.checkedText]}>
        <InlineContent content={block.content} />
      </Text>
    </View>
  );
}

function CodeBlock({ block }: { block: Block }) {
  const code = block.content
    .map((item) => item.text || "")
    .join("");

  return (
    <View style={styles.codeBlock}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText}>{code}</Text>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Inline Content Renderer
// ============================================================================

function InlineContent({ content }: { content: InlineContentType[] }) {
  if (!content || content.length === 0) {
    return null;
  }

  return (
    <>
      {content.map((item, index) => (
        <InlineItem key={index} item={item} />
      ))}
    </>
  );
}

function InlineItem({ item }: { item: InlineContentType }) {
  const text = item.text || "";

  if (item.type === "link" && item.href) {
    return (
      <Text
        style={styles.link}
        onPress={() => {
          if (item.href) {
            Linking.openURL(item.href);
          }
        }}
      >
        {text}
      </Text>
    );
  }

  // Build style array based on inline styles
  const textStyles: any[] = [styles.text];

  if (item.styles?.bold) {
    textStyles.push(styles.bold);
  }
  if (item.styles?.italic) {
    textStyles.push(styles.italic);
  }
  if (item.styles?.underline) {
    textStyles.push(styles.underline);
  }
  if (item.styles?.strikethrough) {
    textStyles.push(styles.strikethrough);
  }
  if (item.styles?.code) {
    textStyles.push(styles.inlineCode);
  }
  if (item.styles?.textColor) {
    textStyles.push({ color: item.styles.textColor });
  }
  if (item.styles?.backgroundColor) {
    textStyles.push({ backgroundColor: item.styles.backgroundColor });
  }

  return <Text style={textStyles}>{text}</Text>;
}

// ============================================================================
// Helpers
// ============================================================================

function getTextAlignStyle(alignment?: "left" | "center" | "right") {
  if (!alignment || alignment === "left") return null;
  return { textAlign: alignment };
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    color: Colors.mutedForeground,
    fontSize: 16,
  },
  emptyParagraph: {
    height: 24,
  },

  // Text styles
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.foreground,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.foreground,
    marginBottom: 8,
  },

  // Headings
  heading1: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
    color: Colors.foreground,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
    color: Colors.foreground,
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    color: Colors.foreground,
    marginTop: 12,
    marginBottom: 4,
  },

  // Lists
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  listBullet: {
    width: 20,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.foreground,
  },
  listNumber: {
    width: 24,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.foreground,
  },
  listContent: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.foreground,
  },
  nestedContainer: {
    marginLeft: 20,
  },

  // Checkbox
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 8,
    marginTop: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkedText: {
    textDecorationLine: "line-through",
    color: Colors.mutedForeground,
  },

  // Code
  codeBlock: {
    backgroundColor: Colors.muted,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foreground,
  },
  inlineCode: {
    fontFamily: "monospace",
    fontSize: 14,
    backgroundColor: Colors.muted,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Inline styles
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  underline: {
    textDecorationLine: "underline",
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
  link: {
    color: Colors.primary,
    textDecorationLine: "underline",
  },
});
