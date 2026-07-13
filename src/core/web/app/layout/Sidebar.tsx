// Sidebar navigation and global controls for the React control panel.
import type { TabName, PanelData, ShowToast } from "../types.js";
import { Toggle } from "../components/Toggle.js";
import { copyText } from "../utils/clipboard.js";

const tabs: Array<[TabName, string]> = [
  ["recall", "Recall"],
  ["review", "Review"],
  ["maintain", "Maintain"],
  ["connect", "Connect"],
  ["config", "Config"],
];

function NavIcon({ tab }: { tab: TabName }) {
  const common = {
    className: "nav-icon",
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
  };
  if (tab === "config")
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1L1.5 4.5v7L8 15l6.5-3.5v-7L8 1z" />
        <path d="M1.5 4.5L8 8l6.5-3.5M8 8v7" />
      </svg>
    );
  return (
    <svg {...common} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 6h4M11 10h4M5 8H1M11 12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4Z" />
    </svg>
  );
}

export function Sidebar({
  data,
  active,
  setActive,
  dark,
  toggleTheme,
  shutdown,
  toast,
}: {
  data: PanelData | null;
  active: TabName;
  setActive: (tab: TabName) => void;
  dark: boolean;
  toggleTheme: () => void;
  shutdown: () => void;
  toast: ShowToast;
}) {
  const upgrade =
    "npm i -g @the-long-ride/engram@latest\nengram upgrade --latest";
  return (
    <nav className="sidebar">
      <div className="sb-logo">
        <div className="sb-mark">
          <div className="sb-logo-icon" />
        </div>
        <span className="sb-name">Engram</span>
        <button
          className="sb-badge"
          id="sb-version"
          title="Click to copy version"
          onClick={() =>
            copyText(
              data?.version || "",
              toast,
              "Copied version " + (data?.version || ""),
            )
          }
        >
          {data?.version || ""}
        </button>
      </div>
      <button
        className="sb-upgrade"
        id="sb-upgrade"
        style={{ display: data?.latestVersion ? "flex" : "none" }}
        onClick={() => copyText(upgrade, toast, "Copied upgrade command")}
        title="Click to copy upgrade command"
      >
        <span className="sb-upgrade-title">
          New version available
          {data?.latestVersion ? " · v" + data.latestVersion : ""}
        </span>
        <code className="sb-upgrade-cmd">{upgrade}</code>
      </button>
      <ul className="sb-nav" id="sb-nav">
        {tabs.map(([tab, label]) => (
          <li
            key={tab}
            className={"nav-item" + (active === tab ? " active" : "")}
            data-tab={tab}
            onClick={() => setActive(tab)}
          >
            <NavIcon tab={tab} />
            {label}
          </li>
        ))}
      </ul>
      <div className="sb-footer">
        <div className="sb-theme">
          <span>Dark Mode</span>
          <Toggle on={dark} onClick={toggleTheme} />
        </div>
        <button className="close-btn" onClick={shutdown}>
          Close Server
        </button>
        <div className="sb-cwd" id="sb-cwd" title={data?.cwd || ""}>
          {data?.cwd || ""}
        </div>
        <div className="sb-links">
          <span>
            by{" "}
            <a
              href="https://github.com/the-long-ride"
              target="_blank"
              className="sb-link"
            >
              the-long-ride
            </a>
          </span>
          <span className="sb-dot">&middot;</span>
          <a
            href="https://github.com/the-long-ride/engram/issues"
            target="_blank"
            className="sb-link"
          >
            Report Issue
          </a>
        </div>
      </div>
    </nav>
  );
}
