import { Badge, Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

import { useAgents, useDMConversations } from "@/lib/hooks/useTeam";

export default function TeamTabsLayout() {
  const { data: dmsData } = useDMConversations();
  const { data: agentsData } = useAgents();
  const dmUnreadCount = (dmsData?.conversations || []).reduce(
    (sum, dm) => sum + (dm.unread_count || 0),
    0
  );
  const agentUnreadCount = (agentsData?.agents || []).reduce(
    (sum, agent) => sum + (agent.unread_count || 0),
    0
  );
  const directMessageUnreadCount = dmUnreadCount + agentUnreadCount;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dms">
        <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
        <Label>DMs</Label>
        <Badge hidden={directMessageUnreadCount === 0}>
          {directMessageUnreadCount > 99 ? "99+" : String(directMessageUnreadCount)}
        </Badge>
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
