export type Theme = "dark" | "light";

export function getTheme(): Theme {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("scanmart_theme") as Theme) || "dark";
}

export function applyTheme(theme: Theme) {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("scanmart_theme", theme);
}
