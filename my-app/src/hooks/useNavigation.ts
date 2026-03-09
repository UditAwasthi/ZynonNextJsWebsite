import { usePathname } from "next/navigation";

export function useNavigation() {
  const pathname = usePathname();
  
  const navItems = [
    { label: "Home", href: "/home", icon: "Home" },
    { label: "Search", href: "/search", icon: "Search" },
    { label: "Explore", href: "/explore", icon: "Compass" },
    { label: "Messages", href: "/messages", icon: "MessageSquare" },
    { label: "Reels", href: "/reels", icon: "Play" },
    { label: "Notifications", href: "/notifications", icon: "Heart" },
    { label: "Create", href: "/create", icon: "PlusSquare" },
    { label: "Profile", href: "/profile", icon: "User" },
  ];

  return { navItems, pathname };
}