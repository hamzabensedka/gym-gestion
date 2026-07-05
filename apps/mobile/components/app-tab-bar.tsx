import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeatherIcon, TabIcon, type TabIconName } from "@/components/icons";
import { MoreSheet } from "@/components/more-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import {
  adminNav,
  getMobileMore,
  getMobilePrimary,
  isNavActive,
  staffNav,
  type NavItem,
} from "@/lib/navigation";
import { colors } from "@/lib/theme";

type TabBarNavigation = {
  navigate: (route: string) => void;
};

type TabBarState = {
  index: number;
  routes: Array<{ key: string; name: string }>;
};

type AppTabBarProps = {
  state: TabBarState;
  navigation: TabBarNavigation;
  variant: "admin" | "staff";
};

function TabButton({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={styles.tab}
    >
      {icon}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AppTabBar({ state, navigation, variant }: AppTabBarProps) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const nav = variant === "admin" ? adminNav : staffNav;
  const primary = getMobilePrimary(nav);
  const moreItems = getMobileMore(nav);
  const showMoreMenu = moreItems.length > 0;

  const currentRoute = state.routes[state.index]?.name ?? "";
  const moreActive = moreItems.some((item) => isNavActive(currentRoute, item.route));

  function navigateTo(route: string) {
    navigation.navigate(route);
  }

  function openLogoutConfirm() {
    setMoreOpen(false);
    setLogoutOpen(true);
  }

  function renderIcon(item: NavItem, active: boolean) {
    const color = active ? colors.brand : colors.foreground50;
    const size = 24;
    if (item.icon === "more") {
      return <FeatherIcon name="more-horizontal" color={color} size={size} />;
    }
    if (item.icon === "logout") {
      return <FeatherIcon name="log-out" color={color} size={size} />;
    }
    return <TabIcon name={item.icon as TabIconName} color={color} size={size} />;
  }

  return (
    <>
      <View style={[styles.bar, { paddingBottom: Math.max(4, insets.bottom) }]}>
        <View style={styles.grid}>
          {primary.map((item) => {
            const active = isNavActive(currentRoute, item.route);
            return (
              <TabButton
                key={item.route}
                label={t(item.labelKey)}
                active={active}
                onPress={() => navigateTo(item.route)}
                icon={renderIcon(item, active)}
              />
            );
          })}

          {showMoreMenu ? (
            <TabButton
              label={t("nav.more")}
              active={moreActive || moreOpen}
              onPress={() => setMoreOpen(true)}
              icon={renderIcon({ route: "more", labelKey: "nav.more", icon: "more" }, moreActive || moreOpen)}
            />
          ) : (
            <TabButton
              label={t("nav.logoutTab")}
              active={false}
              onPress={openLogoutConfirm}
              icon={renderIcon({ route: "logout", labelKey: "nav.logoutTab", icon: "logout" }, false)}
            />
          )}
        </View>
      </View>

      {showMoreMenu ? (
        <MoreSheet
          visible={moreOpen}
          items={moreItems}
          activeRoute={currentRoute}
          onClose={() => setMoreOpen(false)}
          onSelect={navigateTo}
          onLogout={openLogoutConfirm}
        />
      ) : null}

      <ConfirmDialog
        visible={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        tone="critical"
        icon="log-out"
        title={t("nav.logout")}
        description={t("nav.logoutConfirm")}
        confirmLabel={t("nav.logout")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.tabBarBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: "row",
    maxWidth: 512,
    width: "100%",
    alignSelf: "center",
  },
  tab: {
    flex: 1,
    minHeight: 49,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  tabLabel: {
    width: "100%",
    textAlign: "center",
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
    color: colors.foreground50,
  },
  tabLabelActive: {
    color: colors.brand,
  },
});
