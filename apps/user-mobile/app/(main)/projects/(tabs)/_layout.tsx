import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function ProjectsTabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf={{ default: "folder", selected: "folder.fill" }} />
        <Label>Projects</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-tasks">
        <Icon sf={{ default: "checkmark.square", selected: "checkmark.square.fill" }} />
        <Label>My Tasks</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="milestones">
        <Icon sf={{ default: "flag", selected: "flag.fill" }} />
        <Label>Milestones</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon sf={{ default: "ellipsis", selected: "ellipsis" }} />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
