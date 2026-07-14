// Sidebar navigation and global controls for the React control panel.
import type { TabName, PanelData, ShowToast } from "../types.js";
import { Toggle } from "../components/Toggle.js";
import { copyText } from "../utils/clipboard.js";

const tabs: Array<[TabName, string]> = [
  ["config", "Construct"],
  ["recall", "Memories"],
  ["review", "Review"],
  ["maintain", "Maintain"],
  ["connect", "Connect"],
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
  if (tab === "review")
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 2H11a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 11 14H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 2h.5" />
        <path d="M5.5 2V1.5A1 1 0 0 1 6.5.5h3a1 1 0 0 1 1 1V2z" />
        <path d="m5.5 8.5 1.5 1.5 3.5-3.5" />
      </svg>
    );
  if (tab === "maintain")
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="8" height="8" rx="1.5" />
        <path d="M6 1v3M8 1v3M10 1v3M6 12v3M8 12v3M10 12v3M1 6h3M1 8h3M1 10h3M12 6h3M12 8h3M12 10h3" />
      </svg>
    );
  if (tab === "recall")
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="4" cy="4" r="2" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="8" cy="12" r="2" />
        <path d="M5.8 4.7h4.4M5.1 5.7l1.8 4.6M10.9 5.7l-1.8 4.6" />
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
