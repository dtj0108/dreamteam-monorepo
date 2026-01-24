import { useMemo } from "react";
import { Text } from "react-native";

interface MarkdownTextProps {
  content: string;
}

interface TextSegment {
  text: string;
  bold: boolean;
}

/**
 * Lightweight markdown text component that supports **bold** syntax
 */
export function MarkdownText({ content }: MarkdownTextProps) {
  const segments = useMemo(() => parseMarkdown(content), [content]);

  return (
    <Text className="text-[15px] leading-relaxed text-foreground">
      {segments.map((segment, index) =>
        segment.bold ? (
          <Text key={index} className="font-semibold">
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        )
      )}
    </Text>
  );
}

/**
 * Parse markdown bold syntax (**text**)
 * Returns an array of text segments with bold flags
 */
function parseMarkdown(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        bold: false,
      });
    }

    // Add the bold text (without the ** markers)
    segments.push({
      text: match[1],
      bold: true,
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      bold: false,
    });
  }

  // If no matches found, return the original text
  if (segments.length === 0) {
    segments.push({ text, bold: false });
  }

  return segments;
}
