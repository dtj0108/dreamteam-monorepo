import { useMemo } from "react";
import { Badge, Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { useChannels, useDMConversations } from "@/lib/hooks/useTeam";

export default function TeamTabsLayout() {
  // Fetch channel and DM data to calculate unread counts
  const { data: channelsData } = useChannels({ joined: true });
  const { data: dmsData } = useDMConversations();

  // Calculate unread counts for Home (channels) and DMs separately
  const { channelUnread, dmUnread } = useMemo(() => {
    const channelCount = channelsData?.channels?.reduce(
      (sum, c) => sum + (c.unread_count || 0),
      0
    ) || 0;

    const dmCount = dmsData?.conversations?.reduce(
      (sum, d) => sum + (d.unread_count || 0),
      0
    ) || 0;

    return { channelUnread: channelCount, dmUnread: dmCount };
  }, [channelsData, dmsData]);

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
        {channelUnread > 0 && (
          <Badge>{channelUnread > 99 ? "99+" : String(channelUnread)}</Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dms">
        <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
        <Label>DMs</Label>
        {dmUnread > 0 && (
          <Badge>{dmUnread > 99 ? "99+" : String(dmUnread)}</Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Activity</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon sf={{ default: "ellipsis", selected: "ellipsis" }} />
        <Label>More</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
